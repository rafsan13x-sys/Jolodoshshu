import React, { useState } from 'react';
import { CHARACTERS, COIN_ASSET_URL } from '../game/cards';
import { CardValue, Language } from '../game/types';

export type CardAnimationVariant = 'none' | 'deal' | 'slide-play' | 'flip' | 'discard';

interface PirateCardProps {
  value: CardValue;
  faceDown?: boolean;
  size?: 'xxs' | 'xs' | 'sm' | 'md' | 'hand' | 'lg' | 'xl';
  language?: Language;
  selected?: boolean;
  disabled?: boolean;
  mandatory?: boolean;
  animationVariant?: CardAnimationVariant;
  onClick?: () => void;
  onInspect?: (value: CardValue) => void;
  badgeText?: string;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<PirateCardProps['size']>, string> = {
  xxs: 'w-10 h-14 sm:w-12 sm:h-18 rounded-lg',
  xs: 'w-11 h-16 sm:w-16 sm:h-24 rounded-xl',
  sm: 'w-20 h-30 sm:w-26 sm:h-39 rounded-xl',
  md: 'w-28 h-42 sm:w-36 sm:h-54 rounded-2xl',
  hand: 'w-[90px] h-[128px] min-[390px]:w-[114px] min-[390px]:h-[162px] sm:w-36 sm:h-54 xl:w-42 xl:h-63 rounded-xl sm:rounded-2xl',
  lg: 'w-32 h-48 sm:w-40 sm:h-60 xl:w-44 xl:h-66 rounded-2xl',
  xl: 'w-40 h-60 sm:w-52 sm:h-78 rounded-2xl',
};

const ANIMATION_CLASSES: Record<CardAnimationVariant, string> = {
  none: '',
  deal: 'animate-card-deal',
  'slide-play': 'animate-card-slide-play',
  flip: 'animate-card-flip-2d',
  discard: 'animate-card-discard',
};

export const PirateCard: React.FC<PirateCardProps> = ({
  value,
  faceDown = false,
  size = 'md',
  language = 'bn',
  selected = false,
  disabled = false,
  mandatory = false,
  animationVariant = 'none',
  onClick,
  onInspect,
  badgeText,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);
  const def = CHARACTERS[value] ?? CHARACTERS[0];
  const animClass = ANIMATION_CLASSES[animationVariant];

  if (faceDown) {
    return (
      <div
        onClick={!disabled ? onClick : undefined}
        className={`relative select-none overflow-hidden border-2 border-[#d4af37]/80 bg-gradient-to-br from-[#2a1810] via-[#1b100a] to-[#0d241f] shadow-[0_8px_18px_rgba(0,0,0,0.72)] transition-transform duration-150 ease-out shrink-0 ${
          SIZE_CLASSES[size]
        } ${animClass} ${
          onClick && !disabled
            ? 'cursor-pointer active:scale-95 sm:hover:-translate-y-1.5 sm:hover:-rotate-1 hover:border-[#f3d27a]'
            : ''
        } ${className}`}
        aria-label={language === 'bn' ? 'গোপন কার্ড' : 'Face-down card'}
      >
        {/* Ornate antique-gold pirate card back pattern */}
        <div className="absolute inset-1 rounded-md border border-[#d4af37]/45 flex flex-col items-center justify-center p-1.5 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.22),transparent_76%)]">
          <img
            src={COIN_ASSET_URL}
            alt="Pirate Skull Crest"
            referrerPolicy="no-referrer"
            className="w-3/5 h-3/5 object-contain opacity-90 drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]"
          />
          {size !== 'xs' && size !== 'xxs' && (
            <span className="mt-0.5 text-[10px] sm:text-xs font-extrabold tracking-widest text-[#ebd494] uppercase">
              জলদস্যু
            </span>
          )}
        </div>
      </div>
    );
  }

  const isCompact = size === 'xxs' || size === 'xs' || size === 'sm';

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && !disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      onClick={!disabled ? onClick : undefined}
      aria-label={`${def.nameBn} (${def.nameEn}) - Value ${def.value}`}
      aria-disabled={disabled}
      className={`group relative select-none overflow-hidden transition-all duration-150 ease-out shrink-0 ${
        SIZE_CLASSES[size]
      } ${animClass} ${
        selected
          ? 'ring-3 sm:ring-4 ring-[#f59e0b] -translate-y-1.5 sm:-translate-y-3 scale-[1.02] sm:scale-[1.03] shadow-[0_12px_28px_-4px_rgba(245,158,11,0.52)] border-2 border-[#fde68a]'
          : 'border-2 border-[#d4af37]/85 shadow-[0_8px_20px_rgba(0,0,0,0.72)]'
      } ${
        disabled
          ? 'opacity-45 saturate-50 cursor-not-allowed'
          : onClick
          ? selected
            ? 'cursor-pointer active:scale-95'
            : 'cursor-pointer active:scale-95 sm:hover:-translate-y-2 sm:hover:-rotate-1 hover:border-[#fde68a] hover:shadow-[0_14px_28px_rgba(212,175,55,0.34)]'
          : ''
      } bg-[#ecd9b4] after:pointer-events-none after:absolute after:inset-0.5 sm:after:inset-1 after:rounded-[inherit] after:border after:border-[#fff3d1]/35 ${className}`}
    >
      {/* Full authentic illustrated card image on parchment base */}
      {!imgError ? (
        <img
          src={def.imageUrl}
          alt={`${def.nameBn} (${def.nameEn})`}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover object-top"
        />
      ) : (
        /* Resilient parchment & walnut fallback if image fails to load */
        <div className="w-full h-full flex flex-col justify-between p-3.5 bg-gradient-to-b from-[#2c1d12] to-[#140d08] text-[#f5ebd6]">
          <div className="flex items-center justify-between">
            <span className="w-9 h-9 rounded-full bg-amber-700/80 border border-[#d4af37] flex items-center justify-center font-bold text-lg">
              {language === 'bn' ? def.bengaliNumber : def.value}
            </span>
          </div>
          <div className="text-center my-auto">
            <div className="text-lg font-bold">{language === 'bn' ? def.nameBn : def.nameEn}</div>
            {!isCompact && (
              <p className="text-sm text-amber-200/90 mt-1.5 leading-snug">
                {language === 'bn' ? def.shortDescBn : def.shortDescEn}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Top-right controls & status badges (keeps top-left printed medallion 100% visible) */}
      {!isCompact && (
        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-10 flex items-center gap-1">
          {mandatory || badgeText ? (
            <span className="px-1.5 sm:px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] sm:text-xs font-extrabold tracking-tight shadow-md border border-amber-200 whitespace-nowrap">
              {badgeText ?? (language === 'bn' ? 'বাধ্যতামূলক' : 'MUST')}
            </span>
          ) : selected ? (
            <span className="px-1.5 sm:px-2 py-0.5 rounded bg-[#f59e0b] text-slate-950 font-extrabold text-[10px] sm:text-xs shadow-md border border-amber-200 whitespace-nowrap">
              <span className="sm:hidden">✓ #{def.value}</span>
              <span className="hidden sm:inline">
                {language === 'bn' ? '✓ নির্বাচিত' : '✓ Selected'}
              </span>
            </span>
          ) : (
            <span className="px-1.5 sm:px-2 py-0.5 rounded bg-[#1a100a]/90 text-[#f5ebd6] font-mono-num text-[10px] sm:text-xs font-extrabold border border-[#d4af37]/50 shadow whitespace-nowrap">
              #{def.value}
            </span>
          )}
          {onInspect && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onInspect(def.value);
              }}
              aria-label={`Inspect ${def.nameEn}`}
              className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-[#1a100a]/90 hover:bg-amber-500 text-amber-200 hover:text-slate-950 flex items-center justify-center text-[10px] sm:text-xs font-extrabold border border-[#d4af37]/55 transition-colors shadow cursor-pointer"
              title={language === 'bn' ? 'বিস্তারিত দেখুন' : 'Inspect Card Details'}
            >
              i
            </button>
          )}
        </div>
      )}

      {/* English translation overlay on bottom when English mode is active */}
      {language === 'en' && !isCompact && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/90 to-transparent p-2.5 text-left z-10">
          <div className="text-sm font-extrabold text-amber-300 leading-tight">
            #{def.value} {def.nameEn}
          </div>
          <div className="text-xs text-slate-100 leading-snug line-clamp-3 mt-1">
            {def.shortDescEn}
          </div>
        </div>
      )}

      {/* Compact value badge for xs/sm cards */}
      {isCompact && (
        <div className="absolute top-1.5 right-1.5 z-10 px-2 py-0.5 rounded-md bg-[#1a100a]/90 text-amber-300 font-mono-num text-xs font-extrabold border border-[#d4af37]/50 shadow">
          {selected ? `✓ #${def.value}` : `#${def.value}`}
        </div>
      )}
    </div>
  );
};

