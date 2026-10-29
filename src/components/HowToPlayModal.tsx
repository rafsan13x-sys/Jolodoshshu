import React, { useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Coins, Compass, ShieldCheck, Swords, X } from 'lucide-react';
import { COIN_ASSET_URL } from '../game/cards';
import { Language } from '../game/types';
import { PirateCard } from './PirateCard';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      icon: <Compass className="w-6 h-6 text-amber-300" />,
      titleBn: '১. খেলার মূল উদ্দেশ্য ও সেটআপ',
      titleEn: '1. Game Objective & Setup',
      cardPreview: 9 as const,
      contentBn: [
        'জলদস্যু (Jolodoshshu) একটি রহস্য, অনুমান ও কৌশলের কার্ড গেম যা একটি জলদস্যু জাহাজে সংঘটিত হয়।',
        'খেলায় ০ থেকে ৯ মানের মোট ২১টি চরিত্র কার্ড রয়েছে। রাউন্ডের শুরুতে ডেক শাফল করে ১টি কার্ড গোপনে উপুড় করে সরিয়ে রাখা হয়—কেউ এর পরিচয় জানে না!',
        'প্রত্যেক খেলোয়াড়কে ১টি করে গোপন চরিত্র কার্ড দেওয়া হয়। রাউন্ডে টিকে থেকে এবং বিশেষ ক্ষমতা ব্যবহার করে সবচেয়ে বেশি কয়েন (টোকেন) সংগ্রহ করাই আপনার লক্ষ্য।',
      ],
      contentEn: [
        'Jolodoshshu is a strategic pirate card game of deduction, bluffing, and daring abilities aboard a pirate ship.',
        'The deck contains 21 character cards (values 0 to 9). At the start of each round, 1 random card is secretly set aside face-down so no one can count every card with 100% certainty.',
        'Each player receives 1 secret card in hand. Survive rounds, outsmart rivals, and collect the target number of pirate coins to win!',
      ],
    },
    {
      icon: <Swords className="w-6 h-6 text-amber-300" />,
      titleBn: '২. আপনার টার্নে কীভাবে খেলবেন',
      titleEn: '2. Turn-by-Turn Gameplay',
      cardPreview: 1 as const,
      contentBn: [
        'আপনার টার্নের শুরুতে ডেক থেকে ১টি কার্ড তুলবেন। তখন আপনার হাতে থাকবে ২টি কার্ড।',
        'এই ২টি কার্ডের মধ্যে যেকোনো ১টি কার্ড আপনাকে টেবিলে খেলতে হবে এবং অপর কার্ডটি আপনার হাতে গোপন থাকবে।',
        'খেলা কার্ডটি ডিসকার্ড পাইলে সবার সামনে উন্মুক্ত থাকবে এবং সাথে সাথে তার বিশেষ ক্ষমতা কার্যকর হবে (যেমন পাহারাদার দিয়ে অনুমান, তলোয়ারবাজ দিয়ে ডুয়েল বা কামানচালক দিয়ে কার্ড ধ্বংস)।',
      ],
      contentEn: [
        'At the start of your turn, you automatically draw 1 card from the deck so you hold 2 cards.',
        'Choose 1 of your 2 cards to play face-up into the discard pile, and keep the other card secretly in your hand.',
        'The played card’s special ability resolves immediately (such as guessing an opponent’s card with Guard, dueling with Swordsman, or firing with Cannon Operator).',
      ],
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-amber-300" />,
      titleBn: '৩. বিশেষ নিয়ম: ক্যাপ্টেন (৮), জলদস্যু (৯) ও ছিচকে চোর (০)',
      titleEn: '3. Key Character Rules: Captain, Pirate & Pickpocket',
      cardPreview: 8 as const,
      contentBn: [
        'ক্যাপ্টেন (৮) এর বাধ্যতামূলক নিয়ম: আপনার হাতে ক্যাপ্টেন (৮) এর সাথে যদি কামানচালক (৫) অথবা নাবিক (৭) থাকে, তবে আপনাকে অবশ্যই ক্যাপ্টেন (৮) কার্ডটি খেলতে হবে!',
        'জলদস্যু (৯) এর ঝুঁকি: এর মান সর্বোচ্চ (৯), কিন্তু আপনি যদি নিজে জলদস্যু খেলেন অথবা কামানচালকের তোপে এটি ডিসকার্ড করতে বাধ্য হন, তবে আপনি সাথে সাথে রাউন্ড থেকে আউট হয়ে যাবেন!',
        'ছিচকে চোর (০): এই কার্ড খেলার পর পুরো এক রাউন্ড আপনি জীবিত থাকলে এবং অন্য কেউ নতুন করে ছিচকে চোর না খেললে আপনি বোনাস ১টি কয়েন চুরি করবেন!',
      ],
      contentEn: [
        'Mandatory Captain (8) Rule: If you ever hold the Captain (8) alongside either Cannon Operator (5) or Sailor (7), you are forced to play the Captain!',
        'The Pirate (9) Risk: Value 9 is the strongest card at round end, but if you voluntarily play it OR have it destroyed by a Cannon Operator (5), you are eliminated immediately!',
        'Pickpocket (0): Starts a pending coin theft. If you survive until your next turn without another player playing a Pickpocket to cancel yours, you steal 1 bonus coin!',
      ],
    },
    {
      icon: <Coins className="w-6 h-6 text-amber-300" />,
      titleBn: '৪. রাউন্ড সমাপ্তি ও বিজয়ী নির্ধারণ',
      titleEn: '4. Ending a Round & Winning the Match',
      cardPreview: 0 as const,
      contentBn: [
        'শর্ত ক (একমাত্র জীবিত খেলোয়াড়): অন্য সব খেলোয়াড় রাউন্ড থেকে বাদ পড়লে সর্বশেষ জীবিত খেলোয়াড় সাথে সাথে রাউন্ড জিতে নির্ধারিত কয়েন লাভ করেন।',
        'শর্ত খ (ডেক শেষ হয়ে যাওয়া): ড্র ডেকে আর কোনো কার্ড না থাকলে জীবিত সকল খেলোয়াড়ের হাতের কার্ড প্রকাশ করা হয়। যার কার্ডের মান সবচেয়ে বেশি, তিনি রাউন্ড জেতেন!',
        'নির্ধারিত লক্ষ্যমাত্রার কয়েন (যেমন ৪ বা ৬ কয়েন) যে খেলোয়াড় সবার আগে অর্জন করবেন, তিনিই হবেন চূড়ান্ত জলদস্যু সম্রাট!',
      ],
      contentEn: [
        'Condition A (Last Pirate Standing): If all other players are eliminated, the sole surviving player immediately wins the round and collects the round coin reward.',
        'Condition B (Deck Exhausted): When the draw deck runs out of cards after a turn resolves, all surviving players reveal their hands—the highest card value wins!',
        'The first player to reach the target coin total (or highest coins after max rounds) wins the entire game!',
      ],
    },
  ];

  const current = steps[step];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={language === 'bn' ? 'খেলার নিয়মাবলী' : 'How to Play'}
    >
      <div className="cabin-wood-panel w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-amber-500/25 bg-[#160e09]">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-amber-300">
              {language === 'bn' ? 'কীভাবে খেলবেন (How to Play)' : 'How to Play Jolodoshshu'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close How to Play"
            className="p-2.5 rounded-xl bg-amber-900/35 hover:bg-amber-700/55 text-amber-200 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Stepper dots */}
        <div className="px-6 py-3.5 bg-[#1b110b] border-b border-amber-500/15 flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {steps.map((_s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setStep(idx)}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                  idx === step
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-black/45 text-amber-200/75 hover:text-amber-100'
                }`}
              >
                {language === 'bn' ? `ধাপ ${idx + 1}` : `Step ${idx + 1}`}
              </button>
            ))}
          </div>
          <span className="text-sm font-mono-num font-bold text-amber-300/85">
            {step + 1} / {steps.length}
          </span>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-7">
          <div className="shrink-0 flex flex-col items-center gap-2.5">
            <PirateCard value={current.cardPreview} size="lg" language={language} />
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-300/90">
              <img
                src={COIN_ASSET_URL}
                alt="Coin Token"
                referrerPolicy="no-referrer"
                className="w-6 h-6 object-contain"
              />
              <span>{language === 'bn' ? 'জলদস্যু কয়েন টোকেন' : 'Pirate Coin Token'}</span>
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-2.5">
              {current.icon}
              <h3 className="text-xl sm:text-2xl font-extrabold text-amber-200">
                {language === 'bn' ? current.titleBn : current.titleEn}
              </h3>
            </div>
            <ul className="space-y-3">
              {(language === 'bn' ? current.contentBn : current.contentEn).map((para, i) => (
                <li
                  key={i}
                  className="p-4 rounded-xl bg-black/45 border border-amber-500/25 text-base sm:text-lg text-amber-50/95 leading-relaxed"
                >
                  {para}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer navigation */}
        <div className="px-6 py-4.5 bg-[#160e09] border-t border-amber-500/20 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black/55 border border-amber-500/35 text-base font-bold text-amber-200 disabled:opacity-40 hover:bg-amber-900/35 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>{language === 'bn' ? 'পূর্ববর্তী' : 'Previous'}</span>
          </button>

          {step < steps.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-base font-extrabold transition-colors cursor-pointer"
            >
              <span>{language === 'bn' ? 'পরবর্তী ধাপ' : 'Next Step'}</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-base font-extrabold transition-colors cursor-pointer"
            >
              {language === 'bn' ? 'বুঝেছি, খেলায় ফিরুন!' : 'Got It, Let’s Play!'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
