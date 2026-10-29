import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Flame,
  HelpCircle,
  History,
  Info,
  Pause,
  RotateCcw,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CHARACTERS, CHARACTER_LIST, COIN_ASSET_URL } from '../game/cards';
import { getPlayableCardUids, getValidTargetIds, mustPlayCaptain } from '../game/engine';
import { CardValue, GameState, Language, PlayCardAction } from '../game/types';
import { PirateCard } from './PirateCard';

interface GameTableProps {
  state: GameState;
  viewerPlayerId: string;
  language: Language;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onToggleLanguage: () => void;
  onPlayCardAction: (action: PlayCardAction) => void;
  onOpenGuide: (val?: CardValue) => void;
  onOpenHowToPlay: () => void;
  onOpenPause: () => void;
  onRestartMatch: () => void;
  onlineRoomCode?: string | null;
}

export const GameTable: React.FC<GameTableProps> = ({
  state,
  viewerPlayerId,
  language,
  soundEnabled,
  onToggleSound,
  onToggleLanguage,
  onPlayCardAction,
  onOpenGuide,
  onOpenHowToPlay,
  onOpenPause,
  onRestartMatch,
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
  const recentLogs = [...state.logs].slice(-8).reverse();

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
      <header className="w-full bg-[#120b07]/95 border-b border-amber-500/30 z-20">
        <div className="w-full max-w-[98vw] mx-auto px-3 sm:px-5 lg:px-7 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Game Title & Round / Target Status */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-6">
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

            <div className="flex items-center gap-3 sm:gap-4 text-sm sm:text-base lg:text-lg font-mono-num text-amber-100">
              <span>
                <strong className="text-amber-400">
                  {language === 'bn' ? 'রাউন্ড' : 'ROUND'}
                </strong>{' '}
                {state.round}/{state.settings.maxRounds}
              </span>
              <span aria-hidden="true" className="text-amber-500/40">
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
                  <span aria-hidden="true" className="text-amber-500/40">
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
            className={`px-4 py-1.5 rounded-xl border text-sm sm:text-base lg:text-lg font-extrabold flex items-center gap-2.5 ${
              isViewerTurn
                ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                : 'bg-black/55 border-amber-500/30 text-amber-100'
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

          {/* Right: Utility Controls (Language, Guide [G], Rules, Mute [M], Restart [R], Pause [P]) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleLanguage();
              }}
              aria-label="Toggle Language"
              className="px-3.5 py-2 rounded-xl bg-black/60 hover:bg-amber-900/50 border border-amber-500/35 text-sm sm:text-base font-bold text-amber-200 whitespace-nowrap shrink-0 cursor-pointer"
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
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black/60 hover:bg-amber-900/50 border border-amber-500/35 text-sm sm:text-base font-bold text-amber-200 whitespace-nowrap shrink-0 cursor-pointer"
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
              className="p-2 rounded-xl bg-black/60 hover:bg-amber-900/50 border border-amber-500/35 text-amber-200 cursor-pointer"
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
              className="p-2 rounded-xl bg-black/60 hover:bg-amber-900/50 border border-amber-500/35 text-amber-200 cursor-pointer"
            >
              {soundEnabled ? (
                <Volume2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <VolumeX className="w-5 h-5 text-red-400" />
              )}
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onRestartMatch();
              }}
              aria-label="Restart Match [R]"
              title="Restart Match [R]"
              className="p-2 rounded-xl bg-black/60 hover:bg-amber-900/50 border border-amber-500/35 text-amber-200 cursor-pointer"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenPause();
              }}
              aria-label="Pause Game [P]"
              title="Pause Game [P / Esc]"
              className="p-2 rounded-xl bg-black/60 hover:bg-amber-900/50 border border-amber-500/35 text-amber-200 cursor-pointer"
            >
              <Pause className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Playfield — Uses 97-98% of Viewport Width on Desktop */}
      <div className="flex-1 w-full max-w-[98vw] mx-auto px-2.5 sm:px-5 lg:px-7 py-3.5 flex flex-col justify-between gap-4">
        {/* 1. Top Opponent Seats Around the Ship Deck */}
        <section
          className={`grid ${oppGridCols} gap-3.5 w-full`}
          aria-label="Opponents"
        >
          {opponents.map((opp) => {
            const isOppTurn =
              state.players[state.activePlayerIndex]?.id === opp.id && !opp.isEliminated;
            const isValidTarget = validTargetIds.includes(opp.id);
            const isTargeted = selectedTargetId === opp.id;

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
                className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all flex items-center justify-between gap-3.5 ${
                  opp.isEliminated
                    ? 'bg-black/40 border-red-900/45 opacity-65'
                    : isTargeted
                    ? 'bg-amber-500/25 border-amber-400 ring-2 ring-amber-400 shadow-xl cursor-pointer'
                    : isValidTarget
                    ? 'bg-[#21150e]/95 border-amber-400/65 hover:border-amber-300 cursor-pointer'
                    : isOppTurn
                    ? 'bg-[#281910] border-amber-400 shadow-lg'
                    : 'bg-[#1c120c]/95 border-amber-500/25'
                }`}
              >
                {/* Left Info: Avatar, Name, Coins, Status, Discards */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-black/60 border border-amber-500/35 flex items-center justify-center text-2xl sm:text-3xl">
                      {opp.isEliminated ? '💀' : opp.avatar}
                    </div>
                    {opp.isProtected && !opp.isEliminated && (
                      <span
                        title={
                          language === 'bn'
                            ? 'গুপ্তচর (৪) দ্বারা সুরক্ষিত'
                            : 'Protected by Spy (4)'
                        }
                        className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-600 border border-amber-200 flex items-center justify-center text-white shadow"
                      >
                        <Shield className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-base sm:text-lg lg:text-xl text-amber-100 leading-snug break-words">
                        {opp.name}
                      </span>
                      {isOppTurn && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/25 border border-amber-400/50 text-xs font-mono-num font-extrabold text-amber-300">
                          {language === 'bn' ? 'টার্ন চলছে' : 'ACTIVE TURN'}
                        </span>
                      )}
                      {isTargeted && (
                        <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-xs font-extrabold">
                          {language === 'bn' ? 'টার্গেট' : 'TARGET'}
                        </span>
                      )}
                    </div>

                    {/* Coins & Status Text */}
                    <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base text-amber-200/90 font-mono-num">
                      <span className="inline-flex items-center gap-1.5 font-extrabold text-amber-300">
                        <img
                          src={COIN_ASSET_URL}
                          alt="Coin"
                          referrerPolicy="no-referrer"
                          className="w-4 h-4 sm:w-5 sm:h-5 object-contain"
                        />
                        {opp.coins}/{state.settings.targetCoins}{' '}
                        {language === 'bn' ? 'কয়েন' : 'Coins'}
                      </span>
                      <span aria-hidden="true">·</span>
                      {opp.isEliminated ? (
                        <span className="text-red-400 font-bold">
                          {language === 'bn' ? 'এই রাউন্ডে আউট' : 'Eliminated'}
                        </span>
                      ) : opp.isProtected ? (
                        <span className="text-emerald-300 font-bold">
                          {language === 'bn' ? '🛡️ সুরক্ষিত (Spy)' : '🛡️ Protected'}
                        </span>
                      ) : opp.pendingPickpocket ? (
                        <span className="text-purple-300 font-bold">
                          {language === 'bn' ? '🗝️ কয়েন চুরির অপেক্ষায়' : '🗝️ Stealing Coin'}
                        </span>
                      ) : (
                        <span>
                          {language === 'bn'
                            ? `হাতে: ${opp.hand.length}টি কার্ড`
                            : `Hand: ${opp.hand.length} card`}
                        </span>
                      )}
                    </div>

                    {/* Public Discard History for this Opponent */}
                    <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                      <span className="text-xs sm:text-sm text-amber-200/70 font-semibold">
                        {language === 'bn' ? 'ডিসকার্ড:' : 'Discards:'}
                      </span>
                      {opp.discards.length === 0 ? (
                        <span className="text-xs sm:text-sm text-amber-200/45">—</span>
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
                            className="px-2 py-0.5 rounded-md bg-black/70 border border-amber-500/35 font-mono-num text-xs sm:text-sm font-bold text-amber-200 hover:border-amber-300 cursor-pointer"
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
                      <Skull className="w-7 h-7" />
                    </div>
                  ) : (
                    opp.hand.map((c) => (
                      <PirateCard key={c.uid} value={c.value} faceDown size="xs" />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* 2. Center Ship Deck Table (7 cols) + Wide Turn Log (5 cols) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch my-auto">
          {/* Center Table Surface (7 cols on desktop) */}
          <div className="lg:col-span-7 cabin-wood-panel rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-around gap-6 relative overflow-hidden">
            {/* Draw Deck & Secret Removed Card */}
            <div className="flex items-center gap-5 sm:gap-7">
              {/* Draw Deck */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <PirateCard value={0} faceDown size="sm" />
                  <div className="absolute -top-2.5 -right-2.5 px-2.5 py-0.5 rounded-lg bg-amber-500 text-slate-950 font-mono-num text-sm sm:text-base font-extrabold shadow-lg">
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
                  <div className="relative opacity-90">
                    <PirateCard value={0} faceDown size="xs" />
                    <span className="absolute inset-0 flex items-center justify-center text-amber-300 font-extrabold text-lg sm:text-xl bg-black/45 rounded-lg">
                      ?
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-amber-200/85 text-center max-w-[140px] leading-snug">
                    {language === 'bn' ? '১টি গোপন সরানো কার্ড' : '1 Secret Removed Card'}
                  </span>
                </div>
              )}
            </div>

            {/* Public Discard Pile & Last Played Cards */}
            <div className="flex flex-col items-center gap-2.5">
              <div className="flex items-center gap-2.5">
                {state.publicDiscardPile.length === 0 ? (
                  <div className="w-28 h-42 sm:w-32 sm:h-48 rounded-xl border-2 border-dashed border-amber-500/35 bg-black/25 flex items-center justify-center text-sm sm:text-base font-semibold text-amber-200/60 text-center p-3">
                    {language === 'bn' ? 'ডিসকার্ড পাইল খালি' : 'Discard Pile Empty'}
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
                          onInspect={(v) => onOpenGuide(v)}
                          className={isLatest ? 'ring-2 ring-amber-400/80' : 'opacity-85'}
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
                    : `Public Discards (${state.publicDiscardPile.length})`}
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

            {/* Latest Action Banner when an ability fires */}
            {state.lastAnimationEvent && (
              <div className="w-full sm:w-auto sm:max-w-[270px] p-3.5 rounded-xl bg-black/60 border border-amber-500/35 text-left space-y-1.5">
                <div className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-amber-300">
                  {state.lastAnimationEvent.type === 'cannon' ? (
                    <Flame className="w-5 h-5 text-orange-400 shrink-0" />
                  ) : state.lastAnimationEvent.type === 'duel' ? (
                    <Swords className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                  )}
                  <span>
                    {language === 'bn' ? 'সর্বশেষ অ্যাকশন' : 'Latest Action'}
                  </span>
                </div>
                <p className="text-sm sm:text-base text-amber-100/95 leading-relaxed">
                  {language === 'bn'
                    ? state.logs[state.logs.length - 1]?.textBn
                    : state.logs[state.logs.length - 1]?.textEn}
                </p>
              </div>
            )}
          </div>

          {/* Right: Turn History & Event Log (5 cols on desktop — Wide & Highly Readable) */}
          <div className="lg:col-span-5 cabin-wood-panel rounded-2xl p-4 sm:p-5 flex flex-col justify-between min-h-[220px] max-h-[280px]">
            <div className="flex items-center justify-between pb-2.5 border-b border-amber-500/25">
              <div className="flex items-center gap-2 text-base sm:text-lg font-extrabold text-amber-300">
                <History className="w-5 h-5 text-amber-400" />
                <span>
                  {language === 'bn' ? 'খেলার ধারাভাষ্য (Turn Log)' : 'Captain’s Turn Log'}
                </span>
              </div>
              <span className="text-xs sm:text-sm font-mono-num font-bold text-amber-200/80">
                {language === 'bn' ? `টার্ন #${state.turnNumber}` : `Turn #${state.turnNumber}`}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 py-2.5 pr-1.5">
              {recentLogs.map((entry) => (
                <div
                  key={entry.id}
                  className="text-sm sm:text-base lg:text-[17px] text-amber-100/95 leading-relaxed py-1.5 border-b border-white/10 last:border-0"
                >
                  {language === 'bn' ? entry.textBn : entry.textEn}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Bottom Dock: Local Player's Private Hand, Full Card Description, and Target/Guess Action Panel */}
        <section className="cabin-wood-panel rounded-2xl p-3.5 sm:p-4 lg:p-5 border-t-2 border-amber-500/45">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-center">
            {/* Left: Player Identity, Coins & Status (3 cols on desktop) */}
            <div className="lg:col-span-3 flex flex-col justify-between gap-2.5 border-b lg:border-b-0 lg:border-r border-amber-500/25 pb-3.5 lg:pb-0 lg:pr-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-400/50 flex items-center justify-center text-2xl sm:text-3xl shrink-0">
                  {viewerPlayer.avatar}
                </div>
                <div>
                  <div className="font-extrabold text-lg sm:text-xl text-amber-200 leading-tight">
                    {viewerPlayer.name}
                  </div>
                  <div className="flex items-center gap-2 text-base sm:text-lg font-mono-num text-amber-300 mt-0.5">
                    <span className="inline-flex items-center gap-1.5 font-extrabold">
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
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-400/40 text-emerald-300 font-bold">
                    {language === 'bn' ? '🛡️ গুপ্তচর দ্বারা সুরক্ষিত' : '🛡️ Protected by Spy'}
                  </span>
                )}
                {viewerPlayer.pendingPickpocket && (
                  <span className="px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-400/40 text-purple-300 font-bold">
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
                      className="px-2 py-0.5 rounded-md bg-black/65 border border-amber-500/30 font-mono-num text-xs sm:text-sm font-bold text-amber-200 hover:border-amber-300 cursor-pointer"
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

            {/* Center: Player's Hand Cards — Always Side-by-Side (4 cols on desktop) */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center">
              {captainForced && (
                <div className="mb-2.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-200 text-xs sm:text-sm font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    {language === 'bn'
                      ? 'হাতে কামানচালক (৫) বা নাবিক (৭) থাকায় ক্যাপ্টেন (৮) খেলা বাধ্যতামূলক!'
                      : 'Mandatory Rule: Holding 5 or 7 with Captain (8) forces playing Captain!'}
                  </span>
                </div>
              )}

              <div className="flex items-start justify-center gap-3 sm:gap-5">
                {viewerPlayer.hand.map((card) => {
                  const isPlayable = isViewerTurn && playableUids.includes(card.uid);
                  const isSelected = selectedCardUid === card.uid;
                  const isMandatoryCard = captainForced && card.value === 8;
                  const charDef = CHARACTERS[card.value];

                  return (
                    <div
                      key={card.uid}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <PirateCard
                        value={card.value}
                        size="lg"
                        language={language}
                        selected={isSelected}
                        disabled={isViewerTurn && !isPlayable}
                        mandatory={isMandatoryCard}
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

            {/* Right: Action, Full Ability Text & Target/Guess Selection Panel (5 cols on desktop) */}
            <div className="lg:col-span-5 flex flex-col justify-between gap-3">
              {isViewerTurn && selectedCard && selectedCharDef ? (
                <div className="p-4 sm:p-5 rounded-2xl bg-black/55 border border-amber-500/35 space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-lg sm:text-xl font-extrabold text-amber-300">
                        {language === 'bn'
                          ? `নির্বাচিত: ${selectedCharDef.nameBn} (${selectedCharDef.bengaliNumber})`
                          : `Selected: ${selectedCharDef.nameEn} (#${selectedCharDef.value})`}
                      </span>
                      {selectedCard.value === 9 && (
                        <span className="px-2.5 py-1 rounded-lg bg-red-950/80 border border-red-500/50 text-xs sm:text-sm font-extrabold text-red-300">
                          {language === 'bn'
                            ? '⚠️ খেললে আপনি আউট হবেন!'
                            : '⚠️ Playing Pirate eliminates you!'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm sm:text-base lg:text-[17px] text-amber-100/95 leading-relaxed">
                      {language === 'bn'
                        ? selectedCharDef.shortDescBn
                        : selectedCharDef.shortDescEn}
                    </p>
                  </div>

                  {/* Target Opponent Selector if required */}
                  {validTargetIds.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-sm sm:text-base font-extrabold text-amber-200 block">
                        {language === 'bn'
                          ? '১. টার্গেট খেলোয়াড় বেছে নিন:'
                          : '1. Select Target Pirate:'}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {validTargetIds.map((tid) => {
                          const tPlayer = state.players.find((p) => p.id === tid);
                          if (!tPlayer) return null;
                          const chosen = selectedTargetId === tid;
                          return (
                            <button
                              key={tid}
                              type="button"
                              onClick={() => setSelectedTargetId(tid)}
                              className={`px-4 py-2 rounded-xl text-sm sm:text-base font-extrabold transition-colors flex items-center gap-2 cursor-pointer ${
                                chosen
                                  ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-300'
                                  : 'bg-black/65 border border-amber-500/35 text-amber-100 hover:border-amber-400'
                              }`}
                            >
                              <span className="text-lg">{tPlayer.avatar}</span>
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

                  {/* Guard (1) Character Guess Selector (Values 0, 2..9) — Full Un-Truncated Labels */}
                  {selectedCard.value === 1 && validTargetIds.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-sm sm:text-base font-extrabold text-amber-200 block">
                        {language === 'bn'
                          ? '২. প্রতিপক্ষের কার্ড অনুমান করুন (পাহারাদার ছাড়া):'
                          : '2. Guess Opponent’s Character (except Guard):'}
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {CHARACTER_LIST.filter((c) => c.value !== 1).map((c) => {
                          const isGuessed = selectedGuessValue === c.value;
                          return (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => setSelectedGuessValue(c.value)}
                              className={`px-3 py-2 rounded-xl text-sm sm:text-base font-bold transition-colors text-left leading-snug cursor-pointer ${
                                isGuessed
                                  ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-300 font-extrabold'
                                  : 'bg-black/65 border border-amber-500/30 text-amber-100 hover:border-amber-400'
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
                    className="w-full py-3.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-extrabold text-base sm:text-lg lg:text-xl shadow-lg transition-transform active:scale-95 cursor-pointer"
                  >
                    {language === 'bn'
                      ? `${selectedCharDef.nameBn} (${selectedCharDef.bengaliNumber}) কার্ডটি খেলুন`
                      : `Play ${selectedCharDef.nameEn} (#${selectedCharDef.value})`}
                  </button>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-black/45 border border-amber-500/25 text-center space-y-2">
                  <div className="text-base sm:text-lg lg:text-xl font-extrabold text-amber-200">
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

      {/* Full Public Discard History Modal */}
      {showFullDiscardModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="All Discarded Cards"
        >
          <div className="cabin-wood-panel max-w-4xl w-full rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-amber-500/25 pb-3.5">
              <h3 className="text-xl sm:text-2xl font-extrabold text-amber-300">
                {language === 'bn'
                  ? `এই রাউন্ডে ব্যবহৃত সকল কার্ড (${state.publicDiscardPile.length}টি)`
                  : `All Cards Played / Discarded This Round (${state.publicDiscardPile.length})`}
              </h3>
              <button
                type="button"
                onClick={() => setShowFullDiscardModal(false)}
                className="px-4 py-2 rounded-xl bg-amber-900/45 hover:bg-amber-800/60 text-sm sm:text-base font-bold text-amber-200 cursor-pointer"
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
