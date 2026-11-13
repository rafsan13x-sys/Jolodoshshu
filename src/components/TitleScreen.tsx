import React, { useState } from 'react';
import { BookOpen, Bot, Compass, Globe, HelpCircle, Layers, Play, Settings, Users } from 'lucide-react';
import { CHARACTERS, COIN_ASSET_URL } from '../game/cards';
import { getModeConfig } from '../game/modes';
import { CardValue, GameMode, Language, MatchModeId } from '../game/types';
import { PirateCard } from './PirateCard';

interface TitleScreenProps {
  language: Language;
  matchMode: MatchModeId;
  onToggleLanguage: () => void;
  onQuickStartAI: () => void;
  onOpenModeSelection: () => void;
  onOpenLobby: (mode: GameMode) => void;
  onOpenGuide: (initialCard?: CardValue) => void;
  onOpenHowToPlay: () => void;
  onOpenSettings: () => void;
}

const SHOWCASE_CARDS: CardValue[] = [9, 8, 5, 4, 0];

export const TitleScreen: React.FC<TitleScreenProps> = ({
  language,
  matchMode,
  onToggleLanguage,
  onQuickStartAI,
  onOpenModeSelection,
  onOpenLobby,
  onOpenGuide,
  onOpenHowToPlay,
  onOpenSettings,
}) => {
  const [spotlightCard, setSpotlightCard] = useState<CardValue>(9);
  const activeChar = CHARACTERS[spotlightCard];
  const activeModeDef = getModeConfig(matchMode);

  return (
    <main className="relative h-dvh max-h-dvh w-full wood-deck-bg safe-area-shell flex flex-col justify-between overflow-hidden select-none">
      {/* Subtle nautical rope & ocean horizon atmosphere */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_35%,rgba(12,26,42,0.82)_0%,rgba(16,11,7,0.92)_68%)]"
      />

      {/* Top utility corner (Language & Settings) */}
      <div className="relative z-10 w-full max-w-[96vw] mx-auto flex items-center justify-between px-3 sm:px-8 pt-2 sm:pt-4 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-base text-amber-200/90 font-mono-num font-semibold min-w-0">
          <img
            src={COIN_ASSET_URL}
            alt="Pirate Coin"
            referrerPolicy="no-referrer"
            className="w-6 h-6 sm:w-8 sm:h-8 object-contain shrink-0"
          />
          <span className="truncate">
            {language === 'bn'
              ? `মোড: ${activeModeDef.badgeEmoji} ${activeModeDef.nameBn} (${activeModeDef.playerCountLabelBn})`
              : `Mode: ${activeModeDef.badgeEmoji} ${activeModeDef.nameEn} (${activeModeDef.playerCountLabelEn})`}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleLanguage}
            aria-label="Switch Language"
            className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-black/60 hover:bg-amber-900/50 active:scale-95 border border-amber-500/40 text-xs sm:text-base font-bold text-amber-200 transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            {language === 'bn' ? 'বাংলা / EN' : 'EN / বাংলা'}
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Open Settings"
            className="p-2 sm:p-2.5 rounded-xl bg-black/60 hover:bg-amber-900/50 active:scale-95 border border-amber-500/40 text-amber-200 transition-all cursor-pointer"
            title={language === 'bn' ? 'সেটিংস' : 'Settings'}
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Main Split: Uses 96% of Viewport Width on Desktop, Compact Fit on Mobile */}
      <div className="relative z-10 w-full max-w-[96vw] mx-auto px-3 sm:px-8 py-1.5 sm:py-4 grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-6 lg:gap-10 items-center my-auto min-h-0">
        {/* Left Column: Inline SVG Title Lockup + Primary CTA (5 cols on desktop) */}
        <div className="lg:col-span-5 space-y-2.5 sm:space-y-4 text-left">
          {/* Custom Inline SVG Pirate Crest & Title Lockup */}
          <div className="space-y-1.5 sm:space-y-3">
            <svg
              viewBox="0 0 520 135"
              className="w-full max-w-[270px] min-[390px]:max-w-[320px] sm:max-w-[460px] lg:max-w-[500px] h-auto drop-shadow-[0_10px_24px_rgba(0,0,0,0.85)]"
              role="img"
              aria-label="জলদস্যু (Jolodoshshu) Pirate Card Game"
            >
              <defs>
                <linearGradient id="goldPlaque" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fde68a" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#b45309" />
                </linearGradient>
                <linearGradient id="crimsonBanner" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#450a0a" />
                  <stop offset="50%" stopColor="#991b1b" />
                  <stop offset="100%" stopColor="#450a0a" />
                </linearGradient>
              </defs>

              {/* Crossed Cutlass Blades behind Plaque */}
              <path
                d="M35 115 L145 15 M35 15 L145 115"
                stroke="#d6d3d1"
                strokeWidth="5"
                strokeLinecap="round"
                opacity="0.7"
              />
              {/* Ornate Pirate Ship Wheel / Skull Medallion Frame */}
              <circle
                cx="90"
                cy="65"
                r="46"
                fill="#1c110b"
                stroke="url(#goldPlaque)"
                strokeWidth="4"
              />
              <circle
                cx="90"
                cy="65"
                r="36"
                fill="none"
                stroke="#b45309"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              {/* Stylized Skull Icon inside Crest */}
              <path
                d="M90 36 C73 36 64 47 64 61 C64 70 69 76 74 80 L74 90 L106 90 L106 80 C111 76 116 70 116 61 C116 47 107 36 90 36 Z"
                fill="#f5ebd6"
              />
              <circle cx="80" cy="60" r="6.5" fill="#1c110b" />
              <circle cx="100" cy="60" r="6.5" fill="#1c110b" />
              <path d="M87 71 L90 65 L93 71 Z" fill="#1c110b" />
              <path
                d="M80 82 L80 89 M87 82 L87 89 M93 82 L93 89 M100 82 L100 89"
                stroke="#1c110b"
                strokeWidth="2.5"
              />

              {/* Main Bengali Title Lockup */}
              <text
                x="156"
                y="78"
                fill="url(#goldPlaque)"
                fontSize="64"
                fontWeight="800"
                fontFamily="'Hind Siliguri', sans-serif"
              >
                জলদস্যু
              </text>

              {/* Subtitle Ribbon */}
              <rect
                x="158"
                y="92"
                width="335"
                height="28"
                rx="6"
                fill="url(#crimsonBanner)"
                stroke="#f59e0b"
                strokeWidth="1.2"
              />
              <text
                x="325"
                y="111"
                textAnchor="middle"
                fill="#fef3c7"
                fontSize="13"
                fontWeight="700"
                letterSpacing="2.5"
                fontFamily="'Cinzel', serif"
              >
                JOLODOSHSHU · PIRATE CARD GAME
              </text>
            </svg>

            <p className="text-xs min-[390px]:text-sm sm:text-base lg:text-lg text-amber-100/90 max-w-2xl leading-snug sm:leading-relaxed line-clamp-2 sm:line-clamp-none">
              {language === 'bn'
                ? 'জলদস্যু জাহাজের গোপন পরিচয়ের লড়াই! ৫টি রোমাঞ্চকর মোডে খেলুন — ক্লাসিক, ডুয়ো ক্রু ব্যাটল, ট্রিও ক্রু, ক্যাপ্টেন লাস্ট স্ট্যান্ড এবং ট্রেজার রাশ!'
                : 'Aboard the pirate galleon, every crewmate hides a secret identity. Play across 5 thrilling modes — Classic FFA, Duo Crew Battle, Trio Crews, Captain 1v3, and Treasure Rush!'}
            </p>
          </div>

          {/* Primary & Mode Actions */}
          <div className="space-y-1.5 sm:space-y-2.5">
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                data-start="true"
                onClick={onQuickStartAI}
                className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 px-4 py-2.5 sm:px-7 sm:py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-lg shadow-[0_10px_28px_rgba(245,158,11,0.35)] transition-transform active:scale-95 whitespace-nowrap cursor-pointer"
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current shrink-0" />
                <span>
                  {language === 'bn'
                    ? `এখনই খেলুন (${activeModeDef.nameBn})`
                    : `Quick Start (${activeModeDef.nameEn})`}
                </span>
              </button>

              <button
                type="button"
                data-testid="btn-open-mode-select"
                onClick={onOpenModeSelection}
                className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-5 sm:py-3.5 rounded-xl bg-gradient-to-r from-[#2c190e] to-[#12332b] hover:from-[#3d2314] hover:to-[#18453a] active:scale-95 border-2 border-amber-400/80 text-amber-200 font-extrabold text-xs sm:text-base transition-all whitespace-nowrap cursor-pointer shadow-md"
              >
                <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 shrink-0" />
                <span>
                  {language === 'bn'
                    ? 'গেম মোড (৫টি মোড)'
                    : 'Game Modes (5 Modes)'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onOpenLobby('ai')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-3.5 rounded-xl bg-black/60 hover:bg-amber-950/65 active:scale-95 border border-amber-500/40 text-amber-200 font-bold text-xs sm:text-base transition-all whitespace-nowrap cursor-pointer"
              >
                <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
                <span>{language === 'bn' ? 'লবি ও টিম' : 'Lobby & Teams'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => onOpenLobby('local')}
                className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-[#1f140d] hover:bg-amber-950/60 active:scale-95 border border-amber-500/30 text-amber-100 text-xs sm:text-base font-bold transition-all cursor-pointer"
              >
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
                <span className="truncate">
                  {language === 'bn' ? 'লোকাল (Pass & Play)' : 'Local Pass & Play'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onOpenLobby('online')}
                className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-[#1f140d] hover:bg-amber-950/60 active:scale-95 border border-amber-500/30 text-amber-100 text-xs sm:text-base font-bold transition-all cursor-pointer"
              >
                <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
                <span className="truncate">
                  {language === 'bn' ? 'অনলাইন মাল্টিপ্লেয়ার রুম' : 'Online Multiplayer Room'}
                </span>
              </button>
            </div>

            {/* Secondary Reference Modals */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-0.5">
              <button
                type="button"
                onClick={() => onOpenGuide()}
                className="flex items-center gap-1.5 text-xs sm:text-base font-bold text-amber-300 hover:text-amber-200 underline-offset-4 hover:underline cursor-pointer"
              >
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span>
                  {language === 'bn' ? 'চরিত্র ও কার্ড গাইড (১০টি কার্ড)' : 'Character Guide (All 10 Cards)'}
                </span>
              </button>
              <span aria-hidden="true" className="text-amber-500/40">
                ·
              </span>
              <button
                type="button"
                onClick={onOpenHowToPlay}
                className="flex items-center gap-1.5 text-xs sm:text-base font-bold text-amber-300 hover:text-amber-200 underline-offset-4 hover:underline cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span>{language === 'bn' ? 'কীভাবে খেলবেন (নিয়মাবলী)' : 'How to Play & Rules'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Pirate Card Fan Showcase (compact strip on mobile/tablet, full panel on desktop) */}
        <div className="lg:col-span-7 flex flex-col items-center min-w-0">
          <div className="cabin-wood-panel w-full rounded-2xl p-3 sm:p-5 lg:p-7 relative">
            <div className="flex items-center justify-between gap-2 mb-2 sm:mb-4">
              <div className="flex items-center gap-2 min-w-0">
                <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
                <span className="text-xs sm:text-lg font-extrabold text-amber-300 truncate">
                  {language === 'bn'
                    ? 'ইন্টারেক্টিভ চরিত্র প্রদর্শনী (ক্লিক করে দেখুন)'
                    : 'Interactive Card Deck Showcase (Click to Inspect)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onOpenGuide(spotlightCard)}
                className="text-xs sm:text-base font-bold text-amber-300 hover:text-amber-100 underline shrink-0 cursor-pointer"
              >
                {language === 'bn' ? 'সব ১০টি কার্ড দেখুন →' : 'View All 10 Cards →'}
              </button>
            </div>

            {/* Interactive Row of 5 Iconic Cards */}
            <div className="flex items-center justify-start sm:justify-center gap-2 sm:gap-4 py-1.5 sm:py-3 overflow-x-auto no-scrollbar">
              {SHOWCASE_CARDS.map((val) => (
                <PirateCard
                  key={val}
                  value={val}
                  size="xs"
                  language={language}
                  selected={spotlightCard === val}
                  onClick={() => setSpotlightCard(val)}
                  className="sm:!w-26 sm:!h-39"
                />
              ))}
            </div>

            {/* Active Spotlight Card Info Strip */}
            <div className="mt-2 sm:mt-4 p-2.5 sm:p-5 rounded-xl bg-black/55 border border-amber-500/30 flex items-center justify-between gap-3">
              <div className="space-y-0.5 sm:space-y-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono-num text-xs sm:text-lg font-extrabold text-amber-400 shrink-0">
                    #{activeChar.value} ({activeChar.bengaliNumber})
                  </span>
                  <h3 className="text-sm sm:text-xl lg:text-2xl font-extrabold text-amber-100 truncate">
                    {activeChar.nameBn} · {activeChar.nameEn}
                  </h3>
                </div>
                <p className="text-xs sm:text-base text-amber-100/90 leading-snug line-clamp-2 sm:line-clamp-none">
                  {language === 'bn' ? activeChar.fullDescBn : activeChar.fullDescEn}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenGuide(activeChar.value)}
                className="px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/45 text-xs sm:text-base font-bold text-amber-200 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {language === 'bn' ? 'বিস্তারিত' : 'Details'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Single flat borderless inline control-hint line in the bottom safe margin */}
      <div className="relative z-10 px-4 py-1.5 sm:py-3 text-center text-[11px] sm:text-sm text-amber-200/70 font-mono-num truncate shrink-0">
        {language === 'bn'
          ? 'Enter / Space খেলা শুরু · 1 / 2 কার্ড নির্বাচন · G চরিত্র গাইড · M সাউন্ড মিউট · Esc বিরতি'
          : 'Enter / Space Start Game · 1 / 2 Select Card · G Character Guide · M Mute Audio · Esc Pause'}
      </div>
    </main>
  );
};
