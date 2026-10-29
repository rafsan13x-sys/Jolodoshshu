import React from 'react';
import { RotateCcw, Settings, Volume2, VolumeX, X } from 'lucide-react';
import { CHARACTER_LIST, DEFAULT_DECK_COUNTS } from '../game/cards';
import { CardValue, GameSettings, PickpocketRule, TieRule } from '../game/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (partial: Partial<GameSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const lang = settings.language;
  const totalDeckCards = (Object.values(settings.deckCounts) as number[]).reduce(
    (sum, n) => sum + n,
    0
  );

  const handleDeckCountChange = (val: CardValue, delta: number) => {
    const current = settings.deckCounts[val] ?? 0;
    const next = Math.max(0, Math.min(10, current + delta));
    onUpdateSettings({
      deckCounts: {
        ...settings.deckCounts,
        [val]: next,
      },
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'bn' ? 'গেম সেটিংস ও নিয়ম কনফিগারেশন' : 'Game Settings & Rules Configuration'}
    >
      <div className="cabin-wood-panel w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-amber-500/25 bg-[#160e09]">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-amber-300">
              {lang === 'bn'
                ? 'সেটিংস ও নিয়ম কাস্টমাইজেশন (Settings & Rules)'
                : 'Settings & Configurable Rules'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Settings"
            className="p-2.5 rounded-xl bg-amber-900/35 hover:bg-amber-700/55 text-amber-200 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Language, Audio & Accessibility */}
          <section className="space-y-3">
            <h3 className="text-base sm:text-lg font-extrabold text-amber-300">
              {lang === 'bn' ? '০১. ভাষা, শব্দ ও অ্যাক্সেসিবিলিটি' : '01. Language, Sound & Accessibility'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Language Switch */}
              <div className="p-3.5 rounded-xl bg-black/45 border border-amber-500/25 flex items-center justify-between">
                <span className="text-sm sm:text-base font-bold text-amber-100">
                  {lang === 'bn' ? 'ভাষা (Language)' : 'Language'}
                </span>
                <div className="flex items-center gap-1 bg-black/65 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ language: 'bn' })}
                    className={`px-3 py-1 rounded text-sm font-bold transition-colors cursor-pointer ${
                      lang === 'bn' ? 'bg-amber-500 text-slate-950' : 'text-amber-200/75'
                    }`}
                  >
                    বাংলা
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ language: 'en' })}
                    className={`px-3 py-1 rounded text-sm font-bold transition-colors cursor-pointer ${
                      lang === 'en' ? 'bg-amber-500 text-slate-950' : 'text-amber-200/75'
                    }`}
                  >
                    EN
                  </button>
                </div>
              </div>

              {/* Sound Effects */}
              <button
                type="button"
                onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
                className="p-3.5 rounded-xl bg-black/45 border border-amber-500/25 flex items-center justify-between hover:border-amber-400/45 transition-colors cursor-pointer"
              >
                <span className="text-sm sm:text-base font-bold text-amber-100 flex items-center gap-2">
                  {settings.soundEnabled ? (
                    <Volume2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-red-400" />
                  )}
                  {lang === 'bn' ? 'সাউন্ড ইফেক্টস' : 'Sound Effects'}
                </span>
                <span className="text-sm font-extrabold text-amber-300">
                  {settings.soundEnabled
                    ? lang === 'bn'
                      ? 'চালু'
                      : 'ON'
                    : lang === 'bn'
                    ? 'বন্ধ'
                    : 'OFF'}
                </span>
              </button>

              {/* Reduced Motion */}
              <button
                type="button"
                onClick={() => onUpdateSettings({ reducedMotion: !settings.reducedMotion })}
                className="p-3.5 rounded-xl bg-black/45 border border-amber-500/25 flex items-center justify-between hover:border-amber-400/45 transition-colors cursor-pointer"
              >
                <span className="text-sm sm:text-base font-bold text-amber-100">
                  {lang === 'bn' ? 'অ্যানিমেশন কমানো' : 'Reduced Motion'}
                </span>
                <span className="text-sm font-extrabold text-amber-300">
                  {settings.reducedMotion
                    ? lang === 'bn'
                      ? 'চালু'
                      : 'ON'
                    : lang === 'bn'
                    ? 'বন্ধ'
                    : 'OFF'}
                </span>
              </button>
            </div>
          </section>

          {/* Coin Economy & Victory Table */}
          <section className="space-y-3">
            <h3 className="text-base sm:text-lg font-extrabold text-amber-300">
              {lang === 'bn'
                ? '০২. কয়েন পুরস্কার ও জয়ের লক্ষ্যমাত্রা (Configurable Coin Table)'
                : '02. Coin Economy & Victory Thresholds'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <label className="p-3.5 rounded-xl bg-black/45 border border-amber-500/25 flex flex-col gap-2">
                <span className="text-sm sm:text-base font-bold text-amber-100">
                  {lang === 'bn' ? 'জয়ের জন্য প্রয়োজনীয় কয়েন' : 'Target Coins to Win'}
                </span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={settings.targetCoins}
                  onChange={(e) =>
                    onUpdateSettings({ targetCoins: Math.max(1, Number(e.target.value) || 4) })
                  }
                  className="px-3.5 py-2 rounded-lg bg-black/65 border border-amber-500/35 font-mono-num text-base font-bold text-amber-200"
                />
              </label>

              <label className="p-3.5 rounded-xl bg-black/45 border border-amber-500/25 flex flex-col gap-2">
                <span className="text-sm sm:text-base font-bold text-amber-100">
                  {lang === 'bn' ? 'প্রতি রাউন্ড জয়ে কয়েন পুরস্কার' : 'Coins Awarded per Round Win'}
                </span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={settings.roundVictoryReward}
                  onChange={(e) =>
                    onUpdateSettings({
                      roundVictoryReward: Math.max(1, Number(e.target.value) || 2),
                    })
                  }
                  className="px-3.5 py-2 rounded-lg bg-black/65 border border-amber-500/35 font-mono-num text-base font-bold text-amber-200"
                />
              </label>

              <label className="p-3.5 rounded-xl bg-black/45 border border-amber-500/25 flex flex-col gap-2">
                <span className="text-sm sm:text-base font-bold text-amber-100">
                  {lang === 'bn' ? 'সর্বোচ্চ রাউন্ড সংখ্যা' : 'Max Rounds'}
                </span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={settings.maxRounds}
                  onChange={(e) =>
                    onUpdateSettings({ maxRounds: Math.max(1, Number(e.target.value) || 10) })
                  }
                  className="px-3.5 py-2 rounded-lg bg-black/65 border border-amber-500/35 font-mono-num text-base font-bold text-amber-200"
                />
              </label>
            </div>
          </section>

          {/* Configurable Rule Assumptions */}
          <section className="space-y-3">
            <h3 className="text-base sm:text-lg font-extrabold text-amber-300">
              {lang === 'bn'
                ? '০৩. বিশেষ নিয়ম কনফিগারেশন (Rule Assumptions)'
                : '03. Configurable Rule Assumptions'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <label className="p-3.5 rounded-xl bg-black/45 border border-amber-500/25 flex flex-col gap-2">
                <span className="text-sm sm:text-base font-bold text-amber-100">
                  {lang === 'bn' ? 'ছিচকে চোর (০) কয়েন চুরির নিয়ম' : 'Pickpocket (0) Resolution Rule'}
                </span>
                <select
                  value={settings.pickpocketRule}
                  onChange={(e) =>
                    onUpdateSettings({ pickpocketRule: e.target.value as PickpocketRule })
                  }
                  className="px-3.5 py-2 rounded-lg bg-[#160e09] border border-amber-500/35 text-sm sm:text-base text-amber-200"
                >
                  <option value="next_turn">
                    {lang === 'bn'
                      ? 'পরবর্তী টার্ন পর্যন্ত টিকে থাকলে (ডিফল্ট ট্রান্সক্রিপ্ট নিয়ম)'
                      : 'Survive 1 full round of turns until next turn (Default)'}
                  </option>
                  <option value="round_end">
                    {lang === 'bn'
                      ? 'রাউন্ডের শেষে একমাত্র জীবিত ছিচকে চোর হলে (কার্ডের টেক্সট)'
                      : 'Survive to end of round as sole Pickpocket (Card Print)'}
                  </option>
                </select>
              </label>

              <label className="p-3.5 rounded-xl bg-black/45 border border-amber-500/25 flex flex-col gap-2">
                <span className="text-sm sm:text-base font-bold text-amber-100">
                  {lang === 'bn' ? 'রাউন্ড শেষে সমান মান (টাই) হলে নিয়ম' : 'End-of-Round Tie Rule'}
                </span>
                <select
                  value={settings.tieRule}
                  onChange={(e) => onUpdateSettings({ tieRule: e.target.value as TieRule })}
                  className="px-3.5 py-2 rounded-lg bg-[#160e09] border border-amber-500/35 text-sm sm:text-base text-amber-200"
                >
                  <option value="split">
                    {lang === 'bn'
                      ? 'পুরস্কার সমানভাবে ভাগ হবে (ডিফল্ট)'
                      : 'Share round reward equally (Default)'}
                  </option>
                  <option value="all_full">
                    {lang === 'bn'
                      ? 'টাই হওয়া সবাই পূর্ণ কয়েন পাবে'
                      : 'All tied winners get full coin reward'}
                  </option>
                  <option value="discard_sum">
                    {lang === 'bn'
                      ? 'ডিসকার্ড করা কার্ডের যোগফল দিয়ে টাইব্রেকার'
                      : 'Tiebreak by sum of discarded cards'}
                  </option>
                </select>
              </label>
            </div>
          </section>

          {/* Configurable Deck Composition */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-amber-300">
                  {lang === 'bn'
                    ? `০৪. ডেক কার্ড সংখ্যা কাস্টমাইজেশন (মোট: ${totalDeckCards}টি কার্ড)`
                    : `04. Deck Composition (${totalDeckCards} Cards Total)`}
                </h3>
                <p className="text-sm text-amber-100/75">
                  {lang === 'bn'
                    ? 'ছোট বা বড় প্লেয়ার গ্রুপের জন্য যেকোনো চরিত্রের কার্ড সংখ্যা পরিবর্তন করতে পারেন'
                    : 'Customize card copies for smaller/larger player groups or restore the official 21-card deck'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onUpdateSettings({ deckCounts: { ...DEFAULT_DECK_COUNTS } })}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-900/45 hover:bg-amber-800/65 border border-amber-500/35 text-sm font-bold text-amber-200 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{lang === 'bn' ? 'ডিফল্ট ২১ কার্ড' : 'Reset (21 Cards)'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {CHARACTER_LIST.map((char) => {
                const count = settings.deckCounts[char.value] ?? 0;
                return (
                  <div
                    key={char.value}
                    className="p-3 rounded-xl bg-black/45 border border-amber-500/25 flex flex-col justify-between gap-2.5"
                  >
                    <div>
                      <div className="text-sm font-mono-num font-extrabold text-amber-400">
                        #{char.value} ({char.bengaliNumber})
                      </div>
                      <div className="text-sm sm:text-base font-bold text-amber-100 break-words">
                        {lang === 'bn' ? char.nameBn : char.nameEn}
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-black/55 rounded-lg p-1.5">
                      <button
                        type="button"
                        aria-label={`Decrease ${char.nameEn} count`}
                        onClick={() => handleDeckCountChange(char.value, -1)}
                        className="w-7 h-7 rounded bg-amber-900/45 hover:bg-amber-700/65 text-amber-200 text-sm font-bold cursor-pointer"
                      >
                        -
                      </button>
                      <span className="font-mono-num text-sm sm:text-base font-extrabold text-amber-300">
                        {count}
                      </span>
                      <button
                        type="button"
                        aria-label={`Increase ${char.nameEn} count`}
                        onClick={() => handleDeckCountChange(char.value, 1)}
                        className="w-7 h-7 rounded bg-amber-900/45 hover:bg-amber-700/65 text-amber-200 text-sm font-bold cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#160e09] border-t border-amber-500/20 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-base font-extrabold transition-colors cursor-pointer"
          >
            {lang === 'bn' ? 'সংরক্ষণ ও বন্ধ করুন' : 'Save & Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
