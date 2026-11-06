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
 * Formats log entries into concise, scannable descriptions for the compact 4-event Turn Log feed.
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
  // Show ONLY the latest 4 events in the compact turn feed, newest at top
  const latestFourLogs = [...state.logs].slice(-4).reverse();
  const fullHistoryLogs = [...state.logs].reverse();

  // Dynamic grid columns based on opponent count so full width is used cleanly
  const oppGridCols =
    opponents.length === 1
      ? 'grid-cols-1 max-w-2xl mx-auto'
      : opponents.length === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : opponents.length === 3
      ? 'grid-cols-1 md:grid-cols-3'
      : opponents.length === 4
      ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5';

  return (
    <div className="min-h-dvh w-full wood-deck-bg flex flex-col justify-between select-none overflow-x-hidden">
      {/* Top Perimeter HUD Bar — Full Width */}
      <header className="w-full bg-[#150d08]/95 border-b border-[#d4af37]/40 z-20">
        <div className="w-full max-w-[98vw] mx-auto px-3 sm:px-5 lg:px-7 py-2 flex flex-wrap items-center justify-between gap-2.5">
          {/* Left: Game Title & Round / Target Status */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-5">
            <div className="flex items-center gap-2.5">
              <img
                src={COIN_ASSET_URL}
                alt="Pirate Coin"
                referrerPolicy="no-referrer"
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
              />
              <span className="text-xl sm:text-2xl font-extrabold text-amber-300 tracking-tight whitespace-nowrap">
                জলদস্যু
              </span>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3.5 text-sm sm:text-base font-mono-num text-amber-100">
              <span>
                <strong className="text-amber-400">
                  {language === 'bn' ? 'রাউন্ড' : 'ROUND'}
                </strong>{' '}
                {state.round}/{state.settings.maxRounds}
              </span>
              <span aria-hidden="true" className="text-[#d4af37]/40">
                ·
              </span>
              <span>
                <strong className="text-amber-400">
                  {language === 'bn' ? 'লক্ষ্য' : 'TARGET'}
                </strong>{' '}
                {state.settings.targetCoins} {language === 'bn' ? 'কয়েন' : 'Coins'}
              </span>
              {onlineRoomCode && (
                <>
                  <span aria-hidden="true" className="text-[#d4af37]/40">
                    ·
                  </span>
                  <span className="text-emerald-300 font-bold">
                    ROOM: {onlineRoomCode}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Center: Active Turn Status Banner */}
          <div
            aria-live="polite"
            className={`px-4 py-1.5 rounded-xl border text-sm sm:text-base font-extrabold flex items-center gap-2.5 ${
              isViewerTurn
                ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-[0_6px_18px_rgba(245,158,11,0.18)]'
                : 'bg-[#0b2621]/90 border-[#d4af37]/40 text-amber-100'
            }`}
          >
            <span className="text-lg sm:text-xl">{activePlayer?.avatar}</span>
            <span>
              {isViewerTurn
                ? language === 'bn'
                  ? `আপনার টার্ন (${viewerPlayer.name}) — ১টি কার্ড খেলুন`
                  : `Your Turn (${viewerPlayer.name}) — Choose a Card to Play`
                : language === 'bn'
                ? `এখন টার্ন: ${activePlayer?.name}...`
                : `Current Turn: ${activePlayer?.name}...`}
            </span>
          </div>

          {/* Right: Utility Controls (Language, Guide [G], Rules, Mute [M], Host-Only Refresh & Restart [R], Pause [P]) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleLanguage();
              }}
              aria-label="Toggle Language"
              className="px-3 py-1.5 rounded-xl bg-black/65 hover:bg-amber-900/50 border border-[#d4af37]/45 text-sm sm:text-base font-bold text-amber-200 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {language === 'bn' ? 'EN' : 'বাংলা'}
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/65 hover:bg-amber-900/50 border border-[#d4af37]/45 text-sm sm:text-base font-bold text-amber-200 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              <span className="hidden sm:inline">
                {language === 'bn' ? 'গাইড [G]' : 'Guide [G]'}
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
              className="p-2 rounded-xl bg-black/65 hover:bg-amber-900/50 border border-[#d4af37]/45 text-amber-200 cursor-pointer"
            >
              <HelpCircle className="w-5 h-5" />
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
              className="p-2 rounded-xl bg-black/65 hover:bg-amber-900/50 border border-[#d4af37]/45 text-amber-200 cursor-pointer"
            >
              {soundEnabled ? (
                <Volume2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <VolumeX className="w-5 h-5 text-red-400" />
              )}
            </button>

            {/* HOST-ONLY REFRESH & RESTART CONTROLS — Completely hidden from Guest players */}
            {isHost && (
              <>
                <button
                  type="button"
                  tabIndex={-1}
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0e2e28]/90 hover:bg-[#154239] border border-[#d4af37]/45 text-sm font-bold text-emerald-200 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-emerald-300" />
                  <span className="hidden md:inline">
                    {language === 'bn' ? 'রিফ্রেশ' : 'Refresh'}
                  </span>
                </button>

                <button
                  type="button"
                  tabIndex={-1}
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/75 hover:bg-amber-900/70 border border-[#d4af37]/50 text-sm font-bold text-amber-200 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-amber-300" />
                  <span className="hidden md:inline">
                    {language === 'bn' ? 'রিস্টার্ট [R]' : 'Restart [R]'}
                  </span>
                </button>
              </>
            )}

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenPause();
              }}
              aria-label="Pause Game [P]"
              title="Pause Game [P / Esc]"
              className="p-2 rounded-xl bg-black/65 hover:bg-amber-900/50 border border-[#d4af37]/45 text-amber-200 cursor-pointer"
            >
              <Pause className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Playfield — Uses 97-98% of Viewport Width on Desktop */}
      <div className="flex-1 w-full max-w-[98vw] mx-auto px-2.5 sm:px-5 lg:px-7 py-2 flex flex-col justify-between gap-2.5">
        {/* 1. Compact Redesigned 2D Opponent Player Panels */}
        <section
          className={`grid ${oppGridCols} gap-2.5 w-full`}
          aria-label="Opponents"
        >
          {opponents.map((opp) => {
            const isOppTurn =
              state.players[state.activePlayerIndex]?.id === opp.id && !opp.isEliminated;
            const isValidTarget = validTargetIds.includes(opp.id);
            const isTargeted = selectedTargetId === opp.id;
            const isOppHost = state.hostPlayerId === opp.id;

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
                className={`px-3.5 py-2.5 rounded-2xl border-2 transition-all duration-150 flex items-center justify-between gap-3 ${
                  opp.isEliminated
                    ? 'bg-[#140d09]/75 border-red-900/50 opacity-65'
                    : isTargeted
                    ? 'bg-gradient-to-r from-[#2e1d0f] to-[#133830] border-amber-400 ring-2 ring-amber-400/80 shadow-xl cursor-pointer -translate-y-0.5'
                    : isValidTarget
                    ? 'bg-[#21150e]/95 border-[#d4af37]/75 hover:border-amber-300 hover:-translate-y-0.5 cursor-pointer'
                    : isOppTurn
                    ? 'bg-gradient-to-r from-[#2b1a10] to-[#102e27] border-amber-400 shadow-lg'
                    : 'bg-[#1c120c]/95 border-[#d4af37]/35'
                }`}
              >
                {/* Left Info: Ornate Portrait Medallion, Name, Coins, Status, Discards */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Improved Portrait Presentation */}
                  <div className="relative shrink-0">
                    <div
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl shadow-inner ${
                        opp.isEliminated
                          ? 'bg-red-950/50 border-2 border-red-800/60'
                          : isOppTurn
                          ? 'bg-gradient-to-b from-amber-500/30 to-[#140c07] border-2 border-amber-400'
                          : 'bg-gradient-to-b from-[#2f1e13] to-[#140c07] border-2 border-[#d4af37]/65'
                      }`}
                    >
                      {opp.isEliminated ? '💀' : opp.avatar}
                    </div>

                    {/* Host Crown Indicator */}
                    {isOppHost && (
                      <span
                        title={language === 'bn' ? 'রুম হোস্ট (Host)' : 'Room Host'}
                        className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-amber-500 text-slate-950 border border-amber-200 flex items-center justify-center shadow"
                      >
                        <Crown className="w-3 h-3" />
                      </span>
                    )}

                    {/* Spy Shield Indicator */}
                    {opp.isProtected && !opp.isEliminated && (
                      <span
                        title={
                          language === 'bn'
                            ? 'গুপ্তচর (৪) দ্বারা সুরক্ষিত'
                            : 'Protected by Spy (4)'
                        }
                        className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-600 border border-amber-200 flex items-center justify-center text-white shadow"
                      >
                        <Shield className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>

                  {/* Compact Player Details */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-extrabold text-base sm:text-lg text-amber-100 leading-tight break-words">
                        {opp.name}
                      </span>
                      {isOppTurn && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/25 border border-amber-400/70 text-xs font-mono-num font-extrabold text-amber-200">
                          {language === 'bn' ? '⚡ টার্ন চলছে' : '⚡ ACTIVE TURN'}
                        </span>
                      )}
                      {isTargeted && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          <span>{language === 'bn' ? 'টার্গেট' : 'TARGET'}</span>
                        </span>
                      )}
                    </div>

                    {/* Coins & Status Row */}
                    <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-amber-200/95 font-mono-num">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/55 border border-[#d4af37]/35 font-extrabold text-amber-300">
                        <img
                          src={COIN_ASSET_URL}
                          alt="Coin"
                          referrerPolicy="no-referrer"
                          className="w-4 h-4 object-contain"
                        />
                        {opp.coins}/{state.settings.targetCoins}
                      </span>

                      {opp.isEliminated ? (
                        <span className="text-red-400 font-bold">
                          {language === 'bn' ? 'আউট (Eliminated)' : 'Eliminated'}
                        </span>
                      ) : opp.isProtected ? (
                        <span className="text-emerald-300 font-bold">
                          {language === 'bn' ? '🛡️ সুরক্ষিত' : '🛡️ Protected'}
                        </span>
                      ) : opp.pendingPickpocket ? (
                        <span className="text-purple-300 font-bold">
                          {language === 'bn' ? '🗝️ কয়েন চুরি করছে' : '🗝️ Stealing Coin'}
                        </span>
                      ) : (
                        <span className="text-amber-100/80">
                          {language === 'bn'
                            ? `হাতে ${opp.hand.length}টি`
                            : `Hand: ${opp.hand.length}`}
                        </span>
                      )}
                    </div>

                    {/* Compact Public Discards */}
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-xs text-amber-200/70 font-semibold">
                        {language === 'bn' ? 'খেলেছে:' : 'Played:'}
                      </span>
                      {opp.discards.length === 0 ? (
                        <span className="text-xs text-amber-200/45">—</span>
                      ) : (
                        opp.discards.map((dc) => (
                          <button
                            key={dc.uid}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenGuide(dc.value);
                            }}
                            title={`${CHARACTERS[dc.value].nameBn} (${CHARACTERS[dc.value].nameEn})`}
                            className="px-1.5 py-0.5 rounded bg-black/70 border border-[#d4af37]/35 font-mono-num text-xs font-bold text-amber-200 hover:border-amber-300 cursor-pointer"
                          >
                            #{dc.value}{' '}
                            {language === 'bn'
                              ? CHARACTERS[dc.value].nameBn
                              : CHARACTERS[dc.value].nameEn}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Opponent's Secret Hand Card(s) */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {opp.isEliminated ? (
                    <div className="w-16 h-24 sm:w-20 sm:h-30 rounded-xl border border-red-500/35 bg-red-950/35 flex items-center justify-center text-red-400">
                      <Skull className="w-6 h-6" />
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
              </div>
            );
          })}
        </section>

        {/* 2. Center Ship Deck Play Well (7 cols) + Compact 4-Event Turn Feed (5 cols) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch my-auto">
          {/* Center Table Surface (7 cols on desktop) */}
          <div className="lg:col-span-7 cabin-wood-panel rounded-2xl p-3 sm:p-4 flex flex-col justify-between gap-3 relative overflow-hidden">
            <div className="ocean-felt-well rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-around gap-4">
              {/* Draw Deck & Secret Removed Card */}
              <div className="flex items-center gap-5 sm:gap-7">
                {/* Draw Deck */}
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <PirateCard value={0} faceDown size="sm" />
                    <div className="absolute -top-2.5 -right-2.5 px-2.5 py-0.5 rounded-lg bg-amber-500 text-slate-950 font-mono-num text-sm sm:text-base font-extrabold shadow-lg border border-amber-200">
                      {state.deck.length}
                    </div>
                  </div>
                  <span className="text-sm sm:text-base font-extrabold text-amber-200 text-center">
                    {language === 'bn'
                      ? `ড্র ডেক (${state.deck.length}টি বাকি)`
                      : `Draw Deck (${state.deck.length} left)`}
                  </span>
                </div>

                {/* Secret Face-Down Removed Card */}
                {state.removedCard && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative opacity-95">
                      <PirateCard value={0} faceDown size="xs" />
                      <span className="absolute inset-0 flex items-center justify-center text-amber-300 font-extrabold text-lg sm:text-xl bg-black/45 rounded-xl">
                        ?
                      </span>
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-amber-200/90 text-center max-w-[130px] leading-snug">
                      {language === 'bn' ? '১টি গোপন সরানো কার্ড' : '1 Secret Card'}
                    </span>
                  </div>
                )}
              </div>

              {/* Public Discard Pile & Animated Last Played Cards */}
              <div className="flex flex-col items-center gap-2.5">
                <div className="flex items-center gap-2.5">
                  {state.publicDiscardPile.length === 0 ? (
                    <div className="w-26 h-39 sm:w-30 sm:h-45 rounded-xl border-2 border-dashed border-[#d4af37]/45 bg-black/30 flex items-center justify-center text-sm sm:text-base font-semibold text-amber-200/70 text-center p-3">
                      {language === 'bn' ? 'খেলার টেবিল খালি' : 'Play Area Empty'}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5">
                      {state.publicDiscardPile.slice(-3).map((entry, idx, arr) => {
                        const isLatest = idx === arr.length - 1;
                        return (
                          <PirateCard
                            key={entry.card.uid}
                            value={entry.card.value}
                            size={isLatest ? 'sm' : 'xs'}
                            language={language}
                            animationVariant={isLatest ? 'slide-play' : 'discard'}
                            onInspect={(v) => onOpenGuide(v)}
                            className={
                              isLatest
                                ? 'ring-2 ring-amber-400 shadow-[0_12px_28px_rgba(245,158,11,0.35)]'
                                : 'opacity-85'
                            }
                          />
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="text-sm sm:text-base font-extrabold text-amber-200">
                    {language === 'bn'
                      ? `ব্যবহৃত কার্ড (${state.publicDiscardPile.length}টি)`
                      : `Played Cards (${state.publicDiscardPile.length})`}
                  </span>
                  {state.publicDiscardPile.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowFullDiscardModal(true)}
                      className="text-sm font-bold text-amber-400 hover:text-amber-200 underline cursor-pointer"
                    >
                      {language === 'bn' ? 'সব দেখুন' : 'View All'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Small Reward & Ability Effect Banner when an ability fires */}
            {state.lastAnimationEvent && (
              <div
                key={state.lastAnimationEvent.id}
                className="animate-ability-pop px-4 py-2.5 rounded-xl parchment-scroll-box flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-8 h-8 rounded-lg bg-amber-500/20 border border-[#d4af37]/50 flex items-center justify-center shrink-0">
                    {state.lastAnimationEvent.type === 'cannon' ? (
                      <Flame className="w-5 h-5 text-orange-400" />
                    ) : state.lastAnimationEvent.type === 'duel' ? (
                      <Swords className="w-5 h-5 text-emerald-400" />
                    ) : state.lastAnimationEvent.type === 'spy' ? (
                      <Shield className="w-5 h-5 text-emerald-300" />
                    ) : state.lastAnimationEvent.type === 'coin' ? (
                      <img
                        src={COIN_ASSET_URL}
                        alt="Reward Coin"
                        referrerPolicy="no-referrer"
                        className="w-5 h-5 object-contain"
                      />
                    ) : (
                      <Sparkles className="w-5 h-5 text-amber-400" />
                    )}
                  </span>
                  <p className="text-sm sm:text-base text-amber-100 font-semibold leading-snug">
                    {language === 'bn'
                      ? state.logs[state.logs.length - 1]?.textBn
                      : state.logs[state.logs.length - 1]?.textEn}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right: Compact 4-Event Turn Feed + History Modal Button (5 cols on desktop) */}
          <div className="lg:col-span-5 cabin-wood-panel rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-[#d4af37]/30 gap-2">
              <div className="flex items-center gap-2 text-base sm:text-lg font-extrabold text-amber-300">
                <History className="w-5 h-5 text-amber-400 shrink-0" />
                <span>
                  {language === 'bn' ? 'সর্বশেষ ৪টি ঘটনা (Event Feed)' : 'Latest 4 Events'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-mono-num font-bold text-amber-200/80">
                  {language === 'bn' ? `টার্ন #${state.turnNumber}` : `Turn #${state.turnNumber}`}
                </span>
                <button
                  type="button"
                  onClick={() => setShowFullHistoryModal(true)}
                  aria-label="Open Full Match History"
                  className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 border border-[#d4af37]/55 text-xs sm:text-sm font-extrabold text-amber-200 flex items-center gap-1.5 transition-colors cursor-pointer"
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
                    className={`px-3 py-1.5 rounded-xl border text-sm sm:text-base leading-snug transition-all ${
                      isNewest
                        ? 'parchment-scroll-box text-amber-100 font-bold animate-ability-pop'
                        : 'bg-black/35 border-white/10 text-amber-100/85'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span>{formatConciseLogText(entry, language)}</span>
                      {isNewest && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-mono-num text-[11px] font-extrabold shrink-0">
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

        {/* 3. Spacious Bottom Action Panel: Player Status (3 cols) + Large Hand Cards (5 cols) + Clear Ability & Target Controls (4 cols) */}
        <section className="cabin-wood-panel rounded-2xl p-3 sm:p-3.5 border-t-2 border-[#d4af37]/55">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 lg:gap-4 items-center">
            {/* Left: Compact Local Player Identity, Coins & Status (3 cols on desktop) */}
            <div className="lg:col-span-3 flex flex-col justify-between gap-2.5 border-b lg:border-b-0 lg:border-r border-[#d4af37]/30 pb-3.5 lg:pb-0 lg:pr-4">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-gradient-to-b from-amber-500/25 to-[#140c07] border-2 border-[#d4af37] flex items-center justify-center text-2xl sm:text-3xl shadow-inner">
                    {viewerPlayer.avatar}
                  </div>
                  {isHost && (
                    <span
                      title={language === 'bn' ? 'আপনি রুম হোস্ট (Host)' : 'You are the Host'}
                      className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-amber-500 text-slate-950 border border-amber-200 flex items-center justify-center shadow"
                    >
                      <Crown className="w-3 h-3" />
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-lg sm:text-xl text-amber-200 leading-tight">
                      {viewerPlayer.name}
                    </span>
                    {isViewerTurn && (
                      <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-xs font-extrabold">
                        {language === 'bn' ? 'আপনার চাল' : 'YOUR TURN'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-base sm:text-lg font-mono-num text-amber-300 mt-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-black/55 border border-[#d4af37]/40 font-extrabold">
                      <img
                        src={COIN_ASSET_URL}
                        alt="Coin"
                        referrerPolicy="no-referrer"
                        className="w-5 h-5 object-contain"
                      />
                      {viewerPlayer.coins} / {state.settings.targetCoins}{' '}
                      {language === 'bn' ? 'কয়েন' : 'Coins'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base">
                {viewerPlayer.isProtected && (
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-950/75 border border-emerald-400/50 text-emerald-300 font-bold">
                    {language === 'bn' ? '🛡️ গুপ্তচর দ্বারা সুরক্ষিত' : '🛡️ Protected by Spy'}
                  </span>
                )}
                {viewerPlayer.pendingPickpocket && (
                  <span className="px-2.5 py-1 rounded-lg bg-purple-950/75 border border-purple-400/50 text-purple-300 font-bold">
                    {language === 'bn'
                      ? '🗝️ পরের টার্নে +১ কয়েন চুরি!'
                      : '🗝️ Pending +1 Coin Steal!'}
                  </span>
                )}
                {viewerPlayer.isEliminated && (
                  <span className="text-red-400 font-bold">
                    {language === 'bn'
                      ? `💀 আপনি এই রাউন্ডে বাদ পড়েছেন (${viewerPlayer.eliminationReasonBn ?? ''})`
                      : `💀 Eliminated this round (${viewerPlayer.eliminationReasonEn ?? ''})`}
                  </span>
                )}
              </div>

              {/* Viewer's public discards */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs sm:text-sm text-amber-200/80 font-semibold">
                  {language === 'bn' ? 'আপনার খেলা কার্ড:' : 'Your Discards:'}
                </span>
                {viewerPlayer.discards.length === 0 ? (
                  <span className="text-xs sm:text-sm text-amber-200/45">—</span>
                ) : (
                  viewerPlayer.discards.map((c) => (
                    <button
                      key={c.uid}
                      type="button"
                      onClick={() => onOpenGuide(c.value)}
                      className="px-2 py-0.5 rounded-md bg-black/65 border border-[#d4af37]/35 font-mono-num text-xs sm:text-sm font-bold text-amber-200 hover:border-amber-300 cursor-pointer"
                    >
                      #{c.value}{' '}
                      {language === 'bn'
                        ? CHARACTERS[c.value].nameBn
                        : CHARACTERS[c.value].nameEn}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Center: Spacious Player's Hand Cards — Larger Cards with Smooth Hover Tilt & Golden Lift (5 cols on desktop) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center py-1">
              {captainForced && (
                <div className="mb-3 px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-200 text-xs sm:text-sm font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    {language === 'bn'
                      ? 'হাতে কামানচালক (৫) বা নাবিক (৭) থাকায় ক্যাপ্টেন (৮) খেলা বাধ্যতামূলক!'
                      : 'Mandatory Rule: Holding 5 or 7 with Captain (8) forces playing Captain!'}
                  </span>
                </div>
              )}

              <div className="flex items-start justify-center gap-4 sm:gap-7">
                {viewerPlayer.hand.map((card) => {
                  const isPlayable = isViewerTurn && playableUids.includes(card.uid);
                  const isSelected = selectedCardUid === card.uid;
                  const isMandatoryCard = captainForced && card.value === 8;
                  const charDef = CHARACTERS[card.value];

                  return (
                    <div
                      key={card.uid}
                      className="flex flex-col items-center gap-2"
                    >
                      <PirateCard
                        value={card.value}
                        size="lg"
                        language={language}
                        selected={isSelected}
                        disabled={isViewerTurn && !isPlayable}
                        mandatory={isMandatoryCard}
                        animationVariant="deal"
                        onClick={() => {
                          if (isPlayable) setSelectedCardUid(card.uid);
                        }}
                        onInspect={(v) => onOpenGuide(v)}
                      />
                      <div className="text-center">
                        <div className="text-sm sm:text-base font-extrabold text-amber-100">
                          {language === 'bn'
                            ? `${charDef.nameBn} (${charDef.bengaliNumber})`
                            : `${charDef.nameEn} (#${card.value})`}
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenGuide(card.value)}
                          className="inline-flex items-center gap-1 text-xs text-amber-300/90 hover:text-amber-200 underline cursor-pointer"
                        >
                          <Info className="w-3 h-3" />
                          <span>
                            {language === 'bn' ? 'বিস্তারিত' : 'Details'}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Focused Action Panel — Selected Card Ability & Only Relevant Controls (4 cols on desktop) */}
            <div className="lg:col-span-4 flex flex-col justify-between gap-2">
              {isViewerTurn && selectedCard && selectedCharDef ? (
                <div className="p-3 sm:p-3.5 rounded-2xl parchment-scroll-box space-y-2.5">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-base sm:text-lg font-extrabold text-amber-300">
                        {language === 'bn'
                          ? `${selectedCharDef.nameBn} (${selectedCharDef.bengaliNumber})`
                          : `${selectedCharDef.nameEn} (#${selectedCharDef.value})`}
                      </span>
                      {selectedCard.value === 9 && (
                        <span className="px-2 py-0.5 rounded-lg bg-red-950/90 border border-red-500/60 text-xs font-extrabold text-red-300">
                          {language === 'bn'
                            ? '⚠️ খেললে আউট হবেন!'
                            : '⚠️ Self-Eliminates!'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-amber-100/95 leading-snug">
                      {language === 'bn'
                        ? selectedCharDef.shortDescBn
                        : selectedCharDef.shortDescEn}
                    </p>
                  </div>

                  {/* Target Opponent Selector — Only shown when selected card requires a valid target */}
                  {validTargetIds.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-[#d4af37]/25">
                      <span className="text-xs sm:text-sm font-extrabold text-amber-200 block">
                        {language === 'bn'
                          ? '১. টার্গেট খেলোয়াড় বেছে নিন:'
                          : '1. Select Target Pirate:'}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {validTargetIds.map((tid) => {
                          const tPlayer = state.players.find((p) => p.id === tid);
                          if (!tPlayer) return null;
                          const chosen = selectedTargetId === tid;
                          return (
                            <button
                              key={tid}
                              type="button"
                              onClick={() => setSelectedTargetId(tid)}
                              className={`px-2.5 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                                chosen
                                  ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-200'
                                  : 'bg-black/65 border border-[#d4af37]/40 text-amber-100 hover:border-amber-300'
                              }`}
                            >
                              <span className="text-base">{tPlayer.avatar}</span>
                              <span>
                                {tPlayer.id === viewerPlayer.id
                                  ? language === 'bn'
                                    ? `${tPlayer.name} (নিজে)`
                                    : `${tPlayer.name} (Self)`
                                  : tPlayer.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Guard (1) Character Guess Selector — Only shown when Guard (1) is selected */}
                  {selectedCard.value === 1 && validTargetIds.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-[#d4af37]/25">
                      <span className="text-xs sm:text-sm font-extrabold text-amber-200 block">
                        {language === 'bn'
                          ? '২. প্রতিপক্ষের কার্ড অনুমান করুন (পাহারাদার ছাড়া):'
                          : '2. Guess Opponent’s Character (except Guard):'}
                      </span>
                      <div className="grid grid-cols-3 gap-1">
                        {CHARACTER_LIST.filter((c) => c.value !== 1).map((c) => {
                          const isGuessed = selectedGuessValue === c.value;
                          return (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => setSelectedGuessValue(c.value)}
                              className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors text-left leading-tight cursor-pointer ${
                                isGuessed
                                  ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-200 font-extrabold'
                                  : 'bg-black/65 border border-[#d4af37]/35 text-amber-100 hover:border-amber-300'
                              }`}
                            >
                              <span className="font-mono-num font-extrabold">
                                #{c.value}
                              </span>{' '}
                              {language === 'bn' ? c.nameBn : c.nameEn}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={!canConfirmPlay()}
                    onClick={handleConfirmPlay}
                    className="w-full py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-extrabold text-sm sm:text-base shadow-lg transition-transform active:scale-95 cursor-pointer"
                  >
                    {language === 'bn'
                      ? `${selectedCharDef.nameBn} (${selectedCharDef.bengaliNumber}) কার্ডটি খেলুন`
                      : `Play ${selectedCharDef.nameEn} (#${selectedCharDef.value})`}
                  </button>
                </div>
              ) : (
                <div className="p-5 rounded-2xl parchment-scroll-box text-center space-y-2">
                  <div className="text-base sm:text-lg font-extrabold text-amber-200">
                    {isViewerTurn
                      ? language === 'bn'
                        ? 'আপনার হাতের যেকোনো ১টি বৈধ কার্ড ক্লিক করে বেছে নিন'
                        : 'Select a legal card from your hand to play'
                      : language === 'bn'
                      ? `${activePlayer?.name} তার চাল চিন্তা করছেন...`
                      : `${activePlayer?.name} is deciding their move...`}
                  </div>
                  <p className="text-sm sm:text-base text-amber-100/80 leading-relaxed">
                    {language === 'bn'
                      ? 'ডিসকার্ড পাইলের কার্ডগুলো দেখে প্রতিপক্ষের হাতের কার্ড অনুমান করার চেষ্টা করুন।'
                      : 'Watch the public discard pile to deduce which cards remain in play.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Full Match History Modal (Opened via History button in Turn Log) */}
      {showFullHistoryModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Full Match History"
        >
          <div className="cabin-wood-panel max-w-3xl w-full rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#d4af37]/30 pb-3.5">
              <div className="flex items-center gap-2.5">
                <History className="w-6 h-6 text-amber-400" />
                <h3 className="text-xl sm:text-2xl font-extrabold text-amber-300">
                  {language === 'bn'
                    ? `সম্পূর্ণ খেলার ইতিহাস (${state.logs.length}টি ঘটনা)`
                    : `Full Match History (${state.logs.length} events)`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFullHistoryModal(false)}
                className="px-4 py-2 rounded-xl bg-amber-900/45 hover:bg-amber-800/60 border border-[#d4af37]/40 text-sm sm:text-base font-bold text-amber-200 cursor-pointer"
              >
                {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto space-y-2 pr-1">
              {fullHistoryLogs.map((entry, idx) => (
                <div
                  key={entry.id}
                  className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                    idx === 0
                      ? 'parchment-scroll-box text-amber-100 font-bold'
                      : 'bg-black/45 border-white/10 text-amber-100/90'
                  }`}
                >
                  <span className="text-sm sm:text-base leading-relaxed">
                    {language === 'bn' ? entry.textBn : entry.textEn}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-black/65 border border-[#d4af37]/35 font-mono-num text-xs text-amber-300 shrink-0">
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

      {/* Full Public Discard History Modal */}
      {showFullDiscardModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="All Discarded Cards"
        >
          <div className="cabin-wood-panel max-w-4xl w-full rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#d4af37]/30 pb-3.5">
              <h3 className="text-xl sm:text-2xl font-extrabold text-amber-300">
                {language === 'bn'
                  ? `এই রাউন্ডে ব্যবহৃত সকল কার্ড (${state.publicDiscardPile.length}টি)`
                  : `All Cards Played / Discarded This Round (${state.publicDiscardPile.length})`}
              </h3>
              <button
                type="button"
                onClick={() => setShowFullDiscardModal(false)}
                className="px-4 py-2 rounded-xl bg-amber-900/45 hover:bg-amber-800/60 border border-[#d4af37]/40 text-sm sm:text-base font-bold text-amber-200 cursor-pointer"
              >
                {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
            <div className="flex flex-wrap gap-4 max-h-[65vh] overflow-y-auto p-2">
              {state.publicDiscardPile.map((item) => {
                const owner = state.players.find((p) => p.id === item.playerId);
                return (
                  <div key={item.card.uid} className="flex flex-col items-center gap-1.5">
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
                    <span className="text-sm text-amber-200 font-bold text-center max-w-[130px] break-words">
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

