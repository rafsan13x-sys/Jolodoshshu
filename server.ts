import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { build as buildVite, createServer as createViteServer } from 'vite';
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
}

const rooms = new Map<string, MultiplayerRoom>();
const clientMap = new Map<WebSocket, { roomCode: string; playerId: string }>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function broadcastRoomState(room: MultiplayerRoom) {
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

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', activeRooms: rooms.size });
  });

  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        switch (msg.type) {
          case 'create_room': {
            const playerId = msg.playerId || `p_${Math.random().toString(36).slice(2, 9)}`;
            const playerName = (msg.playerName || 'ক্যাপ্টেন').slice(0, 24);
            const avatar = msg.avatar || PIRATE_AVATARS[0].emoji;
            const code = generateRoomCode();
            const settings = createDefaultSettings({
              mode: 'online',
              ...(msg.settings || {}),
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
            clientMap.set(ws, { roomCode: code, playerId });
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

            const modeDef = getModeConfig(room.settings.matchMode);
            const playerId = msg.playerId || `p_${Math.random().toString(36).slice(2, 9)}`;
            const existing = room.players.find((p) => p.id === playerId);
            if (existing) {
              existing.connected = true;
              if (msg.playerName) existing.name = msg.playerName.slice(0, 24);
              if (msg.avatar) existing.avatar = msg.avatar;
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
                name: (msg.playerName || `নাবিক ${room.players.length + 1}`).slice(0, 24),
                avatar: msg.avatar || PIRATE_AVATARS[room.players.length % PIRATE_AVATARS.length].emoji,
                isAI: false,
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
            }

            clientMap.set(ws, { roomCode: code, playerId });
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

  // Bind port 3000 immediately so dev/production health checks succeed without waiting on Vite startup
  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Jolodoshshu Pirate Card Game Server listening on http://localhost:${PORT}`);
  });

  if (process.env.NODE_ENV === 'production' && !fs.existsSync(distIndex)) {
    console.log('dist/index.html not found — building production frontend bundle automatically...');
    try {
      await buildVite();
    } catch (err) {
      console.error('Automatic Vite build failed, falling back to Vite dev middleware:', err);
    }
  }

  if (process.env.NODE_ENV !== 'production' || !fs.existsSync(distIndex)) {
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
}

startServer();

