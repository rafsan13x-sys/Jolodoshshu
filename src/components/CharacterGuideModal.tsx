import React, { useState } from 'react';
import { Info, Search, ShieldAlert, Sparkles, X } from 'lucide-react';
import { CHARACTER_LIST } from '../game/cards';
import { CardValue, Language } from '../game/types';
import { PirateCard } from './PirateCard';

interface CharacterGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  initialSelectedValue?: CardValue | null;
  deckCounts?: Record<CardValue, number>;
}

type CategoryFilter = 'all' | 'attack' | 'intel_defense' | 'economy' | 'high_value';

export const CharacterGuideModal: React.FC<CharacterGuideModalProps> = ({
  isOpen,
  onClose,
  language,
  initialSelectedValue = null,
  deckCounts,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [selectedValue, setSelectedValue] = useState<CardValue>(initialSelectedValue ?? 9);

  React.useEffect(() => {
    if (initialSelectedValue !== null && initialSelectedValue !== undefined) {
      setSelectedValue(initialSelectedValue);
    }
  }, [initialSelectedValue]);

  if (!isOpen) return null;

  const matchesCategory = (val: CardValue): boolean => {
    if (filter === 'all') return true;
    if (filter === 'attack') return [1, 3, 5].includes(val);
    if (filter === 'intel_defense') return [2, 4].includes(val);
    if (filter === 'economy') return [0, 6, 7].includes(val);
    if (filter === 'high_value') return [8, 9].includes(val);
    return true;
  };

  const filteredCharacters = CHARACTER_LIST.filter((c) => {
    if (!matchesCategory(c.value)) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.nameBn.toLowerCase().includes(q) ||
      c.nameEn.toLowerCase().includes(q) ||
      c.fullDescBn.toLowerCase().includes(q) ||
      c.fullDescEn.toLowerCase().includes(q) ||
      String(c.value).includes(q) ||
      c.bengaliNumber.includes(q)
    );
  });

  const activeChar =
    CHARACTER_LIST.find((c) => c.value === selectedValue) ??
    filteredCharacters[0] ??
    CHARACTER_LIST[0];

  const countInDeck = deckCounts ? deckCounts[activeChar.value] : activeChar.defaultCount;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={language === 'bn' ? 'চরিত্র ও কার্ড পরিচিতি' : 'Character & Card Guide'}
    >
      <div className="cabin-wood-panel w-full max-w-6xl rounded-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-amber-500/25 bg-[#160e09]">
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-amber-300">
              {language === 'bn'
                ? '📖 চরিত্র পরিচিতি ও কার্ড গাইড (Character Guide)'
                : '📖 Pirate Character & Card Guide'}
            </h2>
            <p className="text-sm sm:text-base text-amber-100/80 mt-0.5">
              {language === 'bn'
                ? '০ থেকে ৯ মানের ১০টি চরিত্রের ক্ষমতা, সংখ্যা এবং কৌশল জেনে নিন'
                : 'Explore all 10 character cards (Values 0–9), deck quantities, abilities, and restrictions'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Character Guide"
            className="p-2.5 rounded-xl bg-amber-900/35 hover:bg-amber-700/55 text-amber-200 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="px-6 py-3.5 bg-[#1b110b] border-b border-amber-500/15 flex flex-wrap items-center justify-between gap-3.5">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-5 h-5 text-amber-400/75 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                language === 'bn'
                  ? 'চরিত্রের নাম বা মান লিখে খুঁজুন (যেমন: গুপ্তচর, 5, Pirate)...'
                  : 'Search character by name, value, or ability...'
              }
              aria-label="Search characters"
              className="w-full pl-11 pr-4 py-2 rounded-xl bg-black/50 border border-amber-500/35 text-sm sm:text-base text-amber-100 placeholder:text-amber-200/45 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1.5 bg-black/45 rounded-xl border border-amber-500/25 overflow-x-auto">
            {(
              [
                { id: 'all', bn: 'সব (১০)', en: 'All (10)' },
                { id: 'attack', bn: 'আক্রমণ', en: 'Attack' },
                { id: 'intel_defense', bn: 'গোয়েন্দা ও সুরক্ষা', en: 'Intel & Shield' },
                { id: 'economy', bn: 'কয়েন ও অদলবদল', en: 'Coin & Swap' },
                { id: 'high_value', bn: 'উচ্চ মান', en: 'High Value' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  filter === tab.id
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-amber-200/80 hover:text-amber-100'
                }`}
              >
                {language === 'bn' ? tab.bn : tab.en}
              </button>
            ))}
          </div>
        </div>

        {/* Body: Left character roster + Right detailed spotlight */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-amber-500/20">
          {/* Roster grid */}
          <div className="lg:col-span-6 p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[440px] lg:max-h-none overflow-y-auto">
            {filteredCharacters.map((char) => {
              const isSelected = char.value === activeChar.value;
              const qty = deckCounts ? deckCounts[char.value] : char.defaultCount;
              return (
                <button
                  key={char.value}
                  type="button"
                  onClick={() => setSelectedValue(char.value)}
                  className={`flex flex-col text-left p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-400 shadow-lg'
                      : 'bg-black/40 border-amber-500/25 hover:border-amber-400/55 hover:bg-black/55'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1.5">
                    <span className="font-mono-num text-base font-extrabold text-amber-300">
                      #{char.value} ({char.bengaliNumber})
                    </span>
                    <span className="text-xs sm:text-sm text-amber-200/80 font-mono-num font-bold">
                      {qty} {language === 'bn' ? 'টি কার্ড' : 'cards'}
                    </span>
                  </div>
                  <div className="font-extrabold text-base sm:text-lg text-[#f5ebd6]">
                    {language === 'bn' ? char.nameBn : char.nameEn}
                  </div>
                  <div className="text-xs sm:text-sm text-amber-300/80 font-semibold">
                    {language === 'bn' ? char.nameEn : char.nameBn}
                  </div>
                  <p className="text-xs sm:text-sm text-amber-100/90 mt-2 leading-relaxed">
                    {language === 'bn' ? char.shortDescBn : char.shortDescEn}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Selected Character Detail View */}
          <div className="lg:col-span-6 p-5 sm:p-6 bg-[#18100a] flex flex-col items-center sm:items-start gap-4">
            <div className="w-full flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <PirateCard
                value={activeChar.value}
                size="lg"
                language={language}
                className="shrink-0"
              />
              <div className="flex-1 text-center sm:text-left">
                <div className="text-sm font-bold text-amber-400 font-mono-num">
                  {language === 'bn'
                    ? `মান: ${activeChar.bengaliNumber} (${activeChar.value}) · ডেকে সংখ্যা: ${countInDeck}টি`
                    : `Value: ${activeChar.value} (${activeChar.bengaliNumber}) · In Deck: ${countInDeck}`}
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-amber-200 mt-1">
                  {activeChar.nameBn}
                </h3>
                <div className="text-base sm:text-lg font-bold text-amber-400/95">
                  {activeChar.nameEn}
                </div>

                <div className="mt-3.5 p-4 rounded-xl bg-black/50 border border-amber-500/30 text-left">
                  <div className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-amber-300 mb-1.5">
                    <Info className="w-4 h-4" />
                    <span>{language === 'bn' ? 'কার্ডের ক্ষমতা (Ability)' : 'Card Ability'}</span>
                  </div>
                  <p className="text-sm sm:text-base text-amber-50/95 leading-relaxed">
                    {language === 'bn' ? activeChar.fullDescBn : activeChar.fullDescEn}
                  </p>
                </div>
              </div>
            </div>

            {activeChar.restrictionBn && (
              <div className="w-full p-4 rounded-xl bg-red-950/55 border border-red-500/45 text-left">
                <div className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-red-300 mb-1">
                  <ShieldAlert className="w-5 h-5" />
                  <span>{language === 'bn' ? 'বিশেষ শর্ত / নিষেধাজ্ঞা' : 'Important Restriction'}</span>
                </div>
                <p className="text-sm sm:text-base text-red-100/95 leading-relaxed">
                  {language === 'bn' ? activeChar.restrictionBn : activeChar.restrictionEn}
                </p>
              </div>
            )}

            <div className="w-full p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 text-left">
              <div className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-amber-300 mb-1">
                <Sparkles className="w-5 h-5" />
                <span>{language === 'bn' ? 'কৌশলগত টিপস (Strategy Tip)' : 'Strategic Tip'}</span>
              </div>
              <p className="text-sm sm:text-base text-amber-100/95 leading-relaxed">
                {language === 'bn' ? activeChar.strategyBn : activeChar.strategyEn}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
