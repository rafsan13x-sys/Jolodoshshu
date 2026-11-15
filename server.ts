import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { WebSocket, WebSocketServer } from 'ws';
import { computeAIMerchantChoice, computeAIMove } from './src/game/ai.ts';
import { PIRATE_AVATARS } from './src/game/cards.ts';
import {
  acknowledgeReveal,
  createDefaultSettings,
  createInitialGameState,
  playCard,
  refreshGameByHost,
  resolveHostOnDisconnect,
  resolveMerchantChoice,
  restartMatchByHost,
  sanitizeStateForPlayer,
  startNextRound,
} from './src/game/engine.ts';
import {
  assignPlayerToTeam,
  balanceTeams,
  getModeConfig,
  randomizeTeams,
  validateLobbyForMode,
} from './src/game/modes.ts';
import type {
  GameSettings,
  GameState,
  MatchModeId,
  PlayCardAction,
  PlayerConfig,
  ResolveMerchantAction,
} from './src/game/types.ts';

import {
  canAccessMultiplayerQueue,
  sanitizeGuestLobbyName,
} from './src/game/auth.ts';
import {
  checkRecoveryStatus,
  getAccountById,
  getRegisteredUsernamesLowerSet,
  loginAccount,
  recordAuthoritativeMatchOutcome,
  registerAccount,
  resetPasswordWithRecovery,
  revokeSessionToken,
  toPublicAccountProfile,
  updateAccountAvatarAndRecovery,
  verifySessionToken,
} from './src/server/accountStore.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RoomPlayer extends PlayerConfig {
  connected: boolean;
}

interface MultiplayerRoom {
  code: string;
  hostPlayerId: string;
  players: RoomPlayer[];
  settings: GameSettings;
  gameState: GameState | null;
  aiTimer?: ReturnType<typeof setTimeout>;
  matchRecorded?: boolean;
}

const rooms = new Map<string, MultiplayerRoom>();
const clientMap = new Map<
  WebSocket,
  { roomCode: string; playerId: string; isAuthenticated: boolean }
>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

async function syncOnlineGameOverStatsIfNeeded(room: MultiplayerRoom) {
  const gs = room.gameState;
  if (!gs || gs.phase !== 'game_over' || room.matchRecorded) return;
  room.matchRecorded = true;

  for (const player of gs.players) {
    if (player.isAI) continue;
    const roomPlayer = room.players.find((rp) => rp.id === player.id);
    if (!roomPlayer?.isAuthenticated) continue;

    const won = gs.winnerIds.includes(player.id);
    await recordAuthoritativeMatchOutcome({
      playerId: player.id,
      matchId: gs.matchId,
      won,
      roundCoinsEarned: player.coins,
      roundsPlayed: gs.round,
      isRanked: Boolean(room.settings.isRanked),
    });
  }
}

function broadcastRoomState(room: MultiplayerRoom) {
  if (room.gameState?.phase === 'game_over' && !room.matchRecorded) {
    void syncOnlineGameOverStatsIfNeeded(room);
  }
  for (const [ws, meta] of clientMap.entries()) {
    if (meta.roomCode === room.code && ws.readyState === WebSocket.OPEN) {
      const sanitizedGame = room.gameState
        ? sanitizeStateForPlayer(room.gameState, meta.playerId)
        : null;
      ws.send(
        JSON.stringify({
          type: 'room_update',
          room: {
            code: room.code,
            hostPlayerId: room.hostPlayerId,
            players: room.players,
            settings: room.settings,
            gameState: sanitizedGame,
          },
        })
      );
    }
  }
}

function scheduleServerAITurnIfNeeded(room: MultiplayerRoom) {
  if (room.aiTimer) {
    clearTimeout(room.aiTimer);
    room.aiTimer = undefined;
  }
  const gs = room.gameState;
  if (!gs) return;

  if (gs.phase === 'choosing_action') {
    const active = gs.players[gs.activePlayerIndex];
    if (active && active.isAI && !active.isEliminated) {
      room.aiTimer = setTimeout(() => {
        try {
          if (!room.gameState) return;
          const aiAction = computeAIMove(room.gameState);
          room.gameState = playCard(room.gameState, aiAction);
          broadcastRoomState(room);
          scheduleServerAITurnIfNeeded(room);
        } catch (err) {
          console.error('Server AI turn error:', err);
        }
      }, 950);
    }
  } else if (gs.phase === 'merchant_selection' && gs.pendingMerchant) {
    const merchantPlayer = gs.players.find((p) => p.id === gs.pendingMerchant?.playerId);
    if (merchantPlayer && merchantPlayer.isAI) {
      room.aiTimer = setTimeout(() => {
        try {
          if (!room.gameState) return;
          const choice = computeAIMerchantChoice(room.gameState);
          room.gameState = resolveMerchantChoice(room.gameState, choice);
          broadcastRoomState(room);
          scheduleServerAITurnIfNeeded(room);
        } catch (err) {
          console.error('Server AI merchant error:', err);
        }
      }, 800);
    }
  }
}

function sendHostOnlyError(ws: WebSocket) {
  ws.send(
    JSON.stringify({
      type: 'error',
      messageBn: 'শুধুমাত্র রুম হোস্ট এই সেটিংস বা টিম পরিবর্তন করতে পারবেন!',
      messageEn: 'Host permission required: Only the room host can perform this action!',
    })
  );
}

function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length).trim();
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', activeRooms: rooms.size });
  });

  // ============================================================================
  // CUSTOM IN-GAME ACCOUNT & AUTHENTICATION API ENDPOINTS
  // ============================================================================

  app.post('/api/auth/register', async (req, res) => {
    try {
      const {
        username,
        password,
        confirmPassword,
        avatar,
        recoveryPhrase,
        rememberMe,
        migrateGuestStats,
      } = req.body || {};

      const result = await registerAccount({
        username: String(username || ''),
        password: String(password || ''),
        confirmPassword: String(confirmPassword || ''),
        avatar: avatar ? String(avatar) : undefined,
        recoveryPhrase: recoveryPhrase ? String(recoveryPhrase) : undefined,
        rememberMe: Boolean(rememberMe),
        migrateGuestStats:
          migrateGuestStats && typeof migrateGuestStats === 'object'
            ? migrateGuestStats
            : undefined,
      });

      if (!result.ok) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err) {
      console.error('POST /api/auth/register error:', err);
      res.status(500).json({
        ok: false,
        errorBn: 'সার্ভারে নিবন্ধন প্রক্রিয়ায় ত্রুটি ঘটেছে।',
        errorEn: 'Server error during account registration.',
      });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password, rememberMe } = req.body || {};
      const result = await loginAccount({
        username: String(username || ''),
        password: String(password || ''),
        rememberMe: Boolean(rememberMe),
      });

      if (!result.ok) {
        res.status(401).json(result);
        return;
      }
      res.json(result);
    } catch (err) {
      console.error('POST /api/auth/login error:', err);
      res.status(500).json({
        ok: false,
        errorBn: 'সার্ভারে লগইন প্রক্রিয়ায় ত্রুটি ঘটেছে।',
        errorEn: 'Server error during login.',
      });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = extractBearerToken(req.headers.authorization);
    if (token) {
      revokeSessionToken(token);
    }
    res.json({ ok: true });
  });

  app.get('/api/auth/me', async (req, res) => {
    try {
      const token = extractBearerToken(req.headers.authorization);
      const verified = verifySessionToken(token);
      if (!verified) {
        res.status(401).json({
          ok: false,
          errorBn: 'সেশন মেয়াদোত্তীর্ণ বা অকার্যকর। অনুগ্রহ করে আবার লগইন করুন।',
          errorEn: 'Session expired or invalid. Please log in again.',
        });
        return;
      }

      const account = await getAccountById(verified.playerId);
      if (!account) {
        res.status(404).json({
          ok: false,
          errorBn: 'অ্যাকাউন্ট খুঁজে পাওয়া যায়নি।',
          errorEn: 'Account not found.',
        });
        return;
      }

      res.json({
        ok: true,
        profile: toPublicAccountProfile(account),
      });
    } catch (err) {
      console.error('GET /api/auth/me error:', err);
      res.status(500).json({
        ok: false,
        errorBn: 'প্রোফাইল লোড করতে সমস্যা হয়েছে।',
        errorEn: 'Failed to load profile.',
      });
    }
  });

  app.post('/api/auth/recovery-check', async (req, res) => {
    try {
      const { username } = req.body || {};
      const status = await checkRecoveryStatus(String(username || ''));
      if (!status.ok) {
        res.status(404).json(status);
        return;
      }
      res.json(status);
    } catch (err) {
      console.error('POST /api/auth/recovery-check error:', err);
      res.status(500).json({
        ok: false,
        errorBn: 'পুনরুদ্ধার যাচাই করতে সমস্যা হয়েছে।',
        errorEn: 'Failed to check recovery status.',
      });
    }
  });

  app.post('/api/auth/recovery-reset', async (req, res) => {
    try {
      const { username, recoveryPhrase, newPassword, confirmPassword } = req.body || {};
      const result = await resetPasswordWithRecovery({
        username: String(username || ''),
        recoveryPhrase: String(recoveryPhrase || ''),
        newPassword: String(newPassword || ''),
        confirmPassword: String(confirmPassword || ''),
      });
      if (!result.ok) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err) {
      console.error('POST /api/auth/recovery-reset error:', err);
      res.status(500).json({
        ok: false,
        errorBn: 'পাসওয়ার্ড রিসেট করতে সমস্যা হয়েছে।',
        errorEn: 'Failed to reset password.',
      });
    }
  });

  app.post('/api/account/update', async (req, res) => {
    try {
      const token = extractBearerToken(req.headers.authorization);
      const verified = verifySessionToken(token);
      if (!verified) {
        res.status(401).json({
          ok: false,
          errorBn: 'অনুমোদনহীন অনুরোধ। অনুগ্রহ করে লগইন করুন।',
          errorEn: 'Unauthorized. Please log in.',
        });
        return;
      }

      const { avatar, recoveryPhrase } = req.body || {};
      const result = await updateAccountAvatarAndRecovery({
        playerId: verified.playerId,
        avatar: avatar ? String(avatar) : undefined,
        recoveryPhrase: recoveryPhrase ? String(recoveryPhrase) : undefined,
      });

      if (!result.ok) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err) {
      console.error('POST /api/account/update error:', err);
      res.status(500).json({
        ok: false,
        errorBn: 'প্রোফাইল আপডেট করতে সমস্যা হয়েছে।',
        errorEn: 'Failed to update profile.',
      });
    }
  });

  app.post('/api/account/record-match', async (req, res) => {
    try {
      const token = extractBearerToken(req.headers.authorization);
      const verified = verifySessionToken(token);
      if (!verified) {
        res.status(401).json({
          ok: false,
          errorBn: 'অনুমোদনহীন অনুরোধ। শুধুমাত্র লগইন করা অ্যাকাউন্টের অগ্রগতি সংরক্ষিত হয়।',
          errorEn: 'Unauthorized. Only authenticated accounts can record persistent progression.',
        });
        return;
      }

      // Reject any attempt to directly submit raw coins, xp, level, or wins override
      if (
        req.body &&
        ('coins' in req.body ||
          'xp' in req.body ||
          'level' in req.body ||
          'wins' in req.body ||
          'losses' in req.body ||
          'playerId' in req.body)
      ) {
        res.status(400).json({
          ok: false,
          errorBn: 'অবৈধ অনুরোধ: ক্লায়েন্ট সরাসরি কয়েন, এক্সপি বা জয় নির্ধারণ করতে পারবে না!',
          errorEn: 'Forbidden: Client cannot directly submit coins, XP, level, or account ownership!',
        });
        return;
      }

      const { matchId, won, roundCoinsEarned, roundsPlayed } = req.body || {};
      if (!matchId || typeof matchId !== 'string') {
        res.status(400).json({
          ok: false,
          errorBn: 'ম্যাচ আইডি প্রদান করা হয়নি।',
          errorEn: 'Missing matchId.',
        });
        return;
      }

      const result = await recordAuthoritativeMatchOutcome({
        playerId: verified.playerId,
        matchId: String(matchId).slice(0, 64),
        won: Boolean(won),
        roundCoinsEarned: Number(roundCoinsEarned || 0),
        roundsPlayed: Number(roundsPlayed || 1),
        isRanked: false,
      });

      res.json(result);
    } catch (err) {
      console.error('POST /api/account/record-match error:', err);
      res.status(500).json({
        ok: false,
        errorBn: 'ম্যাচের ফলাফল সংরক্ষণ করতে সমস্যা হয়েছে।',
        errorEn: 'Failed to record match outcome.',
      });
    }
  });

  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        switch (msg.type) {
          case 'create_room': {
            const verifiedSession = verifySessionToken(msg.authToken);
            const verifiedAccount = verifiedSession
              ? await getAccountById(verifiedSession.playerId)
              : null;

            const isRanked = Boolean(msg.settings?.isRanked);
            const access = canAccessMultiplayerQueue(
              verifiedAccount ? { isGuest: false } : { isGuest: true },
              isRanked
            );
            if (!access.valid) {
              ws.send(
                JSON.stringify({
                  type: 'error',
                  messageBn: access.errorBn,
                  messageEn: access.errorEn,
                })
              );
              return;
            }

            const playerId = verifiedAccount
              ? verifiedAccount.playerId
              : msg.playerId && String(msg.playerId).startsWith('guest_')
              ? String(msg.playerId)
              : `guest_${Math.random().toString(36).slice(2, 9)}`;

            const playerName = verifiedAccount
              ? verifiedAccount.username
              : sanitizeGuestLobbyName(
                  msg.playerName || 'গেস্ট নাবিক',
                  getRegisteredUsernamesLowerSet()
                );

            const avatar = verifiedAccount
              ? verifiedAccount.avatar
              : msg.avatar || PIRATE_AVATARS[0].emoji;

            const code = generateRoomCode();
            const settings = createDefaultSettings({
              mode: 'online',
              ...(msg.settings || {}),
              isRanked,
            });
            const matchMode = settings.matchMode ?? 'classic';

            const initialPlayers = balanceTeams(
              [
                {
                  id: playerId,
                  name: playerName,
                  avatar,
                  isAI: false,
                  ready: true,
                  level: verifiedAccount ? verifiedAccount.level : 1,
                  isAuthenticated: Boolean(verifiedAccount),
                },
              ],
              matchMode
            ).map((p) => ({ ...p, connected: true }));

            const room: MultiplayerRoom = {
              code,
              hostPlayerId: playerId,
              players: initialPlayers,
              settings,
              gameState: null,
            };

            rooms.set(code, room);
            clientMap.set(ws, {
              roomCode: code,
              playerId,
              isAuthenticated: Boolean(verifiedAccount),
            });
            broadcastRoomState(room);
            break;
          }

          case 'join_room': {
            const code = (msg.roomCode || '').toUpperCase().trim();
            const room = rooms.get(code);
            if (!room) {
              ws.send(
                JSON.stringify({
                  type: 'error',
                  messageBn: 'রুম কোডটি খুঁজে পাওয়া যায়নি!',
                  messageEn: 'Room code not found!',
                })
              );
              return;
            }

            const verifiedSession = verifySessionToken(msg.authToken);
            const verifiedAccount = verifiedSession
              ? await getAccountById(verifiedSession.playerId)
              : null;

            const access = canAccessMultiplayerQueue(
              verifiedAccount ? { isGuest: false } : { isGuest: true },
              Boolean(room.settings.isRanked)
            );
            if (!access.valid) {
              ws.send(
                JSON.stringify({
                  type: 'error',
                  messageBn: access.errorBn,
                  messageEn: access.errorEn,
                })
              );
              return;
            }

            const modeDef = getModeConfig(room.settings.matchMode);
            const playerId = verifiedAccount
              ? verifiedAccount.playerId
              : msg.playerId && String(msg.playerId).startsWith('guest_')
              ? String(msg.playerId)
              : `guest_${Math.random().toString(36).slice(2, 9)}`;

            const safePlayerName = verifiedAccount
              ? verifiedAccount.username
              : sanitizeGuestLobbyName(
                  msg.playerName || `গেস্ট নাবিক ${room.players.length + 1}`,
                  getRegisteredUsernamesLowerSet(),
                  String(room.players.length + 1)
                );

            const safeAvatar = verifiedAccount
              ? verifiedAccount.avatar
              : msg.avatar || PIRATE_AVATARS[room.players.length % PIRATE_AVATARS.length].emoji;

            const existing = room.players.find((p) => p.id === playerId);
            if (existing) {
              existing.connected = true;
              existing.name = safePlayerName;
              existing.avatar = safeAvatar;
              existing.level = verifiedAccount ? verifiedAccount.level : 1;
              existing.isAuthenticated = Boolean(verifiedAccount);
            } else {
              if (room.gameState) {
                ws.send(
                  JSON.stringify({
                    type: 'error',
                    messageBn: 'এই রুমে খেলা ইতোমধ্যে শুরু হয়ে গেছে!',
                    messageEn: 'Game has already started in this room!',
                  })
                );
                return;
              }
              if (room.players.length >= modeDef.maxPlayers) {
                ws.send(
                  JSON.stringify({
                    type: 'error',
                    messageBn: `রুমটি পূর্ণ হয়ে গেছে (${modeDef.nameBn}: সর্বোচ্চ ${modeDef.maxPlayers} জন)!`,
                    messageEn: `Room is full for ${modeDef.nameEn} (maximum ${modeDef.maxPlayers} players)!`,
                  })
                );
                return;
              }
              room.players.push({
                id: playerId,
                name: safePlayerName,
                avatar: safeAvatar,
                isAI: false,
                ready: true,
                level: verifiedAccount ? verifiedAccount.level : 1,
                isAuthenticated: Boolean(verifiedAccount),
                connected: true,
              });
              room.players = balanceTeams(
                room.players,
                room.settings.matchMode ?? 'classic'
              ).map((p, idx) => ({
                ...p,
                connected: room.players[idx]?.connected ?? true,
              }));
            }

            clientMap.set(ws, {
              roomCode: code,
              playerId,
              isAuthenticated: Boolean(verifiedAccount),
            });
            broadcastRoomState(room);
            break;
          }

          case 'add_bot': {
            const meta = clientMap.get(ws);
            if (!meta) return;
            const room = rooms.get(meta.roomCode);
            if (!room || room.gameState) return;
            if (room.hostPlayerId !== meta.playerId) {
              sendHostOnlyError(ws);
              return;
            }
            const modeDef = getModeConfig(room.settings.matchMode);
            if (room.players.length >= modeDef.maxPlayers) return;

            const botIndex = room.players.length + 1;
            const botNames = ['জলদস্যু রুস্তম (AI)', 'নাবিক সুলতানা (AI)', 'গোলন্দাজ করিম (AI)', 'গুপ্তচর নাদিয়া (AI)', 'বণিক হাশেম (AI)'];
            room.players.push({
              id: `bot_${Date.now()}_${botIndex}`,
              name: botNames[(botIndex - 2) % botNames.length],
              avatar: PIRATE_AVATARS[botIndex % PIRATE_AVATARS.length].emoji,
              isAI: true,
              aiDifficulty: msg.difficulty || 'medium',
              ready: true,
              connected: true,
            });
            room.players = balanceTeams(
              room.players,
              room.settings.matchMode ?? 'classic'
            ).map((p, idx) => ({
              ...p,
              connected: room.players[idx]?.connected ?? true,
            }));
            broadcastRoomState(room);
            break;
          }

          case 'remove_player': {
            const meta = clientMap.get(ws);
            if (!meta) return;
            const room = rooms.get(meta.roomCode);
            if (!room || room.gameState) return;
            if (room.hostPlayerId !== meta.playerId) {
              sendHostOnlyError(ws);
              return;
            }
            if (msg.targetPlayerId === room.hostPlayerId) return;
            room.players = room.players.filter((p) => p.id !== msg.targetPlayerId);
            broadcastRoomState(room);
            break;
          }

          case 'change_match_mode': {
            const meta = clientMap.get(ws);
            if (!meta) return;
            const room = rooms.get(meta.roomCode);
            if (!room || room.gameState) return;
            if (room.hostPlayerId !== meta.playerId) {
              sendHostOnlyError(ws);
              return;
            }
            const newMode = (msg.matchMode || 'classic') as MatchModeId;
            const modeDef = getModeConfig(newMode);

            // Trim excess AI bots if room exceeds new mode's maxPlayers
            while (room.players.length > modeDef.maxPlayers) {
              const lastAiIdx = [...room.players]
                .reverse()
                .findIndex((p) => p.isAI);
              if (lastAiIdx !== -1) {
                const actualIdx = room.players.length - 1 - lastAiIdx;
                room.players.splice(actualIdx, 1);
              } else {
                break;
              }
            }

            room.settings = {
              ...room.settings,
              matchMode: newMode,
              targetCoins: modeDef.defaultTargetCoins,
              maxRounds: modeDef.defaultMaxRounds,
              roundVictoryReward: modeDef.defaultRoundReward,
            };
            room.players = balanceTeams(room.players, newMode).map((p, idx) => ({
              ...p,
              connected: room.players[idx]?.connected ?? true,
            }));
            broadcastRoomState(room);
            break;
          }

          case 'assign_team': {
            const meta = clientMap.get(ws);
            if (!meta) return;
            const room = rooms.get(meta.roomCode);
            if (!room || room.gameState) return;
            if (room.hostPlayerId !== meta.playerId) {
              sendHostOnlyError(ws);
              return;
            }
            const updated = assignPlayerToTeam(
              room.players,
              msg.targetPlayerId,
              msg.teamId,
              room.settings.matchMode ?? 'classic'
            );
            room.players = updated.map((p, idx) => ({
              ...p,
              connected: room.players[idx]?.connected ?? true,
            }));
            broadcastRoomState(room);
            break;
          }

          case 'balance_teams': {
            const meta = clientMap.get(ws);
            if (!meta) return;
            const room = rooms.get(meta.roomCode);
            if (!room || room.gameState) return;
            if (room.hostPlayerId !== meta.playerId) {
              sendHostOnlyError(ws);
              return;
            }
            room.players = balanceTeams(
              room.players,
              room.settings.matchMode ?? 'classic'
            ).map((p, idx) => ({
              ...p,
              connected: room.players[idx]?.connected ?? true,
            }));
            broadcastRoomState(room);
            break;
          }

          case 'randomize_teams': {
            const meta = clientMap.get(ws);
            if (!meta) return;
            const room = rooms.get(meta.roomCode);
            if (!room || room.gameState) return;
            if (room.hostPlayerId !== meta.playerId) {
              sendHostOnlyError(ws);
              return;
            }
            room.players = randomizeTeams(
              room.players,
              room.settings.matchMode ?? 'classic'
            ).map((p, idx) => ({
              ...p,
              connected: room.players[idx]?.connected ?? true,
            }));
            broadcastRoomState(room);
            break;
          }

          case 'toggle_ready': {
            const meta = clientMap.get(ws);
            if (!meta) return;
            const room = rooms.get(meta.roomCode);
            if (!room || room.gameState) return;
            const p = room.players.find((item) => item.id === meta.playerId);
            if (p) {
              p.ready = p.ready === false ? true : false;
              broadcastRoomState(room);
            }
            break;
          }

          case 'update_settings': {
            const meta = clientMap.get(ws);
            if (!meta) return;
            const room = rooms.get(meta.roomCode);
            if (!room || room.gameState) return;
            if (room.hostPlayerId !== meta.playerId) {
              sendHostOnlyError(ws);
              return;
            }
            if (msg.settings?.isRanked) {
              const hasGuest = room.players.some((p) => !p.isAI && !p.isAuthenticated);
              if (hasGuest) {
                ws.send(
                  JSON.stringify({
                    type: 'error',
                    messageBn:
                      'র‍্যাঙ্কড মোড চালু করতে হলে রুমের সকল মানব খেলোয়াড়কে লগইন করা অ্যাকাউন্টে থাকতে হবে!',
                    messageEn:
                      'All human players in the room must be logged into a registered account to enable Ranked Mode!',
                  })
                );
                return;
              }
            }
            room.settings = {
              ...room.settings,
              ...(msg.settings || {}),
              mode: 'online',
            };
            broadcastRoomState(room);
            break;
          }

          case 'start_game': {
            const meta = clientMap.get(ws);
            if (!meta) return;
            const room = rooms.get(meta.roomCode);
            if (!room) return;
            if (room.hostPlayerId !== meta.playerId) {
              sendHostOnlyError(ws);
              return;
            }
            const validation = validateLobbyForMode(room.players, room.settings);
            if (!validation.valid) {
              ws.send(
                JSON.stringify({
                  type: 'error',
                  messageBn: validation.errorBn || 'খেলোয়াড় বা দল সংখ্যা সঠিক নয়!',
                  messageEn: validation.errorEn || 'Invalid player count or team assignment!',
                })
              );
              return;
            }
            room.matchRecorded = false;
            room.settings.playerCount = room.players.length;
            room.gameState = createInitialGameState(
              room.players,
              room.settings,
              Math.random,
              room.hostPlayerId
            );
            broadcastRoomState(room);
            scheduleServerAITurnIfNeeded(room);
            break;
          }

          case 'play_card': {
            const meta = clientMap.get(ws);
            if (!meta) return;
            const room = rooms.get(meta.roomCode);
            if (!room || !room.gameState) return;

            const action: PlayCardAction = {
              playerId: meta.playerId,
              cardUid: msg.cardUid,
              targetPlayerId: msg.targetPlayerId,
              guessedValue: msg.guessedValue,
            };
            room.gameState = playCard(room.gameState, action);
            broadcastRoomState(room);
            scheduleServerAITurnIfNeeded(room);
            break;
          }

          case 'resolve_merchant': {
            const meta = clientMap.get(ws);
            if (!meta) return;
            const room = rooms.get(meta.roomCode);
            if (!room || !room.gameState) return;

            const action: ResolveMerchantAction = {
              playerId: meta.playerId,
              keepCardUid: msg.keepCardUid,
              bottomOrderUids: msg.bottomOrderUids,
            };
            room.gameState = resolveMerchantChoice(room.gameState, action);
            broadcastRoomState(room);
            scheduleServerAITurnIfNeeded(room);
            break;
          }

          case 'acknowledge_reveal': {
            const meta = clientMap.get(ws);
            if (!meta) return;
            const room = rooms.get(meta.roomCode);
            if (!room || !room.gameState) return;

            room.gameState = acknowledgeReveal(room.gameState);
            broadcastRoomState(room);
            scheduleServerAITurnIfNeeded(room);
            break;
          }

          case 'next_round': {
            const meta = clientMap.get(ws);
            if (!meta) return;
            const room = rooms.get(meta.roomCode);
            if (!room || !room.gameState) return;

            room.gameState = startNextRound(room.gameState);
            broadcastRoomState(room);
            scheduleServerAITurnIfNeeded(room);
            break;
          }

          case 'rematch':
          case 'restart_match': {
            const meta = clientMap.get(ws);
            if (!meta) return;
            const room = rooms.get(meta.roomCode);
            if (!room) return;

            if (room.hostPlayerId !== meta.playerId) {
              ws.send(
                JSON.stringify({
                  type: 'error',
                  messageBn: 'শুধুমাত্র হোস্ট ম্যাচটি পুনরায় শুরু করতে পারবেন!',
                  messageEn: 'Only the host can restart the match!',
                })
              );
              return;
            }

            room.matchRecorded = false;
            room.gameState = room.gameState
              ? restartMatchByHost(room.gameState, meta.playerId)
              : createInitialGameState(
                  room.players,
                  room.settings,
                  Math.random,
                  room.hostPlayerId
                );
            broadcastRoomState(room);
            scheduleServerAITurnIfNeeded(room);
            break;
          }

          case 'refresh_game': {
            const meta = clientMap.get(ws);
            if (!meta) return;
            const room = rooms.get(meta.roomCode);
            if (!room || !room.gameState) return;

            if (room.hostPlayerId !== meta.playerId) {
              ws.send(
                JSON.stringify({
                  type: 'error',
                  messageBn: 'শুধুমাত্র হোস্ট খেলাটি রিফ্রেশ করতে পারবেন!',
                  messageEn: 'Only the host can refresh the game!',
                })
              );
              return;
            }

            room.matchRecorded = false;
            room.gameState = refreshGameByHost(room.gameState, meta.playerId);
            broadcastRoomState(room);
            scheduleServerAITurnIfNeeded(room);
            break;
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Invalid action';
        ws.send(
          JSON.stringify({
            type: 'error',
            messageBn: message,
            messageEn: message,
          })
        );
      }
    });

    ws.on('close', () => {
      const meta = clientMap.get(ws);
      if (meta) {
        clientMap.delete(ws);
        const room = rooms.get(meta.roomCode);
        if (room) {
          const outcome = resolveHostOnDisconnect(
            room.players,
            room.hostPlayerId,
            meta.playerId,
            room.gameState
          );
          if (outcome.shouldCloseRoom) {
            if (room.aiTimer) {
              clearTimeout(room.aiTimer);
              room.aiTimer = undefined;
            }
            rooms.delete(room.code);
          } else {
            room.players = outcome.players;
            room.hostPlayerId = outcome.hostPlayerId;
            room.gameState = outcome.gameState;
            broadcastRoomState(room);
          }
        }
      }
    });
  });

  const distPath = path.join(__dirname, 'dist');
  const distIndex = path.join(distPath, 'index.html');
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd || !fs.existsSync(distIndex)) {
    if (fs.existsSync(distPath)) {
      app.use('/itchio-static', express.static(distPath));
    }
    const vitePromise = createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(async (req, res, next) => {
      try {
        const vite = await vitePromise;
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  } else {
    app.use('/itchio-static', express.static(distPath));
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(distIndex);
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Jolodoshshu Pirate Card Game Server listening on http://localhost:${PORT}`);
  });
}

startServer();

