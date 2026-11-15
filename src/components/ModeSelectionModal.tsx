import React, { useState } from 'react';
import {
  Bot,
  Compass,
  Crown,
  Flame,
  Globe,
  Info,
  Play,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { COIN_ASSET_URL } from '../game/cards';
import { GAME_MODE_LIST, getModeConfig } from '../game/modes';
import { GameMode, GameModeDefinition, Language, MatchModeId } from '../game/types';

interface ModeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMatchMode: MatchModeId;
  onSelectMatchMode: (matchMode: MatchModeId) => void;
  connectionMode: GameMode;
  onChangeConnectionMode: (mode: GameMode) => void;
  targetCoins: number;
  onChangeTargetCoins: (coins: number) => void;
  language: Language;
  onToggleLanguage: () => void;
  onPlayNow: (matchMode: MatchModeId) => void;
  onOpenLobbyForMode: (matchMode: MatchModeId) => void;
}

/**
 * Custom Pirate SVG Illustration for each of the 5 Game Modes
 */
const ModeIllustration: React.FC<{ modeId: MatchModeId; selected: boolean }> = ({
  modeId,
  selected,
}) => {
  switch (modeId) {
    case 'classic':
      return (
        <svg
          viewBox="0 0 120 72"
          className="w-full h-11 sm:h-20 lg:h-24 object-contain drop-shadow"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="classicBg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#3b1d0e" />
              <stop offset="100%" stopColor="#140b06" />
            </linearGradient>
          </defs>
          <rect
            x="4"
            y="4"
            width="112"
            height="64"
            rx="10"
            fill="url(#classicBg)"
            stroke={selected ? '#fbbf24' : '#b45309'}
            strokeWidth="2"
          />
          {/* Crossed Cutlasses + Skull Emblem */}
          <path
            d="M32 56 L88 16 M32 16 L88 56"
            stroke="#fde68a"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <circle
            cx="60"
            cy="36"
            r="17"
            fill="#1f120b"
            stroke="#f59e0b"
            strokeWidth="2.5"
          />
          <text
            x="60"
            y="42"
            textAnchor="middle"
            fontSize="18"
            fill="#fef3c7"
          >
            🏴‍☠️
          </text>
        </svg>
      );

    case 'duo':
      return (
        <svg
          viewBox="0 0 120 72"
          className="w-full h-11 sm:h-20 lg:h-24 object-contain drop-shadow"
          aria-hidden="true"
        >
          <rect
            x="4"
            y="4"
            width="112"
            height="64"
            rx="10"
            fill="#14111d"
            stroke={selected ? '#fbbf24' : '#b45309'}
            strokeWidth="2"
          />
          {/* Left Crimson Crew Shield */}
          <circle
            cx="38"
            cy="36"
            r="16"
            fill="#7f1d1d"
            stroke="#f87171"
            strokeWidth="2"
          />
          <text x="38" y="41" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fee2e2">
            2
          </text>
          {/* VS Lightning */}
          <text x="60" y="40" textAnchor="middle" fontSize="11" fontWeight="900" fill="#fbbf24">
            VS
          </text>
          {/* Right Sapphire Crew Shield */}
          <circle
            cx="82"
            cy="36"
            r="16"
            fill="#0c4a6e"
            stroke="#38bdf8"
            strokeWidth="2"
          />
          <text x="82" y="41" textAnchor="middle" fontSize="13" fontWeight="800" fill="#e0f2fe">
            2
          </text>
        </svg>
      );

    case 'trio':
      return (
        <svg
          viewBox="0 0 120 72"
          className="w-full h-11 sm:h-20 lg:h-24 object-contain drop-shadow"
          aria-hidden="true"
        >
          <rect
            x="4"
            y="4"
            width="112"
            height="64"
            rx="10"
            fill="#0f1f1c"
            stroke={selected ? '#fbbf24' : '#b45309'}
            strokeWidth="2"
          />
          {/* Three Crew Medallions */}
          <circle cx="30" cy="38" r="13" fill="#7f1d1d" stroke="#f87171" strokeWidth="2" />
          <text x="30" y="42" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff">
            2
          </text>
          <circle cx="60" cy="28" r="13" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="2" />
          <text x="60" y="32" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff">
            2
          </text>
          <circle cx="90" cy="38" r="13" fill="#064e3b" stroke="#34d399" strokeWidth="2" />
          <text x="90" y="42" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff">
            2
          </text>
        </svg>
      );

    case 'captain':
      return (
        <svg
          viewBox="0 0 120 72"
          className="w-full h-11 sm:h-20 lg:h-24 object-contain drop-shadow"
          aria-hidden="true"
        >
          <rect
            x="4"
            y="4"
            width="112"
            height="64"
            rx="10"
            fill="#241309"
            stroke={selected ? '#fbbf24' : '#b45309'}
            strokeWidth="2"
          />
          {/* Captain Golden Crown Left */}
          <circle cx="36" cy="36" r="17" fill="#78350f" stroke="#fbbf24" strokeWidth="2.5" />
          <text x="36" y="42" textAnchor="middle" fontSize="16">
            👑
          </text>
          <text x="60" y="40" textAnchor="middle" fontSize="10" fontWeight="900" fill="#fbbf24">
            1v3
          </text>
          {/* 3 Challengers Right */}
          <circle cx="84" cy="25" r="9" fill="#7f1d1d" stroke="#f87171" strokeWidth="1.5" />
          <circle cx="76" cy="45" r="9" fill="#7f1d1d" stroke="#f87171" strokeWidth="1.5" />
          <circle cx="93" cy="45" r="9" fill="#7f1d1d" stroke="#f87171" strokeWidth="1.5" />
        </svg>
      );

    case 'race':
      return (
        <svg
          viewBox="0 0 120 72"
          className="w-full h-11 sm:h-20 lg:h-24 object-contain drop-shadow"
          aria-hidden="true"
        >
          <rect
            x="4"
            y="4"
            width="112"
            height="64"
            rx="10"
            fill="#1f1708"
            stroke={selected ? '#fbbf24' : '#b45309'}
            strokeWidth="2"
          />
          {/* Treasure Chest Progress Bar */}
          <rect
            x="18"
            y="44"
            width="84"
            height="10"
            rx="5"
            fill="#090604"
            stroke="#d97706"
            strokeWidth="1.5"
          />
          <rect x="20" y="46" width="62" height="6" rx="3" fill="#fbbf24" />
          <text x="60" y="34" textAnchor="middle" fontSize="18">
            🪙⚡🏆
          </text>
        </svg>
      );
  }
};

export const ModeSelectionModal: React.FC<ModeSelectionModalProps> = ({
  isOpen,
  onClose,
  selectedMatchMode,
  onSelectMatchMode,
  connectionMode,
  onChangeConnectionMode,
  targetCoins,
  onChangeTargetCoins,
  language,
  onToggleLanguage,
  onPlayNow,
  onOpenLobbyForMode,
}) => {
  const [inspectingMode, setInspectingMode] = useState<GameModeDefinition | null>(null);

  if (!isOpen) return null;

  const activeModeDef = getModeConfig(selectedMatchMode);

  return (
    <div
      data-testid="mode-selection-screen"
      className="fixed inset-0 z-50 h-dvh max-h-dvh w-full bg-black/90 safe-area-shell flex flex-col justify-between overflow-hidden select-none p-2 sm:p-4 lg:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={language === 'bn' ? 'গেম মোড নির্বাচন' : 'Select Game Mode'}
    >
      <div className="cabin-wood-panel w-full max-w-[96vw] mx-auto h-full rounded-2xl overflow-hidden flex flex-col justify-between border-2 border-[#d4af37]/60">
        {/* =================================================================
            1. COMPACT TOP BAR: Title, Host Settings, Mode Info & Language Toggle
           ================================================================= */}
        <div className="px-3 py-2 sm:px-5 sm:py-3.5 bg-[#150d08] border-b border-[#d4af37]/35 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Compass className="w-5 h-5 sm:w-7 sm:h-7 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm sm:text-xl lg:text-2xl font-extrabold text-amber-300 truncate">
                {language === 'bn'
                  ? '🏴‍☠️ গেম মোড নির্বাচন (৫টি মোড)'
                  : '🏴‍☠️ Select Pirate Game Mode (5 Modes)'}
              </h2>
              <p className="hidden sm:block text-xs sm:text-sm text-amber-100/80 truncate">
                {language === 'bn'
                  ? 'ক্লাসিক, ডুয়ো ক্রু, ট্রিও ক্রু, ক্যাপ্টেন লাস্ট স্ট্যান্ড অথবা ট্রেজার রাশ বেছে নিন'
                  : 'Choose Classic FFA, Duo Crew Battle, Trio Crews, Captain 1v3, or Treasure Rush'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              type="button"
              data-testid="btn-mode-info"
              onClick={() => setInspectingMode(activeModeDef)}
              className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 border border-[#d4af37]/50 text-xs sm:text-sm font-extrabold text-amber-200 flex items-center gap-1 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
              <span>{language === 'bn' ? 'মোড নিয়ম' : 'Mode Info'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleLanguage}
              className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-black/65 hover:bg-amber-900/50 border border-[#d4af37]/45 text-xs sm:text-sm font-bold text-amber-200 cursor-pointer"
            >
              {language === 'bn' ? 'EN' : 'বাংলা'}
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Mode Selection"
              className="p-1.5 sm:p-2 rounded-xl bg-amber-900/40 hover:bg-amber-800/60 text-amber-200 cursor-pointer"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* =================================================================
            2. HOST QUICK SETTINGS STRIP (AI / Local / Online + Target Coins)
           ================================================================= */}
        <div className="px-3 py-1.5 sm:px-5 sm:py-2.5 bg-[#1b110b] border-b border-[#d4af37]/20 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-[11px] sm:text-sm font-extrabold text-amber-200 mr-1">
              {language === 'bn' ? 'খেলার ধরন:' : 'Match Type:'}
            </span>
            <button
              type="button"
              onClick={() => onChangeConnectionMode('ai')}
              className={`px-2.5 py-1 rounded-lg text-[11px] sm:text-sm font-bold flex items-center gap-1 cursor-pointer ${
                connectionMode === 'ai'
                  ? 'bg-amber-500 text-slate-950 font-extrabold'
                  : 'bg-black/50 text-amber-200/80 border border-amber-500/25'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'এআই (AI)' : 'vs AI'}</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeConnectionMode('local')}
              className={`px-2.5 py-1 rounded-lg text-[11px] sm:text-sm font-bold flex items-center gap-1 cursor-pointer ${
                connectionMode === 'local'
                  ? 'bg-amber-500 text-slate-950 font-extrabold'
                  : 'bg-black/50 text-amber-200/80 border border-amber-500/25'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'লোকাল' : 'Pass & Play'}</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeConnectionMode('online')}
              className={`px-2.5 py-1 rounded-lg text-[11px] sm:text-sm font-bold flex items-center gap-1 cursor-pointer ${
                connectionMode === 'online'
                  ? 'bg-amber-500 text-slate-950 font-extrabold'
                  : 'bg-black/50 text-amber-200/80 border border-amber-500/25'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'অনলাইন' : 'Online'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] sm:text-sm font-extrabold text-amber-200 flex items-center gap-1">
              <img
                src={COIN_ASSET_URL}
                alt="Coin"
                referrerPolicy="no-referrer"
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 object-contain"
              />
              <span>{language === 'bn' ? 'লক্ষ্য:' : 'Target:'}</span>
            </span>
            <div className="flex items-center gap-1">
              {[3, 4, 5, 6, 8].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChangeTargetCoins(c)}
                  className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg font-mono-num text-[11px] sm:text-sm font-extrabold cursor-pointer ${
                    targetCoins === c
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'bg-black/55 border border-amber-500/30 text-amber-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* =================================================================
            3. FIVE SELECTABLE MODE CARDS
            Compact 2-column grid on mobile (`grid-cols-2 lg:grid-cols-5`)
            Fits all 5 modes without vertical page scrolling.
           ================================================================= */}
        <div className="flex-1 min-h-0 p-2 sm:p-4 lg:p-5 flex flex-col justify-between gap-2 overflow-hidden">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3.5 flex-1 min-h-0">
            {GAME_MODE_LIST.map((m, idx) => {
              const isSelected = selectedMatchMode === m.id;
              // On 2-column mobile layout, the 5th card spans 2 columns cleanly so all 5 fit in 3 compact rows
              const mobileSpanClass = idx === 4 ? 'col-span-2 lg:col-span-1' : '';

              return (
                <div
                  key={m.id}
                  data-testid={`mode-card-${m.id}`}
                  onClick={() => onSelectMatchMode(m.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectMatchMode(m.id);
                    }
                  }}
                  aria-label={`${m.nameEn} - ${m.subtitleEn}`}
                  className={`${mobileSpanClass} rounded-xl sm:rounded-2xl p-2 sm:p-3.5 border-2 transition-all flex flex-col justify-between cursor-pointer active:scale-[0.99] ${
                    isSelected
                      ? 'bg-gradient-to-b from-[#332010] via-[#22150b] to-[#112a24] border-amber-400 ring-2 ring-amber-400/80 shadow-[0_8px_24px_rgba(245,158,11,0.3)]'
                      : 'bg-[#18100a]/90 border-[#d4af37]/35 hover:border-amber-400/75'
                  }`}
                >
                  <div
                    className={`flex ${
                      idx === 4 ? 'flex-row lg:flex-col items-center lg:items-stretch' : 'flex-col items-stretch'
                    } gap-1.5 sm:gap-2.5 min-w-0`}
                  >
                    <div
                      className={`${
                        idx === 4 ? 'w-24 sm:w-32 lg:w-full' : 'w-full'
                      } shrink-0`}
                    >
                      <ModeIllustration modeId={m.id} selected={isSelected} />
                    </div>

                    <div className="min-w-0 flex-1 space-y-0.5 sm:space-y-1 text-left">
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-[11px] sm:text-base lg:text-lg font-extrabold text-amber-200 leading-tight">
                          {m.badgeEmoji} {language === 'bn' ? m.nameBn : m.nameEn}
                        </span>
                        {isSelected && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 text-[9px] sm:text-xs font-extrabold shrink-0">
                            {language === 'bn' ? '✓' : 'ACTIVE'}
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] sm:text-xs font-bold text-amber-400 truncate">
                        {language === 'bn' ? m.subtitleBn : m.subtitleEn}
                      </div>

                      <p className="text-[10px] sm:text-xs text-amber-100/85 line-clamp-2 sm:line-clamp-3 leading-snug">
                        {language === 'bn' ? m.shortDescBn : m.shortDescEn}
                      </p>
                    </div>
                  </div>

                  {/* Player Count & Team Arrangement Footer Badges */}
                  <div className="mt-1 pt-1 border-t border-[#d4af37]/25 flex items-center justify-between gap-1 text-[9px] sm:text-xs font-mono-num">
                    <span className="px-1.5 py-0.5 rounded bg-black/55 border border-[#d4af37]/35 text-amber-200 font-bold truncate">
                      👥 {language === 'bn' ? m.playerCountLabelBn : m.playerCountLabelEn}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#0c2621] border border-emerald-500/35 text-emerald-200 font-bold truncate">
                      {language === 'bn' ? m.teamArrangementBn : m.teamArrangementEn}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Mode Quick Summary Banner (Desktop & Tablet) */}
          <div className="hidden sm:flex px-4 py-2.5 rounded-xl parchment-scroll-box items-center justify-between gap-4 shrink-0">
            <div className="min-w-0">
              <div className="text-sm lg:text-base font-extrabold text-amber-300">
                {language === 'bn'
                  ? `${activeModeDef.badgeEmoji} ${activeModeDef.nameBn} — ${activeModeDef.subtitleBn}`
                  : `${activeModeDef.badgeEmoji} ${activeModeDef.nameEn} — ${activeModeDef.subtitleEn}`}
              </div>
              <div className="text-xs lg:text-sm text-amber-100/90 truncate">
                {language === 'bn'
                  ? activeModeDef.victoryRuleBn
                  : activeModeDef.victoryRuleEn}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setInspectingMode(activeModeDef)}
              className="px-3 py-1.5 rounded-lg bg-black/55 border border-[#d4af37]/45 text-xs font-bold text-amber-200 shrink-0 cursor-pointer"
            >
              {language === 'bn' ? 'বিস্তারিত নিয়ম দেখুন' : 'Full Mode Rules'}
            </button>
          </div>
        </div>

        {/* =================================================================
            4. FIXED BOTTOM ACTION BAR (Play Immediately or Open Team Lobby)
           ================================================================= */}
        <div className="px-3 py-2 sm:px-5 sm:py-3.5 bg-[#150d08] border-t border-[#d4af37]/40 flex items-center justify-between gap-2 sm:gap-4 shrink-0">
          <button
            type="button"
            data-testid="btn-mode-open-lobby"
            onClick={() => onOpenLobbyForMode(selectedMatchMode)}
            className="flex-1 sm:flex-initial px-3 py-2.5 sm:px-5 sm:py-3 rounded-xl bg-[#1f140d] hover:bg-amber-950/70 border border-[#d4af37]/50 text-amber-200 font-extrabold text-xs sm:text-base flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer active:scale-95"
          >
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
            <span className="truncate">
              {language === 'bn'
                ? 'টিম ও লবি সেটআপ (Lobby)'
                : 'Team & Lobby Setup'}
            </span>
          </button>

          <button
            type="button"
            data-testid="btn-mode-play-now"
            onClick={() => onPlayNow(selectedMatchMode)}
            className="flex-1 sm:flex-initial px-4 py-2.5 sm:px-8 sm:py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-lg shadow-[0_8px_22px_rgba(245,158,11,0.35)] flex items-center justify-center gap-1.5 sm:gap-2.5 cursor-pointer active:scale-95"
          >
            <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current shrink-0" />
            <span className="truncate">
              {language === 'bn'
                ? `${activeModeDef.nameBn} খেলুন!`
                : `Play ${activeModeDef.nameEn} Now!`}
            </span>
          </button>
        </div>
      </div>

      {/* ===================================================================
          MODE INFO DETAIL OVERLAY
         =================================================================== */}
      {inspectingMode && (
        <div
          data-testid="mode-info-dialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Mode Rules & Details"
        >
          <div className="cabin-wood-panel max-w-lg w-full rounded-2xl p-5 sm:p-6 space-y-4 border-2 border-amber-400/60">
            <div className="flex items-center justify-between border-b border-[#d4af37]/30 pb-3">
              <div>
                <span className="text-xs font-mono-num uppercase text-amber-400 font-bold">
                  {language === 'bn'
                    ? inspectingMode.subtitleBn
                    : inspectingMode.subtitleEn}
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-amber-200">
                  {inspectingMode.badgeEmoji}{' '}
                  {language === 'bn' ? inspectingMode.nameBn : inspectingMode.nameEn}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingMode(null)}
                className="p-2 rounded-xl bg-amber-900/40 text-amber-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm sm:text-base text-amber-100/95 leading-relaxed">
              <p>
                {language === 'bn'
                  ? inspectingMode.shortDescBn
                  : inspectingMode.shortDescEn}
              </p>

              <div className="p-3.5 rounded-xl bg-black/50 border border-[#d4af37]/35 space-y-2 text-xs sm:text-sm">
                <div>
                  <strong className="text-amber-300">
                    {language === 'bn' ? '👥 খেলোয়াড় সংখ্যা: ' : '👥 Player Count: '}
                  </strong>
                  <span>
                    {language === 'bn'
                      ? inspectingMode.playerCountLabelBn
                      : inspectingMode.playerCountLabelEn}
                  </span>
                </div>
                <div>
                  <strong className="text-amber-300">
                    {language === 'bn' ? '⚓ দলগত বিন্যাস: ' : '⚓ Team Structure: '}
                  </strong>
                  <span>
                    {language === 'bn'
                      ? inspectingMode.teamArrangementBn
                      : inspectingMode.teamArrangementEn}
                  </span>
                </div>
                <div>
                  <strong className="text-amber-300">
                    {language === 'bn' ? '🪙 কয়েন ও স্কোরিং: ' : '🪙 Coin Sharing: '}
                  </strong>
                  <span>
                    {language === 'bn'
                      ? inspectingMode.coinRuleBn
                      : inspectingMode.coinRuleEn}
                  </span>
                </div>
                <div>
                  <strong className="text-amber-300">
                    {language === 'bn' ? '🏆 জয়ের শর্ত: ' : '🏆 Victory Condition: '}
                  </strong>
                  <span>
                    {language === 'bn'
                      ? inspectingMode.victoryRuleBn
                      : inspectingMode.victoryRuleEn}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setInspectingMode(null)}
                className="px-6 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-sm sm:text-base cursor-pointer"
              >
                {language === 'bn' ? 'বুঝেছি' : 'Got It'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
