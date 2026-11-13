import React, { useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Check,
  Copy,
  Crown,
  Globe,
  Play,
  Plus,
  RefreshCw,
  Scale,
  Shuffle,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { PIRATE_AVATARS } from '../game/cards';
import {
  GAME_MODE_LIST,
  assignPlayerToTeam,
  balanceTeams,
  getModeConfig,
  getTeamTemplatesForMode,
  normalizePlayersForMode,
  randomizeTeams,
  validateLobbyForMode,
} from '../game/modes';
import { AIDifficulty, GameMode, GameSettings, MatchModeId, PlayerConfig } from '../game/types';

interface OnlineRoomData {
  code: string;
  hostPlayerId: string;
  players: Array<PlayerConfig & { connected?: boolean }>;
  settings: GameSettings;
}

interface LobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: GameMode;
  onChangeMode: (mode: GameMode) => void;
  players: PlayerConfig[];
  onUpdatePlayers: (players: PlayerConfig[]) => void;
  settings: GameSettings;
  onUpdateSettings: (partial: Partial<GameSettings>) => void;
  onStartLocalOrAIGame: () => void;
  // Online multiplayer props
  localPlayerId: string;
  onlineRoom: OnlineRoomData | null;
  onlineError: string | null;
  onCreateOnlineRoom: (name: string, avatar: string) => void;
  onJoinOnlineRoom: (code: string, name: string, avatar: string) => void;
  onAddOnlineBot: (difficulty: AIDifficulty) => void;
  onRemoveOnlinePlayer: (targetId: string) => void;
  onChangeOnlineMatchMode: (matchMode: MatchModeId) => void;
  onAssignOnlineTeam: (targetPlayerId: string, teamId: string) => void;
  onBalanceOnlineTeams: () => void;
  onRandomizeOnlineTeams: () => void;
  onToggleOnlineReady: () => void;
  onStartOnlineGame: () => void;
}

function getTeamBadgeColors(colorKey: string, active: boolean): string {
  switch (colorKey) {
    case 'crimson':
      return active
        ? 'bg-red-700 text-red-50 border-red-300 shadow'
        : 'bg-red-950/60 text-red-200/80 border-red-500/35 hover:border-red-400';
    case 'sapphire':
      return active
        ? 'bg-sky-700 text-sky-50 border-sky-300 shadow'
        : 'bg-sky-950/60 text-sky-200/80 border-sky-500/35 hover:border-sky-400';
    case 'emerald':
      return active
        ? 'bg-emerald-700 text-emerald-50 border-emerald-300 shadow'
        : 'bg-emerald-950/60 text-emerald-200/80 border-emerald-500/35 hover:border-emerald-400';
    case 'gold':
    default:
      return active
        ? 'bg-amber-500 text-slate-950 border-amber-200 shadow font-extrabold'
        : 'bg-amber-950/60 text-amber-200/80 border-amber-500/35 hover:border-amber-400';
  }
}

export const LobbyModal: React.FC<LobbyModalProps> = ({
  isOpen,
  onClose,
  mode,
  onChangeMode,
  players,
  onUpdatePlayers,
  settings,
  onUpdateSettings,
  onStartLocalOrAIGame,
  localPlayerId,
  onlineRoom,
  onlineError,
  onCreateOnlineRoom,
  onJoinOnlineRoom,
  onAddOnlineBot,
  onRemoveOnlinePlayer,
  onChangeOnlineMatchMode,
  onAssignOnlineTeam,
  onBalanceOnlineTeams,
  onRandomizeOnlineTeams,
  onToggleOnlineReady,
  onStartOnlineGame,
}) => {
  const [onlineName, setOnlineName] = useState('ক্যাপ্টেন রফিক');
  const [onlineAvatar, setOnlineAvatar] = useState(PIRATE_AVATARS[0].emoji);
  const [joinCode, setJoinCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const lang = settings.language;
  const activeMatchMode: MatchModeId =
    mode === 'online' && onlineRoom
      ? onlineRoom.settings.matchMode ?? 'classic'
      : settings.matchMode ?? 'classic';

  const modeDef = getModeConfig(activeMatchMode);
  const teamTemplates = getTeamTemplatesForMode(activeMatchMode);

  // Switch match mode (Host action)
  const handleSelectMatchMode = (nextMatchMode: MatchModeId) => {
    const nextDef = getModeConfig(nextMatchMode);
    if (mode === 'online' && onlineRoom) {
      onChangeOnlineMatchMode(nextMatchMode);
      return;
    }
    const normalized = normalizePlayersForMode(players, nextMatchMode, mode);
    onUpdatePlayers(normalized);
    onUpdateSettings({
      matchMode: nextMatchMode,
      playerCount: normalized.length,
      targetCoins: nextDef.defaultTargetCoins,
    });
  };

  const handlePlayerCountChange = (newCount: number) => {
    const clamped = Math.max(
      modeDef.minPlayers,
      Math.min(modeDef.maxPlayers, newCount)
    );
    const defaultBnNames = [
      'ক্যাপ্টেন রফিক',
      'জলদস্যু রুস্তম',
      'নাবিক সুলতানা',
      'গোলন্দাজ করিম',
      'গুপ্তচর নাদিয়া',
      'বণিক হাশেম',
    ];
    const next: PlayerConfig[] = [];
    for (let i = 0; i < clamped; i++) {
      if (players[i]) {
        next.push({
          ...players[i],
          isAI: mode === 'ai' ? i > 0 : false,
        });
      } else {
        next.push({
          id: `player_${i + 1}`,
          name: defaultBnNames[i % defaultBnNames.length],
          avatar: PIRATE_AVATARS[i % PIRATE_AVATARS.length].emoji,
          isAI: mode === 'ai' ? i > 0 : false,
          aiDifficulty: 'medium',
          ready: true,
        });
      }
    }
    const normalized = normalizePlayersForMode(next, activeMatchMode, mode);
    onUpdatePlayers(normalized);
    onUpdateSettings({ playerCount: normalized.length });
  };

  const updateSinglePlayer = (index: number, patch: Partial<PlayerConfig>) => {
    const next = [...players];
    next[index] = { ...next[index], ...patch };
    onUpdatePlayers(next);
  };

  const handleLocalAssignTeam = (playerId: string, teamId: string) => {
    onUpdatePlayers(assignPlayerToTeam(players, playerId, teamId, activeMatchMode));
  };

  const handleLocalBalanceTeams = () => {
    onUpdatePlayers(balanceTeams(players, activeMatchMode));
  };

  const handleLocalRandomizeTeams = () => {
    onUpdatePlayers(randomizeTeams(players, activeMatchMode, Math.random));
  };

  const copyRoomCode = () => {
    if (!onlineRoom) return;
    navigator.clipboard?.writeText(onlineRoom.code).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Validate current lobby state
  const localValidation = validateLobbyForMode(players, activeMatchMode);
  const onlineValidation = onlineRoom
    ? validateLobbyForMode(onlineRoom.players, activeMatchMode)
    : { valid: false };

  // Allowed player counts for the current mode
  const allowedCounts: number[] = [];
  for (let c = modeDef.minPlayers; c <= modeDef.maxPlayers; c++) {
    allowedCounts.push(c);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'bn' ? 'গেম লবি ও টিম সেটআপ' : 'Game Lobby & Team Setup'}
    >
      <div className="cabin-wood-panel w-full max-w-5xl rounded-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-amber-500/25 bg-[#160e09]">
          <div>
            <h2 className="text-lg sm:text-2xl font-extrabold text-amber-300">
              {lang === 'bn'
                ? '⚓ জাহাজের কেবিন লবি ও টিম সেটআপ'
                : '⚓ Captain’s Cabin Lobby & Team Assignment'}
            </h2>
            <p className="text-xs sm:text-sm text-amber-100/80 mt-0.5">
              {lang === 'bn'
                ? 'গেম মোড, দলগত ক্রু বিভাজন, খেলোয়াড় সংখ্যা এবং এআই দক্ষতা নির্ধারণ করুন'
                : 'Select game mode, assign pirate crews, configure seats, and set victory rules'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Lobby"
            className="p-2 rounded-xl bg-amber-900/35 hover:bg-amber-700/55 text-amber-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* =================================================================
            GAME MODE SELECTOR BAR (All 5 Modes)
           ================================================================= */}
        <div className="px-4 py-2.5 sm:px-6 sm:py-3 bg-[#140c08] border-b border-amber-500/20 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-extrabold text-amber-300">
              {lang === 'bn' ? '🏴‍☠️ গেম মোড (Host):' : '🏴‍☠️ Game Mode (Host):'}
            </span>
            <span className="text-xs text-amber-200/85 font-mono-num">
              {lang === 'bn'
                ? `${modeDef.playerCountLabelBn} · ${modeDef.teamArrangementBn}`
                : `${modeDef.playerCountLabelEn} · ${modeDef.teamArrangementEn}`}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2">
            {GAME_MODE_LIST.map((m) => {
              const isSelected = activeMatchMode === m.id;
              const isOnlineGuest =
                mode === 'online' &&
                onlineRoom &&
                onlineRoom.hostPlayerId !== localPlayerId;
              return (
                <button
                  key={m.id}
                  type="button"
                  data-testid={`lobby-mode-btn-${m.id}`}
                  disabled={Boolean(isOnlineGuest)}
                  onClick={() => handleSelectMatchMode(m.id)}
                  className={`px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border text-left transition-all flex items-center justify-between gap-1.5 cursor-pointer disabled:opacity-60 ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-200 font-extrabold shadow'
                      : 'bg-black/50 border-amber-500/30 text-amber-100 hover:border-amber-400'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-extrabold truncate">
                      {m.badgeEmoji} {lang === 'bn' ? m.nameBn : m.nameEn}
                    </div>
                    <div
                      className={`text-[10px] truncate ${
                        isSelected ? 'text-slate-900 font-bold' : 'text-amber-300/80'
                      }`}
                    >
                      {lang === 'bn' ? m.playerCountLabelBn : m.playerCountLabelEn}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Connection Type & Player Count Selector */}
        <div className="px-4 py-2.5 sm:px-6 sm:py-3 bg-[#1b110b] border-b border-amber-500/15 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-black/45 rounded-xl border border-amber-500/25 overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                onChangeMode('ai');
                onUpdatePlayers(
                  normalizePlayersForMode(players, activeMatchMode, 'ai')
                );
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'ai'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-amber-200/80 hover:text-amber-100'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>{lang === 'bn' ? 'এআই বনাম একক খেলা' : 'Play vs AI'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onChangeMode('local');
                onUpdatePlayers(
                  normalizePlayersForMode(
                    players.map((p, idx) => ({
                      ...p,
                      isAI: false,
                      name:
                        idx === 0 && p.name.includes('আপনি')
                          ? 'ক্যাপ্টেন রফিক'
                          : p.name,
                    })),
                    activeMatchMode,
                    'local'
                  )
                );
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'local'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-amber-200/80 hover:text-amber-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{lang === 'bn' ? 'লোকাল (Pass & Play)' : 'Local Pass & Play'}</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeMode('online')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'online'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-amber-200/80 hover:text-amber-100'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>{lang === 'bn' ? 'অনলাইন রুম (Online)' : 'Online Room'}</span>
            </button>
          </div>

          {mode !== 'online' && (
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-amber-200">
                {lang === 'bn' ? 'খেলোয়াড় সংখ্যা:' : 'Players:'}
              </span>
              {allowedCounts.map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => handlePlayerCountChange(cnt)}
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl font-mono-num text-xs sm:text-sm font-extrabold transition-colors cursor-pointer ${
                    players.length === cnt
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'bg-black/45 border border-amber-500/30 text-amber-200 hover:border-amber-400'
                  }`}
                >
                  {cnt}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {mode !== 'online' ? (
            <>
              {/* Team Controls Bar for Duo, Trio, and Captain Modes */}
              {teamTemplates.length > 0 && (
                <div
                  data-testid="lobby-team-controls"
                  className="p-3 sm:p-4 rounded-xl bg-[#122621]/90 border border-[#d4af37]/40 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs sm:text-base font-extrabold text-amber-300 flex items-center gap-2">
                      <span>
                        {lang === 'bn'
                          ? `⚓ দল ও ভূমিকা নির্ধারণ (${modeDef.teamArrangementBn})`
                          : `⚓ Crew & Role Assignment (${modeDef.teamArrangementEn})`}
                      </span>
                    </div>
                    <p className="text-xs text-amber-100/85">
                      {lang === 'bn'
                        ? modeDef.coinRuleBn
                        : modeDef.coinRuleEn}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid="btn-balance-teams"
                      onClick={handleLocalBalanceTeams}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/50 text-xs sm:text-sm font-extrabold text-amber-200 flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Scale className="w-4 h-4 text-amber-300" />
                      <span>{lang === 'bn' ? 'টিম ব্যালেন্স' : 'Balance Teams'}</span>
                    </button>

                    <button
                      type="button"
                      data-testid="btn-randomize-teams"
                      onClick={handleLocalRandomizeTeams}
                      className="px-3 py-1.5 rounded-xl bg-purple-900/50 hover:bg-purple-800/70 border border-purple-400/45 text-xs sm:text-sm font-extrabold text-purple-100 flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Shuffle className="w-4 h-4 text-purple-300" />
                      <span>{lang === 'bn' ? 'র‍্যান্ডম টিম' : 'Randomize'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Validation Error / Warning Banner if team counts or player count are invalid */}
              {!localValidation.valid && (
                <div
                  data-testid="lobby-validation-error"
                  className="p-3 rounded-xl bg-red-950/85 border border-red-500/60 text-xs sm:text-sm text-red-200 font-bold flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>
                      {lang === 'bn'
                        ? localValidation.reasonBn
                        : localValidation.reasonEn}
                    </span>
                  </div>
                  {teamTemplates.length > 0 && (
                    <button
                      type="button"
                      onClick={handleLocalBalanceTeams}
                      className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 text-xs font-extrabold shrink-0 cursor-pointer"
                    >
                      {lang === 'bn' ? 'অটো ফিক্স (Balance)' : 'Auto-Balance'}
                    </button>
                  )}
                </div>
              )}

              {/* Player Roster Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {players.map((p, idx) => {
                  const assignedTeam = teamTemplates.find((t) => t.id === p.teamId);
                  return (
                    <div
                      key={p.id}
                      data-testid={`lobby-player-card-${idx}`}
                      className="p-3.5 rounded-xl bg-black/50 border border-amber-500/25 flex flex-col gap-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-mono-num font-bold text-amber-400">
                            {lang === 'bn'
                              ? `খেলোয়াড় #${idx + 1}`
                              : `Seat #${idx + 1}`}
                          </span>
                          {idx === 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-[10px] font-mono-num font-extrabold text-amber-300">
                              👑 HOST
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/40 text-[10px] font-bold text-emerald-300">
                            {lang === 'bn' ? '✓ প্রস্তুত' : '✓ Ready'}
                          </span>
                        </div>

                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => updateSinglePlayer(idx, { isAI: !p.isAI })}
                            className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                              p.isAI
                                ? 'bg-purple-900/65 text-purple-200 border border-purple-400/35'
                                : 'bg-emerald-900/65 text-emerald-200 border border-emerald-400/35'
                            }`}
                          >
                            {p.isAI
                              ? lang === 'bn'
                                ? '🤖 AI বট'
                                : '🤖 AI Bot'
                              : lang === 'bn'
                              ? '👤 মানুষ'
                              : '👤 Human'}
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            const curIdx = PIRATE_AVATARS.findIndex(
                              (a) => a.emoji === p.avatar
                            );
                            const nextAvatar =
                              PIRATE_AVATARS[(curIdx + 1) % PIRATE_AVATARS.length].emoji;
                            updateSinglePlayer(idx, { avatar: nextAvatar });
                          }}
                          aria-label={`Change avatar for player ${idx + 1}`}
                          className="w-11 h-11 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-2xl hover:border-amber-300 transition-colors shrink-0 cursor-pointer"
                        >
                          {p.avatar}
                        </button>

                        <input
                          type="text"
                          value={p.name}
                          onChange={(e) =>
                            updateSinglePlayer(idx, { name: e.target.value })
                          }
                          aria-label={`Player ${idx + 1} name`}
                          className="flex-1 px-3 py-2 rounded-xl bg-black/60 border border-amber-500/35 text-sm sm:text-base font-bold text-amber-100 focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      {/* Team / Role Assignment Selector (for Duo, Trio, Captain modes) */}
                      {teamTemplates.length > 0 && (
                        <div className="pt-1 border-t border-amber-500/15 flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-xs text-amber-200/85 font-bold">
                            {activeMatchMode === 'captain'
                              ? lang === 'bn'
                                ? 'ভূমিকা (Role):'
                                : 'Role:'
                              : lang === 'bn'
                              ? 'ক্রু দল (Team):'
                              : 'Crew Team:'}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {teamTemplates.map((t) => {
                              const isCurrentTeam = p.teamId === t.id;
                              return (
                                <button
                                  key={t.id}
                                  type="button"
                                  data-testid={`assign-${p.id}-${t.id}`}
                                  onClick={() => handleLocalAssignTeam(p.id, t.id)}
                                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${getTeamBadgeColors(
                                    t.color,
                                    isCurrentTeam
                                  )}`}
                                >
                                  {t.id === 'team_captain' ? '👑 ' : '⚓ '}
                                  {lang === 'bn' ? t.nameBn : t.nameEn}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {p.isAI && (
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs text-amber-200/85 font-semibold">
                            {lang === 'bn' ? 'এআই দক্ষতা:' : 'AI Difficulty:'}
                          </span>
                          <div className="flex items-center gap-1">
                            {(['easy', 'medium', 'hard'] as AIDifficulty[]).map((diff) => (
                              <button
                                key={diff}
                                type="button"
                                onClick={() =>
                                  updateSinglePlayer(idx, { aiDifficulty: diff })
                                }
                                className={`px-2.5 py-0.5 rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer ${
                                  (p.aiDifficulty ?? 'medium') === diff
                                    ? 'bg-amber-500 text-slate-950'
                                    : 'bg-black/55 text-amber-200/75 hover:text-amber-100'
                                }`}
                              >
                                {diff === 'easy'
                                  ? lang === 'bn'
                                    ? 'সহজ'
                                    : 'Easy'
                                  : diff === 'medium'
                                  ? lang === 'bn'
                                    ? 'মাঝারি'
                                    : 'Medium'
                                  : lang === 'bn'
                                  ? 'কঠিন'
                                  : 'Hard'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Match Victory & Reward Summary + Start Button */}
              <div className="p-4 rounded-xl bg-black/40 border border-amber-500/25 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-xs sm:text-base font-semibold text-amber-100">
                    <span>
                      {activeMatchMode === 'race'
                        ? lang === 'bn'
                          ? 'ট্রেজার লক্ষ্য:'
                          : 'Treasure Target:'
                        : lang === 'bn'
                        ? 'জয়ের কয়েন লক্ষ্য:'
                        : 'Victory Target:'}
                    </span>
                    <select
                      value={settings.targetCoins}
                      onChange={(e) =>
                        onUpdateSettings({ targetCoins: Number(e.target.value) })
                      }
                      className="px-3 py-1.5 rounded-lg bg-[#160e09] border border-amber-500/35 font-mono-num text-xs sm:text-base text-amber-300 font-bold"
                    >
                      {[2, 3, 4, 5, 6, 8, 10].map((v) => (
                        <option key={v} value={v}>
                          {v} {lang === 'bn' ? 'কয়েন' : 'Coins'}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex items-center gap-2 text-xs sm:text-base font-semibold text-amber-100">
                    <span>{lang === 'bn' ? 'রাউন্ড জয়ে পুরস্কার:' : 'Round Reward:'}</span>
                    <select
                      value={settings.roundVictoryReward}
                      onChange={(e) =>
                        onUpdateSettings({ roundVictoryReward: Number(e.target.value) })
                      }
                      className="px-3 py-1.5 rounded-lg bg-[#160e09] border border-amber-500/35 font-mono-num text-xs sm:text-base text-amber-300 font-bold"
                    >
                      {[1, 2, 3, 4].map((v) => (
                        <option key={v} value={v}>
                          +{v} {lang === 'bn' ? 'কয়েন' : 'Coins'}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <button
                  type="button"
                  data-testid="btn-lobby-start-game"
                  disabled={!localValidation.valid}
                  onClick={onStartLocalOrAIGame}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-extrabold text-sm sm:text-lg shadow-lg transition-transform active:scale-95 cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>
                    {lang === 'bn'
                      ? `${modeDef.nameBn} শুরু করুন!`
                      : `Start ${modeDef.nameEn}!`}
                  </span>
                </button>
              </div>
            </>
          ) : (
            /* Online Multiplayer Room View */
            <div className="space-y-4">
              {onlineError && (
                <div className="p-4 rounded-xl bg-red-950/75 border border-red-500/50 text-sm sm:text-base text-red-200 font-semibold leading-relaxed">
                  ⚠️ {onlineError}
                </div>
              )}

              {!onlineRoom ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Profile setup */}
                  <div className="p-5 rounded-xl bg-black/45 border border-amber-500/25 space-y-4">
                    <h3 className="text-base sm:text-lg font-extrabold text-amber-300">
                      {lang === 'bn' ? '১. আপনার জলদস্যু প্রোফাইল' : '1. Your Pirate Identity'}
                    </h3>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          const idx = PIRATE_AVATARS.findIndex(
                            (a) => a.emoji === onlineAvatar
                          );
                          setOnlineAvatar(
                            PIRATE_AVATARS[(idx + 1) % PIRATE_AVATARS.length].emoji
                          );
                        }}
                        className="w-12 h-12 rounded-xl bg-amber-950/60 border border-amber-500/40 text-2xl flex items-center justify-center cursor-pointer"
                      >
                        {onlineAvatar}
                      </button>
                      <input
                        type="text"
                        value={onlineName}
                        onChange={(e) => setOnlineName(e.target.value)}
                        placeholder={lang === 'bn' ? 'আপনার নাম...' : 'Your Pirate Name...'}
                        aria-label="Your Online Pirate Name"
                        className="flex-1 px-4 py-2.5 rounded-xl bg-black/60 border border-amber-500/35 text-base font-bold text-amber-100"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => onCreateOnlineRoom(onlineName, onlineAvatar)}
                      className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-base sm:text-lg transition-colors cursor-pointer"
                    >
                      {lang === 'bn' ? 'নতুন অনলাইন রুম তৈরি করুন' : 'Create New Online Room'}
                    </button>
                  </div>

                  {/* Join by Room Code */}
                  <div className="p-5 rounded-xl bg-black/45 border border-amber-500/25 space-y-4">
                    <h3 className="text-base sm:text-lg font-extrabold text-amber-300">
                      {lang === 'bn' ? '২. বন্ধুর রুমে যোগ দিন' : '2. Join Friend’s Room by Code'}
                    </h3>
                    <input
                      type="text"
                      maxLength={6}
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder={
                        lang === 'bn'
                          ? '৬-অক্ষরের রুম কোড (যেমন AB92CD)'
                          : 'Enter 6-character code'
                      }
                      aria-label="Room Code"
                      className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-amber-500/35 font-mono-num uppercase tracking-widest text-base font-bold text-amber-200"
                    />
                    <button
                      type="button"
                      disabled={joinCode.trim().length < 4}
                      onClick={() => onJoinOnlineRoom(joinCode, onlineName, onlineAvatar)}
                      className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-extrabold text-base sm:text-lg transition-colors cursor-pointer"
                    >
                      {lang === 'bn' ? 'রুমে যোগ দিন (Join Room)' : 'Join Room'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Inside Online Room Lobby */
                <div className="p-5 rounded-xl bg-black/45 border border-amber-500/30 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-amber-500/20">
                    <div>
                      <span className="text-sm text-amber-200/80">
                        {lang === 'bn'
                          ? 'রুম কোড (বন্ধুদের শেয়ার করুন):'
                          : 'Room Code (Share with friends):'}
                      </span>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-2xl sm:text-3xl font-mono-num font-extrabold tracking-widest text-amber-300">
                          {onlineRoom.code}
                        </span>
                        <button
                          type="button"
                          onClick={copyRoomCode}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-900/45 hover:bg-amber-800/65 text-sm font-bold text-amber-200 cursor-pointer"
                        >
                          {copiedCode ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                          <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {onlineRoom.hostPlayerId === localPlayerId &&
                        teamTemplates.length > 0 && (
                          <>
                            <button
                              type="button"
                              onClick={onBalanceOnlineTeams}
                              className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/45 text-xs sm:text-sm font-bold text-amber-200 flex items-center gap-1.5 cursor-pointer"
                            >
                              <Scale className="w-4 h-4" />
                              <span>{lang === 'bn' ? 'ব্যালেন্স' : 'Balance'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={onRandomizeOnlineTeams}
                              className="px-3 py-2 rounded-xl bg-purple-900/55 hover:bg-purple-800/75 border border-purple-400/35 text-xs sm:text-sm font-bold text-purple-100 flex items-center gap-1.5 cursor-pointer"
                            >
                              <Shuffle className="w-4 h-4" />
                              <span>{lang === 'bn' ? 'র‍্যান্ডম' : 'Randomize'}</span>
                            </button>
                          </>
                        )}

                      {onlineRoom.hostPlayerId === localPlayerId &&
                        onlineRoom.players.length < modeDef.maxPlayers && (
                          <button
                            type="button"
                            onClick={() => onAddOnlineBot('medium')}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-900/55 hover:bg-purple-800/75 border border-purple-400/35 text-xs sm:text-sm font-bold text-purple-100 cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                            <span>
                              {lang === 'bn' ? 'এআই বট যোগ করুন' : 'Add AI Bot Seat'}
                            </span>
                          </button>
                        )}
                    </div>
                  </div>

                  {/* Validation warning for online room */}
                  {!onlineValidation.valid && (
                    <div className="p-3 rounded-xl bg-amber-950/75 border border-amber-500/45 text-xs sm:text-sm text-amber-200 font-bold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        {lang === 'bn'
                          ? onlineValidation.reasonBn
                          : onlineValidation.reasonEn}
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {onlineRoom.players.map((p, idx) => (
                      <div
                        key={p.id}
                        className="p-3.5 rounded-xl bg-black/55 border border-amber-500/25 flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{p.avatar}</span>
                            <div>
                              <div className="text-base font-extrabold text-amber-100 flex items-center gap-2">
                                <span>{p.name}</span>
                                {p.id === onlineRoom.hostPlayerId && (
                                  <span className="text-xs text-amber-400 font-mono-num">
                                    [HOST]
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-amber-200/75 flex items-center gap-2">
                                <span>
                                  {p.isAI
                                    ? `AI Bot (${p.aiDifficulty ?? 'medium'})`
                                    : p.connected !== false
                                    ? lang === 'bn'
                                      ? 'সংযুক্ত (Connected)'
                                      : 'Connected'
                                    : 'Reconnecting...'}
                                </span>
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                    p.ready !== false
                                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                                      : 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                                  }`}
                                >
                                  {p.ready !== false
                                    ? lang === 'bn'
                                      ? '✓ প্রস্তুত'
                                      : '✓ Ready'
                                    : lang === 'bn'
                                    ? 'অপেক্ষমাণ'
                                    : 'Not Ready'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {p.id === localPlayerId && (
                              <button
                                type="button"
                                onClick={onToggleOnlineReady}
                                className="px-2.5 py-1 rounded-lg bg-emerald-900/50 hover:bg-emerald-800/70 border border-emerald-400/40 text-xs font-bold text-emerald-200 cursor-pointer"
                              >
                                {p.ready !== false
                                  ? lang === 'bn'
                                    ? 'প্রস্তুত ✓'
                                    : 'Ready ✓'
                                  : lang === 'bn'
                                  ? 'প্রস্তুত হন'
                                  : 'Set Ready'}
                              </button>
                            )}

                            {onlineRoom.hostPlayerId === localPlayerId &&
                              p.id !== localPlayerId &&
                              idx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => onRemoveOnlinePlayer(p.id)}
                                  aria-label={`Remove ${p.name}`}
                                  className="p-2 rounded-lg text-red-400 hover:bg-red-950/60 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                          </div>
                        </div>

                        {/* Team assignment pills in online room */}
                        {teamTemplates.length > 0 && (
                          <div className="pt-1.5 border-t border-amber-500/15 flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-xs text-amber-200/80 font-bold">
                              {lang === 'bn' ? 'দল:' : 'Team:'}
                            </span>
                            <div className="flex items-center gap-1 flex-wrap">
                              {teamTemplates.map((t) => {
                                const isCurrent = p.teamId === t.id;
                                const isHost = onlineRoom.hostPlayerId === localPlayerId;
                                return (
                                  <button
                                    key={t.id}
                                    type="button"
                                    disabled={!isHost}
                                    onClick={() => onAssignOnlineTeam(p.id, t.id)}
                                    className={`px-2 py-0.5 rounded border text-[11px] font-bold transition-all cursor-pointer disabled:cursor-default ${getTeamBadgeColors(
                                      t.color,
                                      isCurrent
                                    )}`}
                                  >
                                    {t.id === 'team_captain' ? '👑 ' : '⚓ '}
                                    {lang === 'bn' ? t.nameBn : t.nameEn}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm sm:text-base font-semibold text-amber-200/85">
                      {onlineRoom.players.length} / {modeDef.maxPlayers}{' '}
                      {lang === 'bn' ? 'জন খেলোয়াড় প্রস্তুত' : 'Pirates in Room'}
                    </span>

                    {onlineRoom.hostPlayerId === localPlayerId ? (
                      <button
                        type="button"
                        disabled={!onlineValidation.valid}
                        onClick={onStartOnlineGame}
                        className="px-7 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-extrabold text-base sm:text-lg cursor-pointer"
                      >
                        {lang === 'bn'
                          ? 'অনলাইন ম্যাচ শুরু করুন!'
                          : 'Start Online Match!'}
                      </button>
                    ) : (
                      <span className="text-sm sm:text-base text-amber-300 font-bold">
                        {lang === 'bn'
                          ? 'হোস্ট খেলা শুরু করার জন্য অপেক্ষা করা হচ্ছে...'
                          : 'Waiting for the room host to start the match...'}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
