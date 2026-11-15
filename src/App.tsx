import React, { useCallback, useEffect, useRef, useState } from 'react';
import './lib/firebase';
import { AccountModal, AccountModalTab } from './components/AccountModal';
import { CharacterGuideModal } from './components/CharacterGuideModal';
import {
  HostConfirmModal,
  MerchantModal,
  PauseModal,
  PrivacyOverlay,
  PrivateRevealModal,
  RoundAndGameResultsModal,
} from './components/GameModals';
import { GameTable } from './components/GameTable';
import { HowToPlayModal } from './components/HowToPlayModal';
import { LobbyModal } from './components/LobbyModal';
import { ModeSelectionModal } from './components/ModeSelectionModal';
import { SettingsModal } from './components/SettingsModal';
import { TitleScreen } from './components/TitleScreen';
import { computeAIMerchantChoice, computeAIMove } from './game/ai';
import {
  ActiveIdentity,
  PlayerAccountProfile,
  calculateLevelFromXp,
  computeMatchProgressionReward,
  createInitialGuestProfile,
} from './game/auth';
import {
  acknowledgeReveal,
  createDefaultPlayers,
  createDefaultSettings,
  createInitialGameState,
  isPlayerHost,
  playCard,
  refreshGameByHost,
  resolveMerchantChoice,
  restartMatchByHost,
  startNextRound,
  unlockPrivacyScreen,
} from './game/engine';
import { getModeConfig, normalizePlayersForMode } from './game/modes';
import {
  AIDifficulty,
  CardValue,
  GameMode,
  GameSettings,
  GameState,
  MatchModeId,
  PlayCardAction,
  PlayerConfig,
} from './game/types';
import { soundFX } from './utils/sound';

interface OnlineRoomPayload {
  code: string;
  hostPlayerId: string;
  players: Array<PlayerConfig & { connected?: boolean }>;
  settings: GameSettings;
  gameState: GameState | null;
}

const AUTH_TOKEN_KEY = 'jolodoshshu_auth_token';
const AUTH_PROFILE_CACHE_KEY = 'jolodoshshu_cached_profile';
const GUEST_CHOSEN_KEY = 'jolodoshshu_guest_chosen';

export default function App() {
  const [settings, setSettings] = useState<GameSettings>(() => createDefaultSettings());
  const [playersConfig, setPlayersConfig] = useState<PlayerConfig[]>(() =>
    createDefaultPlayers(4, 'ai')
  );
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [hostConfirmAction, setHostConfirmAction] = useState<'restart' | 'refresh' | null>(
    null
  );

  // Persistent Guest / Online fallback session ID
  const [fallbackSessionPlayerId] = useState<string>(() => {
    const saved = sessionStorage.getItem('jolodoshshu_pid');
    if (saved) return saved;
    const generated = `pirate_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem('jolodoshshu_pid', generated);
    return generated;
  });

  // Account & Authentication State
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return (
      localStorage.getItem(AUTH_TOKEN_KEY) ||
      sessionStorage.getItem(AUTH_TOKEN_KEY) ||
      null
    );
  });

  const [identity, setIdentity] = useState<ActiveIdentity>(() => {
    const cachedRaw =
      localStorage.getItem(AUTH_PROFILE_CACHE_KEY) ||
      sessionStorage.getItem(AUTH_PROFILE_CACHE_KEY);
    if (cachedRaw) {
      try {
        const parsed = JSON.parse(cachedRaw) as PlayerAccountProfile;
        if (parsed && parsed.playerId && parsed.username && parsed.isGuest === false) {
          return parsed;
        }
      } catch {
        // ignore invalid cache
      }
    }
    return createInitialGuestProfile(fallbackSessionPlayerId);
  });

  const [hasChosenEntryMode, setHasChosenEntryMode] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') return true;
    if (
      localStorage.getItem(AUTH_TOKEN_KEY) ||
      sessionStorage.getItem(AUTH_TOKEN_KEY)
    ) {
      return true;
    }
    if (sessionStorage.getItem(GUEST_CHOSEN_KEY) === '1') {
      return true;
    }
    return false;
  });

  // Modals
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountModalTab, setAccountModalTab] = useState<AccountModalTab>('login');
  const [modeSelectOpen, setModeSelectOpen] = useState(false);
  const [lobbyOpen, setLobbyOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideInitialCard, setGuideInitialCard] = useState<CardValue | null>(null);
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Effective player ID for online and local matches
  const localOnlinePlayerId = identity.playerId || fallbackSessionPlayerId;

  const [onlineRoom, setOnlineRoom] = useState<OnlineRoomPayload | null>(null);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Restore & verify persistent session from backend on mount
  useEffect(() => {
    if (!authToken) return;
    let cancelled = false;
    fetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Session expired');
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data?.profile) {
          setIdentity(data.profile);
          if (localStorage.getItem(AUTH_TOKEN_KEY)) {
            localStorage.setItem(AUTH_PROFILE_CACHE_KEY, JSON.stringify(data.profile));
          } else {
            sessionStorage.setItem(AUTH_PROFILE_CACHE_KEY, JSON.stringify(data.profile));
          }
        }
      })
      .catch(() => {
        if (cancelled) return;
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_PROFILE_CACHE_KEY);
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
        sessionStorage.removeItem(AUTH_PROFILE_CACHE_KEY);
        setAuthToken(null);
        setIdentity(createInitialGuestProfile(fallbackSessionPlayerId));
      });
    return () => {
      cancelled = true;
    };
  }, [authToken, fallbackSessionPlayerId]);

  // Keep slot 0 in playersConfig synced with the active player's identity
  useEffect(() => {
    setPlayersConfig((prev) => {
      if (prev.length === 0) return prev;
      const first = prev[0];
      if (
        first.name === identity.username &&
        first.avatar === identity.avatar &&
        first.level === identity.level &&
        first.isAuthenticated === !identity.isGuest
      ) {
        return prev;
      }
      const next = [...prev];
      next[0] = {
        ...first,
        name: identity.username,
        avatar: identity.avatar,
        level: identity.level,
        isAuthenticated: !identity.isGuest,
      };
      return next;
    });
  }, [identity.username, identity.avatar, identity.level, identity.isGuest]);

  const handleAuthSuccess = useCallback(
    (profile: PlayerAccountProfile, token: string, rememberMe: boolean) => {
      setAuthToken(token);
      setIdentity(profile);
      setHasChosenEntryMode(true);
      setAccountModalOpen(false);
      if (rememberMe) {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        localStorage.setItem(AUTH_PROFILE_CACHE_KEY, JSON.stringify(profile));
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
        sessionStorage.removeItem(AUTH_PROFILE_CACHE_KEY);
      } else {
        sessionStorage.setItem(AUTH_TOKEN_KEY, token);
        sessionStorage.setItem(AUTH_PROFILE_CACHE_KEY, JSON.stringify(profile));
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_PROFILE_CACHE_KEY);
      }
    },
    []
  );

  const handleContinueAsGuest = useCallback(() => {
    sessionStorage.setItem(GUEST_CHOSEN_KEY, '1');
    setHasChosenEntryMode(true);
    setAccountModalOpen(false);
    if (!identity.isGuest) {
      setIdentity(createInitialGuestProfile(fallbackSessionPlayerId));
    }
  }, [fallbackSessionPlayerId, identity.isGuest]);

  const handleLogout = useCallback(async () => {
    const tokenToRevoke = authToken;
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_PROFILE_CACHE_KEY);
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_PROFILE_CACHE_KEY);
    setAuthToken(null);
    setIdentity(createInitialGuestProfile(fallbackSessionPlayerId));
    setAccountModalOpen(false);

    if (tokenToRevoke) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tokenToRevoke}`,
          },
        });
      } catch {
        // ignore network error during logout
      }
    }
  }, [authToken, fallbackSessionPlayerId]);

  const handleProfileUpdated = useCallback((updated: PlayerAccountProfile) => {
    setIdentity(updated);
    if (localStorage.getItem(AUTH_TOKEN_KEY)) {
      localStorage.setItem(AUTH_PROFILE_CACHE_KEY, JSON.stringify(updated));
    } else if (sessionStorage.getItem(AUTH_TOKEN_KEY)) {
      sessionStorage.setItem(AUTH_PROFILE_CACHE_KEY, JSON.stringify(updated));
    }
  }, []);

  const openAccountModalWithTab = useCallback(
    (tab?: AccountModalTab) => {
      if (tab) {
        setAccountModalTab(tab);
      } else {
        setAccountModalTab(identity.isGuest ? 'login' : 'profile');
      }
      setAccountModalOpen(true);
    },
    [identity.isGuest]
  );

  // Authoritative check whether the current viewer is the Host
  const isViewerHost = Boolean(
    gameState &&
      (gameState.settings.mode === 'online'
        ? isPlayerHost(gameState, localOnlinePlayerId) &&
          (!onlineRoom || onlineRoom.hostPlayerId === localOnlinePlayerId)
        : isPlayerHost(gameState, gameState.players[0]?.id))
  );

  // Sync audio manager
  useEffect(() => {
    soundFX.setEnabled(settings.soundEnabled);
  }, [settings.soundEnabled]);

  // Mirror state to document.body.dataset.state per game shell requirements
  useEffect(() => {
    if (!gameState) {
      document.body.dataset.state = 'title';
    } else if (isPaused) {
      document.body.dataset.state = 'paused';
    } else if (gameState.phase === 'game_over' || gameState.phase === 'round_over') {
      document.body.dataset.state = 'gameover';
    } else {
      document.body.dataset.state = 'playing';
    }
  }, [gameState, isPaused]);

  // Record match outcome when a match reaches game_over
  const recordedMatchKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!gameState || gameState.phase !== 'game_over') {
      recordedMatchKeyRef.current = null;
      return;
    }
    const matchKey = `${gameState.matchId}_${gameState.round}_${gameState.winnerIds.join(',')}`;
    if (recordedMatchKeyRef.current === matchKey) return;
    recordedMatchKeyRef.current = matchKey;

    const viewerId =
      gameState.settings.mode === 'online'
        ? localOnlinePlayerId
        : gameState.players[0]?.id;
    if (!viewerId) return;

    const viewerPlayer = gameState.players.find((p) => p.id === viewerId);
    const won = gameState.winnerIds.includes(viewerId);
    const roundCoinsEarned = viewerPlayer?.coins ?? 0;
    const roundsPlayed = gameState.round;

    if (gameState.settings.mode === 'online') {
      // Online matches are recorded server-side automatically; refresh profile if authenticated
      if (!identity.isGuest && authToken) {
        fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${authToken}` },
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data?.profile) handleProfileUpdated(data.profile);
          })
          .catch(() => {});
      }
      return;
    }

    // AI or Local match progression
    if (!identity.isGuest && authToken) {
      fetch('/api/account/record-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          won,
          roundCoinsEarned,
          isRanked: false,
          roundsPlayed,
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.profile) handleProfileUpdated(data.profile);
        })
        .catch(() => {});
    } else if (identity.isGuest) {
      const reward = computeMatchProgressionReward({
        won,
        roundCoinsEarned,
        isRanked: false,
        roundsPlayed,
      });
      setIdentity((prev) => {
        if (!prev.isGuest) return prev;
        const nextXp = prev.xp + reward.xpDelta;
        const levelInfo = calculateLevelFromXp(nextXp);
        return {
          ...prev,
          xp: nextXp,
          level: levelInfo.level,
          xpIntoLevel: levelInfo.xpIntoLevel,
          xpForNextLevel: levelInfo.xpForNextLevel,
          totalMatches: prev.totalMatches + 1,
          wins: prev.wins + (won ? 1 : 0),
          losses: prev.losses + (won ? 0 : 1),
          coins: prev.coins + reward.coinsDelta,
        };
      });
    }
  }, [
    gameState,
    localOnlinePlayerId,
    identity.isGuest,
    authToken,
    handleProfileUpdated,
  ]);

  const handleSelectMatchMode = useCallback(
    (nextMatchMode: MatchModeId, customConnMode?: GameMode) => {
      const connMode = customConnMode ?? settings.mode;
      const modeDef = getModeConfig(nextMatchMode);
      const normalizedPlayers = normalizePlayersForMode(
        playersConfig,
        nextMatchMode,
        connMode
      );
      setPlayersConfig(normalizedPlayers);
      setSettings((prev) => ({
        ...prev,
        mode: connMode,
        matchMode: nextMatchMode,
        playerCount: normalizedPlayers.length,
        targetCoins: modeDef.defaultTargetCoins,
      }));
    },
    [playersConfig, settings.mode]
  );

  const startLocalOrAIMatch = useCallback(
    (
      customMode?: GameMode,
      customPlayers?: PlayerConfig[],
      customSettings?: GameSettings,
      customMatchMode?: MatchModeId
    ) => {
      const activeSettings = customSettings ?? settings;
      const modeToUse = customMode ?? activeSettings.mode;
      const matchModeToUse = customMatchMode ?? activeSettings.matchMode ?? 'classic';
      const rawPlayers = customPlayers ?? playersConfig;
      const pList = normalizePlayersForMode(rawPlayers, matchModeToUse, modeToUse);
      if (pList.length > 0) {
        pList[0] = {
          ...pList[0],
          name: identity.username,
          avatar: identity.avatar,
          level: identity.level,
          isAuthenticated: !identity.isGuest,
        };
      }
      const normalizedSettings: GameSettings = {
        ...activeSettings,
        mode: modeToUse,
        matchMode: matchModeToUse,
        playerCount: pList.length,
      };
      const initial = createInitialGameState(
        pList,
        normalizedSettings,
        Math.random,
        pList[0]?.id
      );
      setPlayersConfig(pList);
      setSettings(normalizedSettings);
      setGameState(initial);
      setIsPaused(false);
      setHostConfirmAction(null);
      setModeSelectOpen(false);
      setLobbyOpen(false);
      soundFX.playCardDeal();
    },
    [playersConfig, settings, identity]
  );

  // Support ?autostart=1 and optional ?mode=classic|duo|trio|captain|race query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramMode = params.get('mode') as MatchModeId | null;
    const validModes: MatchModeId[] = ['classic', 'duo', 'trio', 'captain', 'race'];
    const resolvedMatchMode: MatchModeId =
      paramMode && validModes.includes(paramMode) ? paramMode : 'classic';

    if (params.get('autostart') === '1' && !gameState) {
      const modeDef = getModeConfig(resolvedMatchMode);
      startLocalOrAIMatch(
        'ai',
        undefined,
        {
          ...settings,
          matchMode: resolvedMatchMode,
          targetCoins: modeDef.defaultTargetCoins,
        },
        resolvedMatchMode
      );
    } else if (paramMode && validModes.includes(paramMode)) {
      handleSelectMatchMode(resolvedMatchMode);
    }
  }, []);

  // Global keyboard shortcuts (Enter/Space on Title, Esc/P for Pause, G for Guide, M for Mute, Host-Only R for Restart)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (
        !gameState &&
        hasChosenEntryMode &&
        !accountModalOpen &&
        !modeSelectOpen &&
        !lobbyOpen &&
        !guideOpen &&
        !howToPlayOpen &&
        !settingsOpen
      ) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          startLocalOrAIMatch('ai');
          return;
        }
      }

      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        if (hostConfirmAction) {
          setHostConfirmAction(null);
          return;
        }
        if (accountModalOpen) {
          setAccountModalOpen(false);
          return;
        }
        if (guideOpen) {
          setGuideOpen(false);
          return;
        }
        if (howToPlayOpen) {
          setHowToPlayOpen(false);
          return;
        }
        if (settingsOpen) {
          setSettingsOpen(false);
          return;
        }
        if (modeSelectOpen) {
          setModeSelectOpen(false);
          return;
        }
        if (lobbyOpen) {
          setLobbyOpen(false);
          return;
        }
        if (gameState) {
          e.preventDefault();
          setIsPaused((prev) => !prev);
        }
      } else if (e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setGuideOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setSettings((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }));
      } else if (e.key.toLowerCase() === 'r' && gameState && isViewerHost) {
        e.preventDefault();
        setHostConfirmAction('restart');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    gameState,
    hasChosenEntryMode,
    accountModalOpen,
    isViewerHost,
    hostConfirmAction,
    modeSelectOpen,
    lobbyOpen,
    guideOpen,
    howToPlayOpen,
    settingsOpen,
    startLocalOrAIMatch,
  ]);

  // Trigger audio feedback on animation events
  const lastAnimIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const anim = gameState?.lastAnimationEvent;
    if (!anim || anim.id === lastAnimIdRef.current) return;
    lastAnimIdRef.current = anim.id;

    switch (anim.type) {
      case 'cannon':
        soundFX.playCannonBlast();
        break;
      case 'duel':
        soundFX.playSwordClash();
        break;
      case 'coin':
        soundFX.playCoinEarned();
        break;
      case 'spy':
        soundFX.playSpyShield();
        break;
      case 'pirate_self_destruct':
        soundFX.playElimination();
        break;
      default:
        soundFX.playCardSelect();
        break;
    }
  }, [gameState?.lastAnimationEvent]);

  // Automatic AI turns for Local/AI mode
  useEffect(() => {
    if (!gameState || isPaused || hostConfirmAction || gameState.settings.mode === 'online')
      return;

    if (gameState.phase === 'choosing_action') {
      const activePlayer = gameState.players[gameState.activePlayerIndex];
      if (activePlayer && activePlayer.isAI && !activePlayer.isEliminated) {
        const timer = setTimeout(() => {
          setGameState((current) => {
            if (!current || current.phase !== 'choosing_action') return current;
            const actor = current.players[current.activePlayerIndex];
            if (!actor || !actor.isAI) return current;
            const move = computeAIMove(current);
            return playCard(current, move);
          });
        }, 700);
        return () => clearTimeout(timer);
      }
    } else if (gameState.phase === 'merchant_selection' && gameState.pendingMerchant) {
      const merchantActor = gameState.players.find(
        (p) => p.id === gameState.pendingMerchant?.playerId
      );
      if (merchantActor && merchantActor.isAI) {
        const timer = setTimeout(() => {
          setGameState((current) => {
            if (!current || current.phase !== 'merchant_selection') return current;
            const choice = computeAIMerchantChoice(current);
            return resolveMerchantChoice(current, choice);
          });
        }, 650);
        return () => clearTimeout(timer);
      }
    }
  }, [gameState, isPaused, hostConfirmAction]);

  // WebSocket Connection Helper for Online Mode
  const ensureWebSocket = useCallback((): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        resolve(wsRef.current);
        return;
      }

      const envWsUrl = import.meta.env.VITE_WS_URL as string | undefined;
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl =
        envWsUrl && envWsUrl.trim().length > 0
          ? envWsUrl.trim()
          : `${proto}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => resolve(ws);
      ws.onerror = () => reject(new Error('WebSocket connection failed'));
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data.type === 'room_update' && data.room) {
            setOnlineError(null);
            setOnlineRoom(data.room);
            if (data.room.gameState) {
              setGameState(data.room.gameState);
              setLobbyOpen(false);
            }
          } else if (data.type === 'error') {
            setOnlineError(
              settings.language === 'bn' ? data.messageBn : data.messageEn
            );
          }
        } catch {
          // ignore malformed packet
        }
      };
    });
  }, [settings.language]);

  const sendOnlineMessage = async (payload: Record<string, unknown>) => {
    try {
      const ws = await ensureWebSocket();
      ws.send(JSON.stringify(payload));
    } catch {
      setOnlineError(
        settings.language === 'bn'
          ? 'অনলাইন মাল্টিপ্লেয়ার সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি। (স্ট্যাটিক হোস্টিংয়ে এআই বনাম একক খেলা ও লোকাল পাস-অ্যান্ড-প্লে সরাসরি ব্রাউজারে খেলা যাবে)।'
          : 'Could not connect to the Online Multiplayer WebSocket server. (On static hosts like itch.io, Play vs AI and Local Pass & Play work directly in the browser without a server).'
      );
    }
  };

  // Determine which player's hand is shown at the bottom of the screen
  const getViewerPlayerId = (): string => {
    if (!gameState) return playersConfig[0]?.id ?? 'player_1';
    if (gameState.settings.mode === 'online') {
      return localOnlinePlayerId;
    }
    if (gameState.settings.mode === 'local') {
      // In local pass-and-play, the active human player views their hand
      const active = gameState.players[gameState.activePlayerIndex];
      return active?.id ?? gameState.players[0].id;
    }
    return gameState.players[0].id;
  };

  const handlePlayCard = (action: PlayCardAction) => {
    if (!gameState) return;
    if (gameState.settings.mode === 'online') {
      sendOnlineMessage({
        type: 'play_card',
        cardUid: action.cardUid,
        targetPlayerId: action.targetPlayerId,
        guessedValue: action.guessedValue,
      });
      return;
    }
    setGameState((prev) => (prev ? playCard(prev, action) : prev));
  };

  const handleResolveMerchant = (keepCardUid: string) => {
    if (!gameState || !gameState.pendingMerchant) return;
    if (gameState.settings.mode === 'online') {
      sendOnlineMessage({
        type: 'resolve_merchant',
        keepCardUid,
      });
      return;
    }
    setGameState((prev) =>
      prev
        ? resolveMerchantChoice(prev, {
            playerId: prev.pendingMerchant!.playerId,
            keepCardUid,
          })
        : prev
    );
  };

  const handleAcknowledgeReveal = () => {
    if (!gameState) return;
    if (gameState.settings.mode === 'online') {
      sendOnlineMessage({ type: 'acknowledge_reveal' });
      return;
    }
    setGameState((prev) => (prev ? acknowledgeReveal(prev) : prev));
  };

  const handleNextRound = () => {
    if (!gameState) return;
    soundFX.playCardDeal();
    if (gameState.settings.mode === 'online') {
      sendOnlineMessage({ type: 'next_round' });
      return;
    }
    setGameState((prev) => (prev ? startNextRound(prev) : prev));
  };

  // Requesting Restart or Refresh always checks host status and opens the confirmation modal
  const requestHostRestart = () => {
    if (!gameState || !isViewerHost) return;
    setHostConfirmAction('restart');
  };

  const requestHostRefresh = () => {
    if (!gameState || !isViewerHost) return;
    setHostConfirmAction('refresh');
  };

  // Executed only after Host confirms in HostConfirmModal
  const executeConfirmedHostAction = () => {
    if (!gameState || !isViewerHost || !hostConfirmAction) return;
    const actionToRun = hostConfirmAction;
    setHostConfirmAction(null);
    setIsPaused(false);
    soundFX.playCardDeal();

    if (gameState.settings.mode === 'online') {
      sendOnlineMessage({
        type: actionToRun === 'restart' ? 'restart_match' : 'refresh_game',
      });
      return;
    }

    const hostId = gameState.hostPlayerId;
    if (actionToRun === 'restart') {
      setGameState((prev) => (prev ? restartMatchByHost(prev, hostId) : prev));
    } else {
      setGameState((prev) => (prev ? refreshGameByHost(prev, hostId) : prev));
    }
  };

  const showInitialAuthGate = !gameState && !hasChosenEntryMode;

  return (
    <>
      {!gameState ? (
        <TitleScreen
          language={settings.language}
          matchMode={settings.matchMode ?? 'classic'}
          identity={identity}
          onOpenAccountModal={openAccountModalWithTab}
          onLogout={handleLogout}
          onToggleLanguage={() =>
            setSettings((s) => ({ ...s, language: s.language === 'bn' ? 'en' : 'bn' }))
          }
          onQuickStartAI={() => startLocalOrAIMatch('ai')}
          onOpenModeSelection={() => setModeSelectOpen(true)}
          onOpenLobby={(mode) => {
            const normalized = normalizePlayersForMode(
              playersConfig,
              settings.matchMode ?? 'classic',
              mode
            );
            setPlayersConfig(normalized);
            setSettings((s) => ({ ...s, mode, playerCount: normalized.length }));
            setLobbyOpen(true);
          }}
          onOpenGuide={(initialCard) => {
            setGuideInitialCard(initialCard ?? null);
            setGuideOpen(true);
          }}
          onOpenHowToPlay={() => setHowToPlayOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      ) : (
        <GameTable
          state={gameState}
          viewerPlayerId={getViewerPlayerId()}
          isHost={isViewerHost}
          language={settings.language}
          soundEnabled={settings.soundEnabled}
          onToggleSound={() =>
            setSettings((s) => ({ ...s, soundEnabled: !s.soundEnabled }))
          }
          onToggleLanguage={() =>
            setSettings((s) => ({ ...s, language: s.language === 'bn' ? 'en' : 'bn' }))
          }
          onPlayCardAction={handlePlayCard}
          onOpenGuide={(val) => {
            setGuideInitialCard(val ?? null);
            setGuideOpen(true);
          }}
          onOpenHowToPlay={() => setHowToPlayOpen(true)}
          onOpenPause={() => setIsPaused(true)}
          onRequestRestart={requestHostRestart}
          onRequestRefresh={requestHostRefresh}
          onlineRoomCode={
            gameState.settings.mode === 'online' ? (onlineRoom?.code ?? null) : null
          }
        />
      )}

      {/* Custom In-Game Account & Login Screen / Profile Modal */}
      <AccountModal
        isOpen={showInitialAuthGate || accountModalOpen}
        fullScreenGate={showInitialAuthGate}
        initialTab={showInitialAuthGate ? 'login' : accountModalTab}
        language={settings.language}
        onToggleLanguage={() =>
          setSettings((s) => ({ ...s, language: s.language === 'bn' ? 'en' : 'bn' }))
        }
        identity={identity}
        authToken={authToken}
        onAuthSuccess={handleAuthSuccess}
        onContinueAsGuest={handleContinueAsGuest}
        onLogout={handleLogout}
        onProfileUpdated={handleProfileUpdated}
        onClose={() => setAccountModalOpen(false)}
      />

      {/* Local Pass-and-Play Privacy Overlay */}
      {gameState && gameState.phase === 'waiting_for_privacy' && (
        <PrivacyOverlay
          state={gameState}
          language={settings.language}
          onUnlock={() => setGameState((prev) => (prev ? unlockPrivacyScreen(prev) : prev))}
        />
      )}

      {/* Merchant (6) Card Selection Modal */}
      {gameState &&
        gameState.phase === 'merchant_selection' &&
        gameState.pendingMerchant &&
        gameState.pendingMerchant.playerId === getViewerPlayerId() && (
          <MerchantModal
            state={gameState}
            language={settings.language}
            onResolve={handleResolveMerchant}
            onInspectCard={(v) => {
              setGuideInitialCard(v);
              setGuideOpen(true);
            }}
          />
        )}

      {/* Private Reveal Modal (Ship Worker / Swordsman Duel) */}
      {gameState && gameState.phase === 'private_reveal' && gameState.activeReveal && (
        <PrivateRevealModal
          state={gameState}
          language={settings.language}
          onAcknowledge={handleAcknowledgeReveal}
        />
      )}

      {/* Round Results & Overall Game Over Modal */}
      {gameState &&
        (gameState.phase === 'round_over' || gameState.phase === 'game_over') && (
          <RoundAndGameResultsModal
            state={gameState}
            isHost={isViewerHost}
            language={settings.language}
            onNextRound={handleNextRound}
            onRematch={requestHostRestart}
            onReturnToTitle={() => {
              setGameState(null);
              setIsPaused(false);
              setHostConfirmAction(null);
            }}
          />
        )}

      {/* Pause Modal */}
      <PauseModal
        isOpen={Boolean(gameState && isPaused)}
        isHost={isViewerHost}
        language={settings.language}
        onResume={() => setIsPaused(false)}
        onRequestRestart={requestHostRestart}
        onRequestRefresh={requestHostRefresh}
        onReturnToTitle={() => {
          setGameState(null);
          setIsPaused(false);
          setHostConfirmAction(null);
        }}
      />

      {/* Host-Only Restart / Refresh Confirmation Dialog */}
      <HostConfirmModal
        actionType={hostConfirmAction}
        isHost={isViewerHost}
        language={settings.language}
        onConfirm={executeConfirmedHostAction}
        onCancel={() => setHostConfirmAction(null)}
      />

      {/* Mode Selection Screen (All 5 Modes) */}
      <ModeSelectionModal
        isOpen={modeSelectOpen}
        onClose={() => setModeSelectOpen(false)}
        selectedMatchMode={settings.matchMode ?? 'classic'}
        onSelectMatchMode={(m) => handleSelectMatchMode(m)}
        connectionMode={settings.mode}
        onChangeConnectionMode={(connMode) =>
          handleSelectMatchMode(settings.matchMode ?? 'classic', connMode)
        }
        targetCoins={settings.targetCoins}
        onChangeTargetCoins={(targetCoins) =>
          setSettings((s) => ({ ...s, targetCoins }))
        }
        language={settings.language}
        onToggleLanguage={() =>
          setSettings((s) => ({ ...s, language: s.language === 'bn' ? 'en' : 'bn' }))
        }
        onPlayNow={(chosenMatchMode) => {
          if (settings.mode === 'online') {
            handleSelectMatchMode(chosenMatchMode, 'online');
            setModeSelectOpen(false);
            setLobbyOpen(true);
            return;
          }
          startLocalOrAIMatch(settings.mode, undefined, undefined, chosenMatchMode);
        }}
        onOpenLobbyForMode={(chosenMatchMode) => {
          handleSelectMatchMode(chosenMatchMode);
          setModeSelectOpen(false);
          setLobbyOpen(true);
        }}
      />

      {/* Lobby Modal */}
      <LobbyModal
        isOpen={lobbyOpen}
        onClose={() => setLobbyOpen(false)}
        identity={identity}
        onOpenAccountModal={(tab) => {
          setLobbyOpen(false);
          openAccountModalWithTab(tab);
        }}
        mode={settings.mode}
        onChangeMode={(mode) => setSettings((s) => ({ ...s, mode }))}
        players={playersConfig}
        onUpdatePlayers={setPlayersConfig}
        settings={settings}
        onUpdateSettings={(partial) => setSettings((s) => ({ ...s, ...partial }))}
        onStartLocalOrAIGame={() => startLocalOrAIMatch()}
        localPlayerId={localOnlinePlayerId}
        onlineRoom={onlineRoom}
        onlineError={onlineError}
        onCreateOnlineRoom={(name, avatar, isRanked) =>
          sendOnlineMessage({
            type: 'create_room',
            playerId: localOnlinePlayerId,
            playerName: name,
            avatar,
            authToken,
            isRanked,
            settings: { ...settings, isRanked },
          })
        }
        onJoinOnlineRoom={(code, name, avatar) =>
          sendOnlineMessage({
            type: 'join_room',
            roomCode: code,
            playerId: localOnlinePlayerId,
            playerName: name,
            avatar,
            authToken,
          })
        }
        onAddOnlineBot={(difficulty: AIDifficulty) =>
          sendOnlineMessage({ type: 'add_bot', difficulty })
        }
        onRemoveOnlinePlayer={(targetPlayerId) =>
          sendOnlineMessage({ type: 'remove_player', targetPlayerId })
        }
        onChangeOnlineMatchMode={(matchMode) =>
          sendOnlineMessage({ type: 'change_match_mode', matchMode })
        }
        onAssignOnlineTeam={(targetPlayerId, teamId) =>
          sendOnlineMessage({ type: 'assign_team', targetPlayerId, teamId })
        }
        onBalanceOnlineTeams={() => sendOnlineMessage({ type: 'balance_teams' })}
        onRandomizeOnlineTeams={() => sendOnlineMessage({ type: 'randomize_teams' })}
        onToggleOnlineReady={() => sendOnlineMessage({ type: 'toggle_ready' })}
        onStartOnlineGame={() => sendOnlineMessage({ type: 'start_game' })}
      />

      {/* Character Guide Modal */}
      <CharacterGuideModal
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
        language={settings.language}
        initialSelectedValue={guideInitialCard}
        deckCounts={settings.deckCounts}
      />

      {/* How To Play Modal */}
      <HowToPlayModal
        isOpen={howToPlayOpen}
        onClose={() => setHowToPlayOpen(false)}
        language={settings.language}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(partial) => setSettings((s) => ({ ...s, ...partial }))}
      />
    </>
  );
}
