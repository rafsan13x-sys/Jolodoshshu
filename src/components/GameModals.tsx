import React, { useState } from 'react';
import { Award, Eye, Lock, Play, RotateCcw, Swords, Trophy } from 'lucide-react';
import { CHARACTERS, COIN_ASSET_URL } from '../game/cards';
import { CardValue, GameState, Language } from '../game/types';
import { PirateCard } from './PirateCard';

/**
 * 1. Local Pass-the-Device Privacy Screen
 */
export const PrivacyOverlay: React.FC<{
  state: GameState;
  onUnlock: () => void;
  language: Language;
}> = ({ state, onUnlock, language }) => {
  const activePlayer = state.players[state.activePlayerIndex];
  if (!activePlayer) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#090d14]/96 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Pass the Device Privacy Screen"
    >
      <div className="cabin-wood-panel max-w-lg w-full rounded-2xl p-7 text-center space-y-5">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-amber-500/20 border-2 border-amber-400/45 flex items-center justify-center text-4xl">
          {activePlayer.avatar}
        </div>
        <div>
          <div className="text-sm font-mono-num uppercase tracking-wider text-amber-400 font-bold">
            {language === 'bn' ? 'গোপন টার্ন সুরক্ষা (Pass the Device)' : 'Private Turn Handover'}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-amber-200 mt-1.5">
            {activePlayer.name}
          </h2>
          <p className="text-base sm:text-lg text-amber-100/85 mt-2.5 leading-relaxed">
            {language === 'bn'
              ? `ডিভাইসটি এখন ${activePlayer.name}-এর হাতে দিন। অন্য খেলোয়াড়রা স্ক্রিনের দিকে তাকাবেন না!`
              : `Please pass the device to ${activePlayer.name}. Make sure no other pirates are peeking at the screen!`}
          </p>
        </div>

        <button
          type="button"
          onClick={onUnlock}
          className="w-full py-3.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-base sm:text-lg flex items-center justify-center gap-2.5 shadow-lg transition-transform active:scale-95 cursor-pointer"
        >
          <Lock className="w-5 h-5" />
          <span>
            {language === 'bn'
              ? `আমি ${activePlayer.name}, আমার কার্ড দেখান`
              : `I am ${activePlayer.name} — Reveal My Hand`}
          </span>
        </button>
      </div>
    </div>
  );
};

/**
 * 2. Merchant (6) Card Selection Overlay
 */
export const MerchantModal: React.FC<{
  state: GameState;
  language: Language;
  onResolve: (keepUid: string) => void;
  onInspectCard: (val: CardValue) => void;
}> = ({ state, language, onResolve, onInspectCard }) => {
  const pending = state.pendingMerchant;
  const [selectedUid, setSelectedUid] = useState<string | null>(
    pending?.options[0]?.uid ?? null
  );

  if (!pending) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/82 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Merchant Card Selection"
    >
      <div className="cabin-wood-panel max-w-3xl w-full rounded-2xl p-6 sm:p-7 text-center space-y-5">
        <div>
          <span className="text-sm font-mono-num font-bold text-amber-400">
            {language === 'bn' ? 'বণিক (৬) এর বিশেষ ক্ষমতা' : 'Merchant (6) Ability'}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-amber-200 mt-1">
            {language === 'bn'
              ? '১টি কার্ড আপনার হাতে রাখার জন্য বেছে নিন'
              : 'Choose 1 Card to Keep Secretly in Your Hand'}
          </h2>
          <p className="text-sm sm:text-base text-amber-100/85 mt-1.5">
            {language === 'bn'
              ? 'অন্য কার্ডগুলো গোপনে ডেকের একদম নিচে চলে যাবে'
              : 'The remaining unchosen card(s) will be placed secretly at the bottom of the draw deck'}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-5 py-3">
          {pending.options.map((card) => {
            const isChosen = selectedUid === card.uid;
            const def = CHARACTERS[card.value];
            return (
              <div key={card.uid} className="flex flex-col items-center gap-2">
                <PirateCard
                  value={card.value}
                  size="lg"
                  language={language}
                  selected={isChosen}
                  onClick={() => setSelectedUid(card.uid)}
                  onInspect={onInspectCard}
                />
                <span className="text-base font-extrabold text-amber-200">
                  {language === 'bn' ? def.nameBn : def.nameEn}
                </span>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          disabled={!selectedUid}
          onClick={() => selectedUid && onResolve(selectedUid)}
          className="px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-extrabold text-base sm:text-lg shadow-lg transition-transform active:scale-95 cursor-pointer"
        >
          {language === 'bn' ? 'এই কার্ডটি হাতে রাখুন' : 'Keep Selected Card in Hand'}
        </button>
      </div>
    </div>
  );
};

/**
 * 3. Private Reveal Modal (Ship Worker Inspection & Swordsman Duel)
 */
export const PrivateRevealModal: React.FC<{
  state: GameState;
  language: Language;
  onAcknowledge: () => void;
}> = ({ state, language, onAcknowledge }) => {
  const reveal = state.activeReveal;
  if (!reveal) return null;

  const actor = state.players.find((p) => p.id === reveal.actorId);
  const target = state.players.find((p) => p.id === reveal.targetId);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/82 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Secret Card Reveal"
    >
      <div className="cabin-wood-panel max-w-2xl w-full rounded-2xl p-6 sm:p-7 text-center space-y-5">
        <div className="flex items-center justify-center gap-2.5 text-amber-300">
          {reveal.type === 'swordsman_duel' ? (
            <Swords className="w-7 h-7" />
          ) : (
            <Eye className="w-7 h-7" />
          )}
          <h2 className="text-2xl sm:text-3xl font-extrabold">
            {reveal.type === 'swordsman_duel'
              ? language === 'bn'
                ? '⚔️ তলোয়ারবাজের গোপন ডুয়েল!'
                : '⚔️ Swordsman Secret Duel!'
              : language === 'bn'
              ? '🔍 জাহাজ কর্মচারীর গোপন পর্যবেক্ষণ'
              : '🔍 Ship Worker Secret Inspection'}
          </h2>
        </div>

        <p className="text-base sm:text-lg text-amber-100/95 leading-relaxed">
          {language === 'bn' ? reveal.messageBn : reveal.messageEn}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-6 py-3">
          {reveal.actorCard && (
            <div className="flex flex-col items-center gap-2">
              <span className="text-base font-extrabold text-amber-300">
                {actor?.name}
              </span>
              <PirateCard value={reveal.actorCard.value} size="lg" language={language} />
            </div>
          )}

          {reveal.type === 'swordsman_duel' && reveal.actorCard && reveal.targetCard && (
            <div className="text-3xl font-extrabold text-amber-400 font-mono-num">VS</div>
          )}

          {reveal.targetCard && (
            <div className="flex flex-col items-center gap-2">
              <span className="text-base font-extrabold text-amber-300">
                {target?.name}
              </span>
              <PirateCard value={reveal.targetCard.value} size="lg" language={language} />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onAcknowledge}
          className="px-8 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-base sm:text-lg transition-colors cursor-pointer"
        >
          {language === 'bn' ? 'দেখেছি, খেলা চালিয়ে যান' : 'Continue Game'}
        </button>
      </div>
    </div>
  );
};

/**
 * 4. Pause Modal (`document.body.dataset.state = 'paused'`)
 */
export const PauseModal: React.FC<{
  isOpen: boolean;
  language: Language;
  onResume: () => void;
  onRestart: () => void;
  onReturnToTitle: () => void;
}> = ({ isOpen, language, onResume, onRestart, onReturnToTitle }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Game Paused"
    >
      <div className="cabin-wood-panel max-w-md w-full rounded-2xl p-6 sm:p-7 text-center space-y-5">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-amber-300">
          {language === 'bn' ? '⏸️ খেলা বিরতি (Paused)' : '⏸️ Game Paused'}
        </h2>
        <p className="text-sm sm:text-base text-amber-100/80">
          {language === 'bn'
            ? 'খেলায় ফিরতে অথবা নতুন করে শুরু করতে নিচের বাটন বেছে নিন'
            : 'Take a breather, captain, or restart the voyage'}
        </p>

        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-base sm:text-lg cursor-pointer"
          >
            {language === 'bn' ? 'খেলায় ফিরুন (Resume)' : 'Resume Game'}
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-3 rounded-xl bg-amber-900/45 hover:bg-amber-800/60 border border-amber-500/35 text-amber-100 font-bold text-base sm:text-lg cursor-pointer"
          >
            {language === 'bn' ? 'পুনরায় শুরু করুন (Restart)' : 'Restart Match'}
          </button>
          <button
            type="button"
            onClick={onReturnToTitle}
            className="w-full py-3 rounded-xl bg-black/55 hover:bg-black/75 border border-white/15 text-amber-200/90 font-semibold text-base sm:text-lg cursor-pointer"
          >
            {language === 'bn' ? 'মূল মেনুতে ফিরুন (Title Screen)' : 'Return to Title Screen'}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * 5. Round Results & Overall Game Over / Victory Modal
 */
export const RoundAndGameResultsModal: React.FC<{
  state: GameState;
  language: Language;
  onNextRound: () => void;
  onRematch: () => void;
  onReturnToTitle: () => void;
}> = ({ state, language, onNextRound, onRematch, onReturnToTitle }) => {
  if (state.phase !== 'round_over' && state.phase !== 'game_over') return null;

  const isGameOver = state.phase === 'game_over';
  const lastRound = state.roundHistory[state.roundHistory.length - 1];
  const sortedStandings = [...state.players].sort((a, b) => b.coins - a.coins);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={isGameOver ? 'Game Over Results' : 'Round Results'}
    >
      <div className="cabin-wood-panel max-w-4xl w-full rounded-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Banner */}
        <div className="px-6 py-5 bg-gradient-to-r from-[#2c190e] via-[#3d2212] to-[#2c190e] border-b border-amber-500/30 text-center">
          <div className="inline-flex items-center gap-2 text-amber-400 text-sm font-mono-num font-bold uppercase tracking-wider mb-1">
            {isGameOver ? <Trophy className="w-5 h-5" /> : <Award className="w-5 h-5" />}
            <span>
              {isGameOver
                ? language === 'bn'
                  ? 'চূড়ান্ত ফলাফল (Final Match Victory)'
                  : 'Final Voyage Standings'
                : language === 'bn'
                ? `রাউন্ড ${state.round} সমাপ্ত`
                : `Round ${state.round} Complete`}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-amber-200">
            {isGameOver
              ? language === 'bn'
                ? `👑 বিজয়ী: ${sortedStandings[0]?.name}!`
                : `👑 Grand Winner: ${sortedStandings[0]?.name}!`
              : lastRound
              ? language === 'bn'
                ? `🏆 রাউন্ড বিজয়ী: ${lastRound.winnerNames.join(', ')}`
                : `🏆 Round Winner: ${lastRound.winnerNames.join(', ')}`
              : ''}
          </h2>

          {lastRound && (
            <p className="text-sm sm:text-base lg:text-lg text-amber-100/90 mt-1.5">
              {lastRound.reason === 'last_standing'
                ? language === 'bn'
                  ? 'অন্য সকল প্রতিপক্ষ রাউন্ড থেকে বাদ পড়ায় শেষ জীবিত জলদস্যু হিসেবে জয়ী!'
                  : 'Won as the last pirate standing after all rivals were eliminated!'
                : language === 'bn'
                ? 'ড্র ডেক শেষ হওয়ায় হাতের সর্বোচ্চ মানের কার্ডের মাধ্যমে জয়ী!'
                : 'Won the end-of-deck showdown with the highest card value in hand!'}
            </p>
          )}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Revealed Surviving Hands + Secret Removed Card */}
          {lastRound && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base sm:text-lg font-extrabold text-amber-300">
                  {language === 'bn'
                    ? 'খেলোয়াড়দের হাতের কার্ড ও অর্জিত কয়েন'
                    : 'Revealed Hands & Coins Earned This Round'}
                </h3>
                {lastRound.removedCard && (
                  <div className="text-sm sm:text-base text-amber-200/90">
                    {language === 'bn' ? 'রাউন্ডের গোপন সরানো কার্ড ছিল: ' : 'Secret Removed Card: '}
                    <strong className="text-amber-300">
                      {language === 'bn'
                        ? `${CHARACTERS[lastRound.removedCard.value].nameBn} (${CHARACTERS[lastRound.removedCard.value].bengaliNumber})`
                        : `${CHARACTERS[lastRound.removedCard.value].nameEn} (#${lastRound.removedCard.value})`}
                    </strong>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {sortedStandings.map((p, idx) => {
                  const isRoundWinner = lastRound.winnerIds.includes(p.id);
                  const remainingCard = p.hand[0];
                  return (
                    <div
                      key={p.id}
                      className={`p-4 rounded-xl border-2 flex items-center justify-between gap-3.5 ${
                        isRoundWinner
                          ? 'bg-amber-500/15 border-amber-400'
                          : 'bg-black/45 border-amber-500/25'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span className="text-3xl shrink-0">{p.avatar}</span>
                        <div className="min-w-0">
                          <div className="text-base sm:text-lg font-extrabold text-amber-100 break-words">
                            #{idx + 1} {p.name}
                          </div>
                          <div className="text-sm sm:text-base text-amber-200/85">
                            {p.isEliminated
                              ? language === 'bn'
                                ? `💀 বাদ পড়েছেন (${p.eliminationReasonBn ?? ''})`
                                : `💀 Eliminated (${p.eliminationReasonEn ?? ''})`
                              : remainingCard
                              ? language === 'bn'
                                ? `হাতে ছিল: ${CHARACTERS[remainingCard.value].nameBn} (${CHARACTERS[remainingCard.value].bengaliNumber})`
                                : `Held: ${CHARACTERS[remainingCard.value].nameEn} (#${remainingCard.value})`
                              : language === 'bn'
                              ? 'জীবিত'
                              : 'Survived'}
                          </div>
                        </div>
                      </div>

                      {/* Coin Count */}
                      <div className="flex items-center gap-2 shrink-0">
                        {p.roundCoinsEarned > 0 && (
                          <span className="text-sm sm:text-base font-mono-num font-extrabold text-emerald-400">
                            +{p.roundCoinsEarned}
                          </span>
                        )}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/65 border border-amber-500/35">
                          <img
                            src={COIN_ASSET_URL}
                            alt="Coin"
                            referrerPolicy="no-referrer"
                            className="w-5 h-5 object-contain"
                          />
                          <span className="font-mono-num text-base font-extrabold text-amber-300">
                            {p.coins} / {state.settings.targetCoins}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4.5 bg-[#160e09] border-t border-amber-500/25 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onReturnToTitle}
            className="px-5 py-2.5 rounded-xl bg-black/55 hover:bg-black/75 border border-amber-500/30 text-sm sm:text-base font-bold text-amber-200 cursor-pointer"
          >
            {language === 'bn' ? 'মূল মেনুতে ফিরুন' : 'Return to Title'}
          </button>

          {isGameOver ? (
            <button
              type="button"
              data-start="true"
              onClick={onRematch}
              className="flex items-center gap-2.5 px-7 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-base sm:text-lg shadow-lg cursor-pointer"
            >
              <RotateCcw className="w-5 h-5" />
              <span>{language === 'bn' ? 'আবার খেলুন (Play Again)' : 'Play Again (Rematch)'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onNextRound}
              className="flex items-center gap-2.5 px-7 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-base sm:text-lg shadow-lg cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>
                {language === 'bn'
                  ? `পরবর্তী রাউন্ড শুরু করুন (রাউন্ড ${state.round + 1})`
                  : `Start Next Round (Round ${state.round + 1})`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
