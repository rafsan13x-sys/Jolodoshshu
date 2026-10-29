import React, { useState } from 'react';
import { CHARACTERS, COIN_ASSET_URL } from '../game/cards';
import { CardValue, Language } from '../game/types';

interface PirateCardProps {
  value: CardValue;
  faceDown?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  language?: Language;
  selected?: boolean;
  disabled?: boolean;
  mandatory?: boolean;
  onClick?: () => void;
  onInspect?: (value: CardValue) => void;
  badgeText?: string;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<PirateCardProps['size']>, string> = {
  xs: 'w-16 h-24 sm:w-18 sm:h-27 rounded-lg',
  sm: 'w-24 h-36 sm:w-28 sm:h-42 rounded-xl',
  md: 'w-32 h-48 sm:w-36 sm:h-54 rounded-xl',
  lg: 'w-36 h-54 sm:w-42 sm:h-63 xl:w-44 xl:h-66 rounded-2xl',
  xl: 'w-48 h-72 sm:w-56 sm:h-84 rounded-2xl',
};

export const PirateCard: React.FC<PirateCardProps> = ({
  value,
  faceDown = false,
  size = 'md',
  language = 'bn',
  selected = false,
  disabled = false,
  mandatory = false,
  onClick,
  onInspect,
  badgeText,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);
  const def = CHARACTERS[value] ?? CHARACTERS[0];

  if (faceDown) {
    return (
      <div
        onClick={!disabled ? onClick : undefined}
        className={`relative select-none overflow-hidden border-2 border-[#c89d54]/70 bg-gradient-to-br from-[#2a1810] via-[#1b0f0a] to-[#0f0906] shadow-xl transition-transform duration-150 shrink-0 ${
          SIZE_CLASSES[size]
        } ${onClick && !disabled ? 'cursor-pointer hover:-translate-y-1' : ''} ${className}`}
        aria-label={language === 'bn' ? 'গোপন কার্ড' : 'Face-down card'}
      >
        {/* Ornate pirate card back pattern */}
        <div className="absolute inset-1.5 rounded-lg border border-[#c89d54]/40 flex flex-col items-center justify-center p-2 bg-[radial-gradient(circle_at_center,rgba(200,157,84,0.18),transparent_75%)]">
          <img
            src={COIN_ASSET_URL}
            alt="Pirate Skull Crest"
            referrerPolicy="no-referrer"
            className="w-3/5 h-3/5 object-contain opacity-85 drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]"
          />
          {size !== 'xs' && (
            <span className="mt-1 text-xs sm:text-sm font-extrabold tracking-widest text-[#e6c687] uppercase">
              জলদস্যু
            </span>
          )}
        </div>
      </div>
    );
  }

  const isCompact = size === 'xs' || size === 'sm';

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
      className={`group relative select-none overflow-hidden transition-all duration-150 shrink-0 ${
        SIZE_CLASSES[size]
      } ${
        selected
          ? 'ring-4 ring-amber-400 -translate-y-2.5 shadow-[0_16px_34px_rgba(245,158,11,0.5)] border-2 border-amber-300'
          : 'border-2 border-[#d4b483]/60 shadow-[0_8px_20px_rgba(0,0,0,0.68)]'
      } ${
        disabled
          ? 'opacity-45 saturate-50 cursor-not-allowed'
          : onClick
          ? 'cursor-pointer hover:-translate-y-1.5 hover:border-amber-300 hover:shadow-[0_14px_30px_rgba(245,158,11,0.28)]'
          : ''
      } bg-[#e6d2aa] ${className}`}
    >
      {/* Full authentic illustrated card image */}
      {!imgError ? (
        <img
          src={def.imageUrl}
          alt={`${def.nameBn} (${def.nameEn})`}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover object-top"
        />
      ) : (
        /* Resilient fallback if image fails to load */
        <div className="w-full h-full flex flex-col justify-between p-3.5 bg-gradient-to-b from-[#2c1d12] to-[#140d08] text-[#f5ebd6]">
          <div className="flex items-center justify-between">
            <span className="w-9 h-9 rounded-full bg-amber-700/80 flex items-center justify-center font-bold text-lg">
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
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          {(mandatory || badgeText) ? (
            <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-xs font-extrabold tracking-tight shadow-md">
              {badgeText ?? (language === 'bn' ? 'অবশ্যই খেলতে হবে!' : 'MUST PLAY!')}
            </span>
          ) : selected ? (
            <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md">
              {language === 'bn' ? '✓ নির্বাচিত' : '✓ Selected'}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-black/80 text-[#f5ebd6] font-mono-num text-xs font-extrabold border border-amber-400/30 shadow">
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
              className="w-7 h-7 rounded-full bg-black/85 hover:bg-amber-500 text-amber-200 hover:text-slate-950 flex items-center justify-center text-xs sm:text-sm font-extrabold border border-amber-400/40 transition-colors shadow cursor-pointer"
              title={language === 'bn' ? 'বিস্তারিত দেখুন' : 'Inspect Card Details'}
            >
              i
            </button>
          )}
        </div>
      )}

      {/* English translation overlay on bottom when English mode is active */}
      {language === 'en' && !isCompact && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/90 to-transparent p-2.5 text-left">
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
        <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-md bg-black/85 text-amber-300 font-mono-num text-xs font-extrabold border border-amber-400/40 shadow">
          {selected ? `✓ #${def.value}` : `#${def.value}`}
        </div>
      )}
    </div>
  );
};
