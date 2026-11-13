import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Crown,
  Flame,
  HelpCircle,
  History,
  Info,
  Pause,
  RefreshCw,
  RotateCcw,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Target,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CHARACTERS, CHARACTER_LIST, COIN_ASSET_URL } from '../game/cards';
import { getPlayableCardUids, getValidTargetIds, mustPlayCaptain } from '../game/engine';
import { areTeammates, getModeConfig, getPlayerTeam } from '../game/modes';
import { CardValue, GameLogEntry, GameState, Language, PlayCardAction } from '../game/types';
import { PirateCard } from './PirateCard';

interface GameTableProps {
  state: GameState;
  viewerPlayerId: string;
  isHost: boolean;
  language: Language;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onToggleLanguage: () => void;
  onPlayCardAction: (action: PlayCardAction) => void;
  onOpenGuide: (val?: CardValue) => void;
  onOpenHowToPlay: () => void;
  onOpenPause: () => void;
  onRequestRestart: () => void;
  onRequestRefresh: () => void;
  onlineRoomCode?: string | null;
}

/**
 * Formats log entries into concise, scannable descriptions for the compact Event Feed & Mobile Notification Bar.
 */
function formatConciseLogText(entry: GameLogEntry, language: Language): string {
  const raw = language === 'bn' ? entry.textBn : entry.textEn;
  if (entry.type === 'round_start' && raw.length > 78) {
    return language === 'bn'
      ? `⚓ রাউন্ড ${entry.round} শুরু — ১টি গোপন কার্ড সরিয়ে সবাইকে ১টি করে কার্ড দেওয়া হয়েছে।`
      : `⚓ Round ${entry.round} started — 1 secret card set aside & 1 card dealt to each pirate.`;
  }
  return raw;
}

/**
 * Shortens player names on ultra-compact mobile opponent pills while keeping full identity clear.
 */
function formatShortName(name: string): string {
  return name.replace(/\s*\(You\)/i, '').replace(/\s*\(AI\)/i, '');
}

export const GameTable: React.FC<GameTableProps> = ({
  state,
  viewerPlayerId,
  isHost,
  language,
  soundEnabled,
  onToggleSound,
  onToggleLanguage,
  onPlayCardAction,
  onOpenGuide,
  onOpenHowToPlay,
  onOpenPause,
  onRequestRestart,
  onRequestRefresh,
  onlineRoomCode,
}) => {
  const activePlayer = state.players[state.activePlayerIndex];
  const isViewerTurn =
    state.phase === 'choosing_action' &&
    activePlayer &&
    activePlayer.id === viewerPlayerId &&
    !activePlayer.isEliminated;

  const viewerPlayer =
    state.players.find((p) => p.id === viewerPlayerId) ?? state.players[0];

  const [selectedCardUid, setSelectedCardUid] = useState<string | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [selectedGuessValue, setSelectedGuessValue] = useState<CardValue | null>(null);
  const [showFullDiscardModal, setShowFullDiscardModal] = useState(false);
  const [showFullHistoryModal, setShowFullHistoryModal] = useState(false);

  // Auto-select first legal card when viewer's turn begins
  useEffect(() => {
    if (isViewerTurn && viewerPlayer.hand.length > 0) {
      const playable = getPlayableCardUids(viewerPlayer.hand);
      const defaultUid = playable[0] ?? viewerPlayer.hand[0].uid;
      setSelectedCardUid(defaultUid);
      setSelectedTargetId(null);
      setSelectedGuessValue(null);
    } else {
      setSelectedCardUid(null);
      setSelectedTargetId(null);
      setSelectedGuessValue(null);
    }
  }, [isViewerTurn, state.turnNumber, viewerPlayer.id, viewerPlayer.hand.length]);

  const playableUids = isViewerTurn ? getPlayableCardUids(viewerPlayer.hand) : [];
  const captainForced = isViewerTurn && mustPlayCaptain(viewerPlayer.hand);

  const selectedCard = viewerPlayer.hand.find((c) => c.uid === selectedCardUid) ?? null;
  const selectedCharDef = selectedCard ? CHARACTERS[selectedCard.value] : null;

  const validTargetIds =
    isViewerTurn && selectedCard
      ? getValidTargetIds(state, viewerPlayer.id, selectedCard.value)
      : [];

  // Auto-select target if only 1 valid target exists, or first valid target for convenience
  useEffect(() => {
    if (
      validTargetIds.length > 0 &&
      (!selectedTargetId || !validTargetIds.includes(selectedTargetId))
    ) {
      setSelectedTargetId(validTargetIds[0]);
    } else if (validTargetIds.length === 0) {
      setSelectedTargetId(null);
    }
  }, [selectedCard?.uid, validTargetIds.join(',')]);

  // Auto-select a default valid guess (5 Cannon Operator) when Guard (1) is selected
  useEffect(() => {
    if (selectedCard?.value === 1 && selectedGuessValue === null) {
      setSelectedGuessValue(5);
    } else if (selectedCard?.value !== 1) {
      setSelectedGuessValue(null);
    }
  }, [selectedCard?.uid, selectedCard?.value]);

  const canConfirmPlay = (): boolean => {
    if (!isViewerTurn || !selectedCard) return false;
    if (!playableUids.includes(selectedCard.uid)) return false;
    if (validTargetIds.length > 0 && !selectedTargetId) return false;
    if (selectedCard.value === 1 && validTargetIds.length > 0 && selectedGuessValue === null) {
      return false;
    }
    return true;
  };

  const handleConfirmPlay = () => {
    if (!canConfirmPlay() || !selectedCard) return;
    onPlayCardAction({
      playerId: viewerPlayer.id,
      cardUid: selectedCard.uid,
      targetPlayerId: selectedTargetId ?? undefined,
      guessedValue: selectedGuessValue ?? undefined,
    });
  };

  // Keyboard shortcuts for selecting cards (1 / 2) and confirming play (Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === '1' && isViewerTurn && viewerPlayer.hand[0]) {
        const uid = viewerPlayer.hand[0].uid;
        if (playableUids.includes(uid)) setSelectedCardUid(uid);
      } else if (e.key === '2' && isViewerTurn && viewerPlayer.hand[1]) {
        const uid = viewerPlayer.hand[1].uid;
        if (playableUids.includes(uid)) setSelectedCardUid(uid);
      } else if (e.key === 'Enter' && isViewerTurn) {
        e.preventDefault();
        handleConfirmPlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isViewerTurn,
    viewerPlayer.hand,
    playableUids,
    selectedCard,
    selectedTargetId,
    selectedGuessValue,
  ]);

  const opponents = state.players.filter((p) => p.id !== viewerPlayer.id);
  const latestFourLogs = [...state.logs].slice(-4).reverse();
  const latestLogEntry = latestFourLogs[0] ?? null;
  const fullHistoryLogs = [...state.logs].reverse();

  // Desktop opponent grid columns
  const desktopOppGridCols =
    opponents.length === 1
      ? 'lg:grid-cols-1 lg:max-w-2xl lg:mx-auto'
      : opponents.length === 2
      ? 'lg:grid-cols-2'
      : opponents.length === 3
      ? 'lg:grid-cols-3'
      : opponents.length === 4
      ? 'lg:grid-cols-4'
      : 'lg:grid-cols-5';

  // Whether Guard (#1) with active target choices is currently open on mobile
  const isGuardChoicesOpen =
    isViewerTurn && selectedCard?.value === 1 && validTargetIds.length > 0;

  return (
    <div className="h-dvh max-h-dvh w-full wood-deck-bg safe-area-shell flex flex-col justify-between select-none overflow-hidden">
      {/* =====================================================================
          1. COMPACT TOP HEADER (Mobile & Desktop)
         ===================================================================== */}
      <header className="w-full bg-[#150d08]/95 border-b border-[#d4af37]/40 z-20 shrink-0">
        <div className="w-full max-w-[98vw] mx-auto px-2 sm:px-4 lg:px-7 py-1.5 sm:py-2 flex items-center justify-between gap-1.5 sm:gap-3">
          {/* Left: Game Logo, Title, Current Round & Coin Target */}
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <img
                src={COIN_ASSET_URL}
                alt="Pirate Coin"
                referrerPolicy="no-referrer"
                className="w-5 h-5 sm:w-7 sm:h-7 object-contain"
              />
              <span className="text-sm sm:text-xl lg:text-2xl font-extrabold text-amber-300 tracking-tight whitespace-nowrap">
                জলদস্যু
              </span>
            </div>

            <div className="flex items-center gap-1 sm:gap-2.5 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-black/55 border border-[#d4af37]/30 text-[11px] sm:text-sm font-mono-num text-amber-100 shrink-0 whitespace-nowrap">
              <span
                data-testid="hud-active-mode-badge"
                className="text-amber-300 font-extrabold"
              >
                {getModeConfig(state.settings.matchMode).badgeEmoji}{' '}
                <span className="hidden xs:inline">
                  {language === 'bn'
                    ? getModeConfig(state.settings.matchMode).nameBn
                    : getModeConfig(state.settings.matchMode).nameEn}
                </span>
              </span>
              <span aria-hidden="true" className="text-[#d4af37]/40">
                ·
              </span>
              <span title={language === 'bn' ? 'বর্তমান রাউন্ড' : 'Current Round'}>
                <strong className="text-amber-400">
                  {language === 'bn' ? 'রাঃ' : 'R'}
                </strong>{' '}
                {state.round}/{state.settings.maxRounds}
              </span>
              <span aria-hidden="true" className="text-[#d4af37]/40">
                ·
              </span>
              <span
                className="inline-flex items-center gap-0.5 sm:gap-1"
                title={language === 'bn' ? 'জয়ের লক্ষ্য' : 'Target Coins'}
              >
                <img
                  src={COIN_ASSET_URL}
                  alt="Target Coin"
                  referrerPolicy="no-referrer"
                  className="w-3 h-3 sm:w-3.5 sm:h-3.5 object-contain"
                />
                <span>
                  {state.settings.targetCoins}
                  <span className="hidden md:inline">
                    {' '}
                    {language === 'bn' ? 'কয়েন' : 'Coins'}
                  </span>
                </span>
              </span>
              {onlineRoomCode && (
                <>
                  <span aria-hidden="true" className="text-[#d4af37]/40 hidden sm:inline">
                    ·
                  </span>
                  <span className="text-emerald-300 font-bold hidden sm:inline">
                    {onlineRoomCode}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Center: Active Turn Status Banner (Desktop & Tablet) */}
          <div
            aria-live="polite"
            className={`hidden md:flex px-3.5 py-1 rounded-xl border text-xs lg:text-sm font-extrabold items-center gap-2 shrink-0 ${
              isViewerTurn
                ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-[0_6px_18px_rgba(245,158,11,0.18)]'
                : 'bg-[#0b2621]/90 border-[#d4af37]/40 text-amber-100'
            }`}
          >
            <span className="text-base lg:text-lg">{activePlayer?.avatar}</span>
            <span>
              {isViewerTurn
                ? language === 'bn'
                  ? `আপনার টার্ন (${viewerPlayer.name}) — ১টি কার্ড খেলুন`
                  : `Your Turn (${viewerPlayer.name}) — Choose a Card`
                : language === 'bn'
                ? `এখন টার্ন: ${activePlayer?.name}...`
                : `Current Turn: ${activePlayer?.name}...`}
            </span>
          </div>

          {/* Right: Compact Touch-Optimized Utility Controls */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleLanguage();
              }}
              aria-label="Toggle Language"
              className="h-8 sm:h-9 px-2 sm:px-3 rounded-lg sm:rounded-xl bg-black/65 hover:bg-amber-900/50 active:scale-95 border border-[#d4af37]/45 text-[11px] sm:text-sm font-bold text-amber-200 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {language === 'bn' ? 'EN' : 'বাং'}
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenGuide();
              }}
              aria-label="Character Guide [G]"
              title="Character Guide [G]"
              className="h-8 w-8 sm:h-9 sm:w-auto flex items-center justify-center gap-1.5 sm:px-3 rounded-lg sm:rounded-xl bg-black/65 hover:bg-amber-900/50 active:scale-95 border border-[#d4af37]/45 text-xs sm:text-sm font-bold text-amber-200 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">
                {language === 'bn' ? 'গাইড' : 'Guide'}
              </span>
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenHowToPlay();
              }}
              aria-label="How to Play"
              title="How to Play"
              className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl bg-black/65 hover:bg-amber-900/50 active:scale-95 border border-[#d4af37]/45 text-amber-200 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleSound();
              }}
              aria-label={soundEnabled ? 'Mute Audio [M]' : 'Unmute Audio [M]'}
              title="Mute / Unmute [M]"
              className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-lg sm:rounded-xl bg-black/65 hover:bg-amber-900/50 active:scale-95 border border-[#d4af37]/45 text-amber-200 cursor-pointer"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
              )}
            </button>

            {/* HOST-ONLY REFRESH & RESTART CONTROLS — Strictly hidden from Guest players.
                On mobile phones (<sm), these are accessible inside the Pause Menu to keep the 4-button mobile header uncluttered. */}
            {isHost && (
              <>
                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="btn-refresh-game"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onRequestRefresh();
                  }}
                  aria-label="Refresh Game"
                  title={
                    language === 'bn'
                      ? 'খেলা রিফ্রেশ করুন (শুধুমাত্র হোস্ট)'
                      : 'Refresh / Reinitialize Game (Host Only)'
                  }
                  className="hidden sm:flex h-9 items-center justify-center gap-1 px-2.5 sm:px-3 rounded-xl bg-[#0e2e28]/90 hover:bg-[#154239] active:scale-95 border border-[#d4af37]/45 text-xs sm:text-sm font-bold text-emerald-200 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-emerald-300" />
                  <span className="hidden xl:inline">
                    {language === 'bn' ? 'রিফ্রেশ' : 'Refresh'}
                  </span>
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="btn-restart-match"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onRequestRestart();
                  }}
                  aria-label="Restart Match [R]"
                  title={
                    language === 'bn'
                      ? 'ম্যাচ পুনরায় শুরু করুন [R] (শুধুমাত্র হোস্ট)'
                      : 'Restart Match [R] (Host Only)'
                  }
                  className="hidden sm:flex h-9 items-center justify-center gap-1 px-2.5 sm:px-3 rounded-xl bg-amber-950/75 hover:bg-amber-900/70 active:scale-95 border border-[#d4af37]/50 text-xs sm:text-sm font-bold text-amber-200 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-amber-300" />
                  <span className="hidden xl:inline">
                    {language === 'bn' ? 'রিস্টার্ট [R]' : 'Restart [R]'}
                  </span>
                </button>
              </>
            )}

            <button
              type="button"
              tabIndex={-1}
              data-testid="btn-pause-menu"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenPause();
              }}
              aria-label="Pause Game [P]"
              title="Pause Game [P / Esc]"
              className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-lg sm:rounded-xl bg-black/65 hover:bg-amber-900/50 active:scale-95 border border-[#d4af37]/45 text-amber-200 cursor-pointer"
            >
              <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================================
          MAIN PLAYFIELD — Fits 100% within visible viewport without vertical scroll
         ===================================================================== */}
      <div className="flex-1 min-h-0 w-full max-w-[98vw] mx-auto px-2 sm:px-4 lg:px-7 py-1 sm:py-2 flex flex-col justify-between gap-1 sm:gap-2 overflow-hidden">
        {/* ===================================================================
            1B. MODE-SPECIFIC SCOREBOARD / PROGRESS STRIP (Duo, Trio, Captain, Race)
           =================================================================== */}
        {(state.settings.matchMode === 'duo' || state.settings.matchMode === 'trio') &&
          state.teams.length > 0 && (
            <div
              data-testid="mode-hud-banner"
              className={`grid ${
                state.teams.length === 3 ? 'grid-cols-3' : 'grid-cols-2'
              } gap-1.5 sm:gap-2.5 shrink-0`}
            >
              {state.teams.map((team) => {
                const isViewerTeam = viewerPlayer.teamId === team.id;
                const members = state.players.filter((p) => p.teamId === team.id);
                const aliveCount = members.filter((m) => !m.isEliminated).length;
                const colorBorder =
                  team.color === 'crimson'
                    ? 'border-red-400/75 bg-red-950/55'
                    : team.color === 'sapphire'
                    ? 'border-sky-400/75 bg-sky-950/55'
                    : 'border-emerald-400/75 bg-emerald-950/55';

                return (
                  <div
                    key={team.id}
                    data-testid={`team-hud-${team.id}`}
                    className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl border ${colorBorder} flex items-center justify-between gap-1.5`}
                  >
                    <div className="min-w-0 flex items-center gap-1.5">
                      <span className="text-xs sm:text-sm font-extrabold text-amber-100 truncate">
                        {language === 'bn' ? team.nameBn : team.nameEn}
                      </span>
                      {isViewerTeam && (
                        <span className="px-1 py-0.2 rounded bg-amber-500 text-slate-950 text-[9px] sm:text-[10px] font-extrabold shrink-0">
                          {language === 'bn' ? 'আপনার দল' : 'ALLY'}
                        </span>
                      )}
                      <span className="hidden md:inline text-[11px] text-amber-200/80 truncate">
                        ({aliveCount}/{members.length}{' '}
                        {language === 'bn' ? 'জীবিত' : 'alive'})
                      </span>
                    </div>

                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-black/65 border border-[#d4af37]/40 font-mono-num text-[11px] sm:text-xs font-extrabold text-amber-300 shrink-0">
                      <img
                        src={COIN_ASSET_URL}
                        alt="Team Coin"
                        referrerPolicy="no-referrer"
                        className="w-3 h-3 sm:w-3.5 sm:h-3.5 object-contain"
                      />
                      <span>
                        {team.coins}/{state.settings.targetCoins}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        {state.settings.matchMode === 'captain' && state.teams.length >= 2 && (
          <div
            data-testid="mode-hud-banner"
            className="grid grid-cols-2 gap-1.5 sm:gap-3 shrink-0"
          >
            {(() => {
              const capTeam = state.teams.find((t) => t.id === 'team_captain');
              const chalTeam = state.teams.find((t) => t.id === 'team_challengers');
              const capPlayer = state.players.find((p) => p.teamId === 'team_captain');
              const chalAlive = state.players.filter(
                (p) => p.teamId === 'team_challengers' && !p.isEliminated
              ).length;

              return (
                <>
                  <div
                    data-testid="captain-hud-panel"
                    className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-xl bg-gradient-to-r from-amber-950/85 to-[#1f130a] border-2 border-amber-400 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex items-center gap-1.5">
                      <span className="text-sm sm:text-base">👑</span>
                      <div className="min-w-0">
                        <div className="text-[11px] sm:text-xs font-extrabold text-amber-300 truncate">
                          {language === 'bn'
                            ? `ক্যাপ্টেন: ${formatShortName(capPlayer?.name ?? '')}`
                            : `Captain: ${formatShortName(capPlayer?.name ?? '')}`}
                        </div>
                      </div>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-black/65 border border-amber-400/50 font-mono-num text-[11px] sm:text-xs font-extrabold text-amber-300 shrink-0">
                      🪙 {capTeam?.coins ?? capPlayer?.coins ?? 0}/
                      {state.settings.targetCoins}
                    </span>
                  </div>

                  <div
                    data-testid="challengers-hud-panel"
                    className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-xl bg-red-950/65 border border-red-400/75 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex items-center gap-1.5">
                      <span className="text-sm sm:text-base">⚔️</span>
                      <span className="text-[11px] sm:text-xs font-extrabold text-red-100 truncate">
                        {language === 'bn'
                          ? `৩ চ্যালেঞ্জার (${chalAlive}/৩ জীবিত)`
                          : `3 Challengers (${chalAlive}/3 alive)`}
                      </span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-black/65 border border-red-400/50 font-mono-num text-[11px] sm:text-xs font-extrabold text-amber-300 shrink-0">
                      🪙 {chalTeam?.coins ?? 0}/{state.settings.targetCoins}
                    </span>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {state.settings.matchMode === 'race' && (
          <div
            data-testid="mode-hud-banner"
            className="px-2 py-1 sm:px-3.5 sm:py-1.5 rounded-xl bg-[#1a1109]/95 border border-amber-400/60 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0"
          >
            <span className="text-[10px] sm:text-xs font-extrabold text-amber-300 shrink-0">
              🏁 <span className="hidden sm:inline">{language === 'bn' ? 'ট্রেজার রাশ:' : 'Treasure Rush:'}</span>
            </span>
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 justify-start sm:justify-end">
              {state.players.map((rp) => {
                const dist = Math.max(0, state.settings.targetCoins - rp.coins);
                const pct = Math.min(
                  100,
                  Math.round((rp.coins / Math.max(1, state.settings.targetCoins)) * 100)
                );
                return (
                  <div
                    key={rp.id}
                    className="flex items-center gap-1 min-w-[68px] sm:min-w-[110px] shrink-0"
                  >
                    <span className="text-xs">{rp.avatar}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 text-[9px] sm:text-[10px] font-mono-num font-bold text-amber-200">
                        <span className="truncate max-w-[38px] sm:max-w-[65px]">
                          {formatShortName(rp.name)}
                        </span>
                        <span className="text-amber-400 shrink-0">
                          {language === 'bn' ? `-${dist}` : `-${dist}`}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-black/70 border border-amber-500/35 overflow-hidden">
                        <div
                          className="h-full bg-amber-400 transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================================
            2. COMPACT HORIZONTAL OPPONENT DISPLAY
            On mobile/tablet: single horizontal row of compact opponent pills.
            On desktop (lg+): full ornate 2D opponent cards.
           =================================================================== */}
        <section
          className={`grid grid-flow-col auto-cols-fr lg:grid-flow-row ${desktopOppGridCols} gap-1.5 sm:gap-2.5 w-full shrink-0 overflow-x-auto no-scrollbar`}
          aria-label="Opponents"
        >
          {opponents.map((opp) => {
            const isOppTurn =
              state.players[state.activePlayerIndex]?.id === opp.id && !opp.isEliminated;
            const isValidTarget = validTargetIds.includes(opp.id);
            const isTargeted = selectedTargetId === opp.id;
            const isOppHost = state.hostPlayerId === opp.id;
            const lastDiscard = opp.discards[opp.discards.length - 1];
            const isAlly = areTeammates(state, viewerPlayer.id, opp.id);
            const oppTeam = getPlayerTeam(state, opp.id);
            const distToWin = Math.max(0, state.settings.targetCoins - opp.coins);

            return (
              <div
                key={opp.id}
                onClick={() => {
                  if (isValidTarget) setSelectedTargetId(opp.id);
                }}
                role={isValidTarget ? 'button' : undefined}
                tabIndex={isValidTarget ? 0 : undefined}
                onKeyDown={(e) => {
                  if (isValidTarget && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    setSelectedTargetId(opp.id);
                  }
                }}
                aria-label={`Opponent ${opp.name} - ${opp.coins} coins`}
                className={`min-w-[104px] px-2 py-1 sm:px-3 sm:py-2 rounded-xl sm:rounded-2xl border-2 transition-all duration-150 flex items-center justify-between gap-1.5 sm:gap-2.5 ${
                  opp.isEliminated
                    ? 'bg-[#140d09]/75 border-red-900/50 opacity-60'
                    : isTargeted
                    ? 'bg-gradient-to-r from-[#2e1d0f] to-[#133830] border-amber-400 ring-2 ring-amber-400/80 shadow-md cursor-pointer active:scale-95'
                    : isValidTarget
                    ? 'bg-[#21150e]/95 border-[#d4af37]/75 hover:border-amber-300 cursor-pointer active:scale-95'
                    : isOppTurn
                    ? 'bg-gradient-to-r from-[#2b1a10] to-[#102e27] border-amber-400 shadow-md'
                    : opp.role === 'captain'
                    ? 'bg-gradient-to-r from-[#2e1c0a] to-[#1c120c] border-amber-400/85'
                    : 'bg-[#1c120c]/95 border-[#d4af37]/35'
                }`}
              >
                {/* Left Info: Small Portrait, Short Name, Coin Count, Status */}
                <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1">
                  <div className="relative shrink-0">
                    <div
                      className={`w-8 h-8 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl flex items-center justify-center text-base sm:text-2xl shadow-inner ${
                        opp.isEliminated
                          ? 'bg-red-950/50 border border-red-800/60'
                          : isOppTurn
                          ? 'bg-gradient-to-b from-amber-500/30 to-[#140c07] border border-amber-400'
                          : 'bg-gradient-to-b from-[#2f1e13] to-[#140c07] border border-[#d4af37]/65'
                      }`}
                    >
                      {opp.isEliminated ? '💀' : opp.avatar}
                    </div>

                    {isOppHost && (
                      <span
                        title={language === 'bn' ? 'রুম হোস্ট (Host)' : 'Room Host'}
                        className="absolute -top-1 -left-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-amber-500 text-slate-950 border border-amber-200 flex items-center justify-center shadow"
                      >
                        <Crown className="w-2.5 h-2.5" />
                      </span>
                    )}

                    {opp.isProtected && !opp.isEliminated && (
                      <span
                        title={
                          language === 'bn'
                            ? 'গুপ্তচর (৪) দ্বারা সুরক্ষিত'
                            : 'Protected by Spy (4)'
                        }
                        className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-600 border border-amber-200 flex items-center justify-center text-white shadow"
                      >
                        <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </span>
                    )}
                  </div>

                  {/* Short Player Name, Coin Count & Status */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="font-extrabold text-xs sm:text-sm lg:text-base text-amber-100 leading-tight truncate">
                        {formatShortName(opp.name)}
                      </span>
                      {opp.role === 'captain' && (
                        <span className="px-1 py-0.2 rounded bg-amber-500 text-slate-950 text-[9px] font-extrabold shrink-0">
                          👑
                        </span>
                      )}
                      {(state.settings.matchMode === 'duo' ||
                        state.settings.matchMode === 'trio' ||
                        state.settings.matchMode === 'captain') &&
                        oppTeam && (
                          <span
                            className={`px-1 py-0.2 rounded text-[9px] font-extrabold shrink-0 ${
                              isAlly
                                ? 'bg-emerald-700 text-emerald-50'
                                : 'bg-red-900/80 text-red-100'
                            }`}
                          >
                            {isAlly
                              ? language === 'bn'
                                ? 'সঙ্গী'
                                : 'Ally'
                              : language === 'bn'
                              ? 'শত্রু'
                              : 'Rival'}
                          </span>
                        )}
                      {isTargeted && (
                        <Target className="w-3 h-3 text-amber-400 shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs text-amber-200/95 font-mono-num mt-0.5 flex-wrap">
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-black/55 border border-[#d4af37]/35 font-extrabold text-amber-300">
                        <img
                          src={COIN_ASSET_URL}
                          alt="Coin"
                          referrerPolicy="no-referrer"
                          className="w-3 h-3 object-contain"
                        />
                        {opp.coins}/{state.settings.targetCoins}
                      </span>

                      {state.settings.matchMode === 'race' && (
                        <span className="text-[10px] text-amber-300 font-bold">
                          ({language === 'bn' ? `বাকি ${distToWin}` : `${distToWin} left`})
                        </span>
                      )}

                      {/* Mobile remaining card & status badge */}
                      {opp.isEliminated ? (
                        <span className="text-red-400 font-bold text-[10px] sm:text-xs">
                          {language === 'bn' ? 'আউট' : 'Out'}
                        </span>
                      ) : opp.isProtected ? (
                        <span className="text-emerald-300 font-bold text-[10px] sm:text-xs">
                          🛡️
                        </span>
                      ) : opp.pendingPickpocket ? (
                        <span className="text-purple-300 font-bold text-[10px] sm:text-xs">
                          🗝️
                        </span>
                      ) : (
                        <span className="text-amber-100/80 text-[10px] sm:text-xs">
                          🃏{opp.hand.length}
                        </span>
                      )}

                      {isOppTurn && (
                        <span className="px-1 py-0.2 rounded bg-amber-500/30 border border-amber-400 text-[10px] font-extrabold text-amber-200">
                          ⚡
                        </span>
                      )}
                    </div>

                    {/* Desktop Public Discards Row */}
                    <div className="hidden lg:flex items-center gap-1 flex-wrap mt-1">
                      <span className="text-[11px] text-amber-200/70 font-semibold">
                        {language === 'bn' ? 'খেলেছে:' : 'Played:'}
                      </span>
                      {opp.discards.length === 0 ? (
                        <span className="text-[11px] text-amber-200/45">—</span>
                      ) : (
                        opp.discards.slice(-3).map((dc) => (
                          <button
                            key={dc.uid}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenGuide(dc.value);
                            }}
                            className="px-1.5 py-0.2 rounded bg-black/70 border border-[#d4af37]/35 font-mono-num text-[11px] font-bold text-amber-200 hover:border-amber-300 cursor-pointer"
                          >
                            #{dc.value}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Desktop Secret Card Back / Mobile Last Played Badge */}
                <div className="hidden lg:flex items-center gap-1 shrink-0">
                  {opp.isEliminated ? (
                    <div className="w-12 h-18 rounded-xl border border-red-500/35 bg-red-950/35 flex items-center justify-center text-red-400">
                      <Skull className="w-5 h-5" />
                    </div>
                  ) : (
                    opp.hand.map((c) => (
                      <PirateCard
                        key={c.uid}
                        value={c.value}
                        faceDown
                        size="xs"
                        animationVariant="deal"
                      />
                    ))
                  )}
                </div>

                {lastDiscard && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenGuide(lastDiscard.value);
                    }}
                    title={
                      language === 'bn'
                        ? `সর্বশেষ খেলেছে: #${lastDiscard.value}`
                        : `Last played: #${lastDiscard.value}`
                    }
                    className="lg:hidden px-1.5 py-0.5 rounded bg-black/70 border border-[#d4af37]/40 font-mono-num text-[10px] font-extrabold text-amber-200 shrink-0"
                  >
                    #{lastDiscard.value}
                  </button>
                )}
              </div>
            );
          })}
        </section>

        {/* ===================================================================
            3. TINY LATEST-EVENT NOTIFICATION BAR + HISTORY BUTTON (Mobile/Tablet)
            Replaces the space-consuming turn log on mobile screens.
           =================================================================== */}
        <div
          data-testid="mobile-latest-event-bar"
          className={`${
            isGuardChoicesOpen ? 'hidden sm:flex lg:hidden' : 'flex lg:hidden'
          } w-full px-2.5 py-1 rounded-xl bg-[#1a100a]/95 border border-[#d4af37]/40 items-center justify-between gap-2 shrink-0`}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-mono-num text-[10px] font-extrabold shrink-0">
              {language === 'bn' ? `টার্ন #${state.turnNumber}` : `T#${state.turnNumber}`}
            </span>
            <span className="text-xs sm:text-sm text-amber-100 font-semibold truncate">
              {latestLogEntry
                ? formatConciseLogText(latestLogEntry, language)
                : language === 'bn'
                ? 'খেলা শুরু হয়েছে'
                : 'Match started'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowFullHistoryModal(true)}
            aria-label="Open Full Match History"
            className="min-h-[28px] px-2.5 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 active:scale-95 border border-[#d4af37]/55 text-[11px] sm:text-xs font-extrabold text-amber-200 flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-amber-300" />
            <span>{language === 'bn' ? 'ইতিহাস' : 'History'}</span>
          </button>
        </div>

        {/* ===================================================================
            4. CENTRAL GAME TABLE AREA (Deck, Secret Card, Played Cards & Desktop Event Feed)
           =================================================================== */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3 items-stretch shrink-0">
          {/* Center Table Surface (Full width on mobile, 7 cols on desktop) */}
          <div className="lg:col-span-7 cabin-wood-panel rounded-xl sm:rounded-2xl p-2 sm:p-3.5 flex flex-col justify-center gap-1.5 sm:gap-2.5 relative overflow-hidden">
            <div className="ocean-felt-well rounded-lg sm:rounded-xl px-2.5 py-1.5 sm:p-3.5 flex items-center justify-around gap-2 sm:gap-4">
              {/* Draw Deck & Secret Removed Card */}
              <div className="flex items-center gap-2.5 sm:gap-5">
                {/* Draw Deck */}
                <div className="flex items-center sm:flex-col gap-1.5 sm:gap-1.5">
                  <div className="relative">
                    <PirateCard
                      value={0}
                      faceDown
                      size="xxs"
                      className="sm:!w-24 sm:!h-36"
                    />
                    <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 px-1.5 sm:px-2 py-0.2 rounded-md bg-amber-500 text-slate-950 font-mono-num text-[11px] sm:text-sm font-extrabold shadow border border-amber-200">
                      {state.deck.length}
                    </div>
                  </div>
                  <div className="text-[11px] sm:text-sm font-extrabold text-amber-200 leading-tight">
                    <div>{language === 'bn' ? 'ড্র ডেক' : 'Deck'}</div>
                    <div className="text-[10px] sm:text-xs text-amber-300/80 font-mono-num">
                      {language === 'bn'
                        ? `${state.deck.length}টি বাকি`
                        : `${state.deck.length} left`}
                    </div>
                  </div>
                </div>

                {/* Secret Face-Down Removed Card */}
                {state.removedCard && (
                  <div className="flex items-center sm:flex-col gap-1.5">
                    <div className="relative opacity-95">
                      <PirateCard
                        value={0}
                        faceDown
                        size="xxs"
                        className="sm:!w-14 sm:!h-21"
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-amber-300 font-extrabold text-sm sm:text-lg bg-black/45 rounded-lg">
                        ?
                      </span>
                    </div>
                    <span className="hidden xs:inline text-[10px] sm:text-xs font-semibold text-amber-200/85 max-w-[72px] sm:max-w-[110px] leading-tight">
                      {language === 'bn' ? '১টি গোপন কার্ড' : '1 Secret Card'}
                    </span>
                  </div>
                )}
              </div>

              {/* Public Discard Pile & Currently Played Card */}
              <div className="flex items-center sm:flex-col gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {state.publicDiscardPile.length === 0 ? (
                    <div className="w-12 h-18 sm:w-24 sm:h-36 rounded-lg sm:rounded-xl border border-dashed border-[#d4af37]/45 bg-black/30 flex items-center justify-center text-[10px] sm:text-xs font-semibold text-amber-200/70 text-center p-1.5">
                      {language === 'bn' ? 'টেবিল খালি' : 'Empty'}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      {state.publicDiscardPile.slice(-2).map((entry, idx, arr) => {
                        const isLatest = idx === arr.length - 1;
                        return (
                          <PirateCard
                            key={entry.card.uid}
                            value={entry.card.value}
                            size={isLatest ? 'xs' : 'xxs'}
                            language={language}
                            animationVariant={isLatest ? 'slide-play' : 'discard'}
                            onInspect={(v) => onOpenGuide(v)}
                            className={`${
                              isLatest
                                ? 'sm:!w-24 sm:!h-36 ring-2 ring-amber-400 shadow-[0_8px_20px_rgba(245,158,11,0.35)]'
                                : 'hidden sm:block sm:!w-14 sm:!h-21 opacity-85'
                            }`}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-0.5 sm:gap-2">
                  <span className="text-[11px] sm:text-sm font-extrabold text-amber-200">
                    {language === 'bn'
                      ? `ব্যবহৃত (${state.publicDiscardPile.length})`
                      : `Played (${state.publicDiscardPile.length})`}
                  </span>
                  {state.publicDiscardPile.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowFullDiscardModal(true)}
                      className="text-[11px] sm:text-xs font-bold text-amber-400 hover:text-amber-200 underline cursor-pointer"
                    >
                      {language === 'bn' ? 'সব দেখুন' : 'View All'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Desktop Reward & Ability Effect Banner */}
            {state.lastAnimationEvent && (
              <div
                key={state.lastAnimationEvent.id}
                className="hidden lg:flex animate-ability-pop px-3.5 py-2 rounded-xl parchment-scroll-box items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-amber-500/20 border border-[#d4af37]/50 flex items-center justify-center shrink-0">
                    {state.lastAnimationEvent.type === 'cannon' ? (
                      <Flame className="w-4 h-4 text-orange-400" />
                    ) : state.lastAnimationEvent.type === 'duel' ? (
                      <Swords className="w-4 h-4 text-emerald-400" />
                    ) : state.lastAnimationEvent.type === 'spy' ? (
                      <Shield className="w-4 h-4 text-emerald-300" />
                    ) : state.lastAnimationEvent.type === 'coin' ? (
                      <img
                        src={COIN_ASSET_URL}
                        alt="Reward Coin"
                        referrerPolicy="no-referrer"
                        className="w-4 h-4 object-contain"
                      />
                    ) : (
                      <Sparkles className="w-4 h-4 text-amber-400" />
                    )}
                  </span>
                  <p className="text-xs sm:text-sm text-amber-100 font-semibold truncate">
                    {language === 'bn'
                      ? state.logs[state.logs.length - 1]?.textBn
                      : state.logs[state.logs.length - 1]?.textEn}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right (Desktop lg+ Only): Compact 4-Event Turn Feed + History Modal Button */}
          <div
            data-testid="compact-turn-log-feed"
            className="hidden lg:flex lg:col-span-5 cabin-wood-panel rounded-2xl p-3.5 flex-col justify-between"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#d4af37]/30 gap-2">
              <div className="flex items-center gap-2 text-base font-extrabold text-amber-300">
                <History className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {language === 'bn' ? 'সর্বশেষ ৪টি ঘটনা (Event Feed)' : 'Latest 4 Events'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono-num font-bold text-amber-200/80">
                  {language === 'bn' ? `টার্ন #${state.turnNumber}` : `Turn #${state.turnNumber}`}
                </span>
                <button
                  type="button"
                  data-testid="btn-open-history-modal"
                  onClick={() => setShowFullHistoryModal(true)}
                  aria-label="Open Full Match History"
                  className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 border border-[#d4af37]/55 text-xs font-extrabold text-amber-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <History className="w-3.5 h-3.5 text-amber-300" />
                  <span>{language === 'bn' ? 'ইতিহাস (History)' : 'History'}</span>
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-start gap-1.5 py-2">
              {latestFourLogs.map((entry, idx) => {
                const isNewest = idx === 0;
                return (
                  <div
                    key={entry.id}
                    data-testid={`compact-log-entry-${idx}`}
                    className={`px-3 py-1.5 rounded-xl border text-xs xl:text-sm leading-snug transition-all ${
                      isNewest
                        ? 'parchment-scroll-box text-amber-100 font-bold animate-ability-pop'
                        : 'bg-black/35 border-white/10 text-amber-100/85'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="line-clamp-2">{formatConciseLogText(entry, language)}</span>
                      {isNewest && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-mono-num text-[10px] font-extrabold shrink-0">
                          {language === 'bn' ? 'নতুন' : 'NEW'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===================================================================
            5 & 6. PLAYER HAND & ADAPTIVE ACTION PANEL
            Designed so the player's hand is always visible and the bottom action
            panel adapts to the selected card without ever requiring vertical scroll.
           =================================================================== */}
        <section className="flex-1 min-h-0 cabin-wood-panel rounded-xl sm:rounded-2xl p-1.5 sm:p-3 border-t-2 border-[#d4af37]/55 flex flex-col justify-between overflow-hidden">
          <div className="h-full flex flex-col justify-between lg:grid lg:grid-cols-12 gap-1 sm:gap-2.5 lg:gap-4 lg:items-center min-h-0">
            {/* Left (Desktop 3 cols) / Top Strip (Mobile): Compact Local Player Status */}
            <div className="lg:col-span-3 flex lg:flex-col items-center lg:items-stretch justify-between gap-1.5 sm:gap-2.5 border-b lg:border-b-0 lg:border-r border-[#d4af37]/30 pb-1 lg:pb-0 lg:pr-3 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-gradient-to-b from-amber-500/25 to-[#140c07] border border-[#d4af37] flex items-center justify-center text-sm sm:text-2xl shadow-inner">
                    {viewerPlayer.avatar}
                  </div>
                  {isHost && (
                    <span
                      title={language === 'bn' ? 'আপনি রুম হোস্ট (Host)' : 'You are the Host'}
                      className="absolute -top-1 -left-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-amber-500 text-slate-950 border border-amber-200 flex items-center justify-center shadow"
                    >
                      <Crown className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex lg:flex-col items-center lg:items-start gap-1.5 sm:gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-xs sm:text-base lg:text-lg text-amber-200 leading-tight truncate">
                      {formatShortName(viewerPlayer.name)}
                    </span>
                    {isViewerTurn && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] sm:text-xs font-extrabold whitespace-nowrap">
                        {language === 'bn' ? 'আপনার চাল' : 'YOUR TURN'}
                      </span>
                    )}
                  </div>

                  <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-black/55 border border-[#d4af37]/40 font-mono-num text-xs sm:text-sm font-extrabold text-amber-300 shrink-0">
                    <img
                      src={COIN_ASSET_URL}
                      alt="Coin"
                      referrerPolicy="no-referrer"
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4 object-contain"
                    />
                    {viewerPlayer.coins}/{state.settings.targetCoins}
                  </span>
                </div>
              </div>

              {/* Status badges & public discards */}
              <div className="flex items-center gap-1.5 flex-wrap justify-end lg:justify-start">
                {viewerPlayer.isProtected && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-400/50 text-[10px] sm:text-xs text-emerald-300 font-bold">
                    {language === 'bn' ? '🛡️ সুরক্ষিত' : '🛡️ Protected'}
                  </span>
                )}
                {viewerPlayer.pendingPickpocket && (
                  <span className="px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-400/50 text-[10px] sm:text-xs text-purple-300 font-bold">
                    {language === 'bn' ? '🗝️ +১ কয়েন' : '🗝️ +1 Coin'}
                  </span>
                )}
                {viewerPlayer.isEliminated && (
                  <span className="text-red-400 text-xs font-bold">
                    {language === 'bn' ? '💀 আউট' : '💀 Out'}
                  </span>
                )}

                {viewerPlayer.discards.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="hidden sm:inline text-[11px] text-amber-200/75">
                      {language === 'bn' ? 'খেলেছেন:' : 'Played:'}
                    </span>
                    {viewerPlayer.discards.slice(-2).map((c) => (
                      <button
                        key={c.uid}
                        type="button"
                        onClick={() => onOpenGuide(c.value)}
                        className="px-1.5 py-0.5 rounded bg-black/65 border border-[#d4af37]/35 font-mono-num text-[10px] sm:text-xs font-bold text-amber-200 cursor-pointer"
                      >
                        #{c.value}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Center (5 cols on desktop): Horizontal Swipeable Player Hand */}
            <div className="lg:col-span-5 flex-1 min-h-0 flex flex-col items-center justify-center overflow-hidden">
              {captainForced && (
                <div className="mb-0.5 px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-400 text-amber-200 text-[10px] sm:text-xs font-bold flex items-center gap-1.5 shrink-0">
                  <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">
                    {language === 'bn'
                      ? 'হাতে ৫ বা ৭ থাকায় ক্যাপ্টেন (৮) খেলা বাধ্যতামূলক!'
                      : 'Holding 5 or 7 with Captain (8) forces playing Captain!'}
                  </span>
                </div>
              )}

              <div
                data-testid="player-hand-container"
                className="w-full flex items-center justify-center gap-3 sm:gap-6 overflow-x-auto no-scrollbar pt-2 pb-1 px-2"
              >
                {viewerPlayer.hand.map((card) => {
                  const isPlayable = isViewerTurn && playableUids.includes(card.uid);
                  const isSelected = selectedCardUid === card.uid;
                  const isMandatoryCard = captainForced && card.value === 8;
                  const charDef = CHARACTERS[card.value];

                  return (
                    <div
                      key={card.uid}
                      className="flex flex-col items-center gap-1 shrink-0"
                    >
                      <PirateCard
                        value={card.value}
                        size="hand"
                        language={language}
                        selected={isSelected}
                        disabled={isViewerTurn && !isPlayable}
                        mandatory={isMandatoryCard}
                        animationVariant="deal"
                        onClick={() => {
                          if (isPlayable) setSelectedCardUid(card.uid);
                        }}
                        onInspect={(v) => onOpenGuide(v)}
                        className={
                          isGuardChoicesOpen
                            ? 'max-sm:!w-[74px] max-sm:!h-[105px]'
                            : ''
                        }
                      />
                      <div className="hidden sm:flex items-center gap-1 text-center">
                        <span className="text-xs sm:text-sm font-extrabold text-amber-100 leading-none">
                          {language === 'bn'
                            ? `${charDef.nameBn} (${charDef.bengaliNumber})`
                            : `${charDef.nameEn} (#${card.value})`}
                        </span>
                        <button
                          type="button"
                          onClick={() => onOpenGuide(card.value)}
                          aria-label={`Details for ${charDef.nameEn}`}
                          className="text-amber-300 hover:text-amber-100 p-0.5 cursor-pointer"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right (4 cols on desktop) / Bottom Adaptive Action Area (Mobile):
                Shows selected card ability, immediate target buttons, and confirm button without scrolling */}
            <div className="lg:col-span-4 flex flex-col justify-end shrink-0">
              {isViewerTurn && selectedCard && selectedCharDef ? (
                <div
                  data-testid="active-action-panel"
                  className="p-1.5 sm:p-3 rounded-xl sm:rounded-2xl parchment-scroll-box space-y-1 sm:space-y-2"
                >
                  {/* Selected Card Name & Compact Ability Summary */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs sm:text-base font-extrabold text-amber-300 leading-tight">
                          {language === 'bn'
                            ? `${selectedCharDef.nameBn} (${selectedCharDef.bengaliNumber})`
                            : `${selectedCharDef.nameEn} (#${selectedCharDef.value})`}
                        </span>
                        {selectedCard.value === 9 && (
                          <span className="px-1.5 py-0.2 rounded bg-red-950/90 border border-red-500/60 text-[10px] sm:text-xs font-extrabold text-red-300">
                            {language === 'bn' ? '⚠️ খেললে আউট!' : '⚠️ Self-Out!'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] sm:text-xs text-amber-100/95 leading-snug line-clamp-1 sm:line-clamp-2">
                        {language === 'bn'
                          ? selectedCharDef.shortDescBn
                          : selectedCharDef.shortDescEn}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenGuide(selectedCard.value)}
                      className="px-2 py-0.5 rounded-md bg-black/50 border border-[#d4af37]/40 text-[10px] sm:text-xs font-bold text-amber-200 shrink-0 cursor-pointer"
                    >
                      {language === 'bn' ? 'বিস্তারিত' : 'Info'}
                    </button>
                  </div>

                  {/* Target Opponent Selector — Only shown when selected card requires a valid target */}
                  {validTargetIds.length > 0 && (
                    <div className="pt-0.5 sm:pt-1 border-t border-[#d4af37]/25 flex items-center gap-1.5">
                      <span className="text-[11px] sm:text-xs font-extrabold text-amber-200 shrink-0">
                        {language === 'bn' ? 'টার্গেট:' : 'Target:'}
                      </span>
                      <div className="flex-1 grid grid-flow-col auto-cols-fr gap-1 min-w-0">
                        {validTargetIds.map((tid) => {
                          const tPlayer = state.players.find((p) => p.id === tid);
                          if (!tPlayer) return null;
                          const chosen = selectedTargetId === tid;
                          const isTargetAlly =
                            tid !== viewerPlayer.id &&
                            areTeammates(state, viewerPlayer.id, tid);
                          return (
                            <button
                              key={tid}
                              type="button"
                              onClick={() => setSelectedTargetId(tid)}
                              className={`min-h-[26px] sm:min-h-[34px] px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-extrabold transition-all flex items-center justify-center gap-1 min-w-0 cursor-pointer active:scale-95 ${
                                chosen
                                  ? 'bg-amber-500 text-slate-950 shadow ring-2 ring-amber-200'
                                  : 'bg-black/65 border border-[#d4af37]/40 text-amber-100 hover:border-amber-300'
                              }`}
                            >
                              <span className="shrink-0">{tPlayer.avatar}</span>
                              <span className="truncate">
                                {tPlayer.id === viewerPlayer.id
                                  ? language === 'bn'
                                    ? 'নিজে'
                                    : 'Self'
                                  : formatShortName(tPlayer.name)}
                              </span>
                              {isTargetAlly && (
                                <span className="text-[9px] px-1 rounded bg-emerald-800 text-emerald-100 shrink-0">
                                  {language === 'bn' ? 'সঙ্গী' : 'Ally'}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Guard (1) Character Guess Selector — Compact 5-column grid on mobile so all 9 options fit in 2 slim rows */}
                  {selectedCard.value === 1 && validTargetIds.length > 0 && (
                    <div className="pt-0.5 sm:pt-1 border-t border-[#d4af37]/25 space-y-0.5 sm:space-y-1">
                      <span className="text-[10px] sm:text-xs font-extrabold text-amber-200 block leading-tight">
                        {language === 'bn'
                          ? 'প্রতিপক্ষের কার্ড অনুমান করুন (পাহারাদার ছাড়া):'
                          : 'Guess Opponent’s Card (except Guard):'}
                      </span>
                      <div className="grid grid-cols-5 sm:grid-cols-3 gap-1">
                        {CHARACTER_LIST.filter((c) => c.value !== 1).map((c) => {
                          const isGuessed = selectedGuessValue === c.value;
                          return (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => setSelectedGuessValue(c.value)}
                              className={`min-h-[24px] sm:min-h-[28px] px-1 sm:px-1.5 py-0.5 rounded-md text-[10px] sm:text-xs font-bold transition-all text-center sm:text-left truncate cursor-pointer active:scale-95 ${
                                isGuessed
                                  ? 'bg-amber-500 text-slate-950 shadow ring-1 ring-amber-200 font-extrabold'
                                  : 'bg-black/65 border border-[#d4af37]/35 text-amber-100 hover:border-amber-300'
                              }`}
                            >
                              <span className="font-mono-num font-extrabold">
                                #{c.value}
                              </span>{' '}
                              <span>{language === 'bn' ? c.nameBn : c.nameEn}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Primary Action Confirm Button — Always Visible Without Scrolling */}
                  <button
                    type="button"
                    data-testid="btn-play-selected-card"
                    disabled={!canConfirmPlay()}
                    onClick={handleConfirmPlay}
                    className="w-full min-h-[34px] sm:min-h-[44px] py-1.5 sm:py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-extrabold text-xs sm:text-base shadow-lg transition-transform active:scale-95 cursor-pointer"
                  >
                    {language === 'bn'
                      ? `${selectedCharDef.nameBn} (${selectedCharDef.bengaliNumber}) কার্ডটি খেলুন`
                      : `Play ${selectedCharDef.nameEn} (#${selectedCharDef.value})`}
                  </button>
                </div>
              ) : (
                <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl parchment-scroll-box text-center space-y-1">
                  <div className="text-xs sm:text-base font-extrabold text-amber-200">
                    {isViewerTurn
                      ? language === 'bn'
                        ? 'আপনার হাতের যেকোনো ১টি বৈধ কার্ড ট্যাপ করে বেছে নিন'
                        : 'Tap a legal card from your hand to play'
                      : language === 'bn'
                      ? `⚡ ${activePlayer?.name} তার চাল দিচ্ছেন...`
                      : `⚡ ${activePlayer?.name} is taking their turn...`}
                  </div>
                  <p className="hidden sm:block text-xs text-amber-100/80">
                    {language === 'bn'
                      ? 'ডিসকার্ড পাইলের কার্ডগুলো দেখে প্রতিপক্ষের হাতের কার্ড অনুমান করুন।'
                      : 'Watch the public discard pile to deduce which cards remain in play.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* =====================================================================
          EXPANDABLE FULL MATCH HISTORY MODAL (Opened via History button)
         ===================================================================== */}
      {showFullHistoryModal && (
        <div
          data-testid="full-history-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Full Match History"
        >
          <div className="cabin-wood-panel max-w-3xl w-full rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between border-b border-[#d4af37]/30 pb-2.5 sm:pb-3.5">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
                <h3 className="text-base sm:text-2xl font-extrabold text-amber-300">
                  {language === 'bn'
                    ? `সম্পূর্ণ খেলার ইতিহাস (${state.logs.length}টি ঘটনা)`
                    : `Full Match History (${state.logs.length} events)`}
                </h3>
              </div>
              <button
                type="button"
                data-testid="btn-close-history-modal"
                onClick={() => setShowFullHistoryModal(false)}
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-amber-900/45 hover:bg-amber-800/60 border border-[#d4af37]/40 text-xs sm:text-base font-bold text-amber-200 cursor-pointer"
              >
                {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto space-y-2 pr-1">
              {fullHistoryLogs.map((entry, idx) => (
                <div
                  key={entry.id}
                  className={`p-2.5 sm:p-3 rounded-xl border flex items-start justify-between gap-2.5 ${
                    idx === 0
                      ? 'parchment-scroll-box text-amber-100 font-bold'
                      : 'bg-black/45 border-white/10 text-amber-100/90'
                  }`}
                >
                  <span className="text-xs sm:text-base leading-relaxed">
                    {language === 'bn' ? entry.textBn : entry.textEn}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-black/65 border border-[#d4af37]/35 font-mono-num text-[10px] sm:text-xs text-amber-300 shrink-0">
                    {language === 'bn'
                      ? `রাউন্ড ${entry.round} · টার্ন ${entry.turn}`
                      : `R${entry.round} · T${entry.turn}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          FULL PUBLIC DISCARD HISTORY MODAL
         ===================================================================== */}
      {showFullDiscardModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="All Discarded Cards"
        >
          <div className="cabin-wood-panel max-w-4xl w-full rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between border-b border-[#d4af37]/30 pb-2.5 sm:pb-3.5">
              <h3 className="text-base sm:text-2xl font-extrabold text-amber-300">
                {language === 'bn'
                  ? `এই রাউন্ডে ব্যবহৃত সকল কার্ড (${state.publicDiscardPile.length}টি)`
                  : `All Cards Played This Round (${state.publicDiscardPile.length})`}
              </h3>
              <button
                type="button"
                onClick={() => setShowFullDiscardModal(false)}
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-amber-900/45 hover:bg-amber-800/60 border border-[#d4af37]/40 text-xs sm:text-base font-bold text-amber-200 cursor-pointer"
              >
                {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
            <div className="flex flex-wrap gap-3 sm:gap-4 max-h-[65vh] overflow-y-auto p-1">
              {state.publicDiscardPile.map((item) => {
                const owner = state.players.find((p) => p.id === item.playerId);
                return (
                  <div key={item.card.uid} className="flex flex-col items-center gap-1">
                    <PirateCard
                      value={item.card.value}
                      size="sm"
                      language={language}
                      animationVariant="discard"
                      onInspect={(v) => {
                        setShowFullDiscardModal(false);
                        onOpenGuide(v);
                      }}
                    />
                    <span className="text-xs sm:text-sm text-amber-200 font-bold text-center max-w-[110px] truncate">
                      {owner?.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
