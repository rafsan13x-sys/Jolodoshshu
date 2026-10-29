import { CardValue, CharacterDefinition } from './types';

export const COIN_ASSET_URL = 'assets/aistudio/COIN.png';

export const DEFAULT_DECK_COUNTS: Record<CardValue, number> = {
  0: 2,
  1: 6,
  2: 2,
  3: 2,
  4: 2,
  5: 2,
  6: 2,
  7: 1,
  8: 1,
  9: 1,
};


export const CHARACTERS: Record<CardValue, CharacterDefinition> = {
  0: {
    value: 0,
    bengaliNumber: '০',
    id: 'pickpocket',
    nameBn: 'ছিচকে চোর',
    nameEn: 'Pickpocket',
    shortDescBn: 'এক রাউন্ড টিকে থাকলে বা শর্ত পূরণে ১টি কয়েন চুরি করে।',
    shortDescEn: 'Steals 1 coin after surviving a full round of turns uncancelled.',
    fullDescBn:
      'এই কার্ড খেললে আপনি কয়েন চুরির চেষ্টা শুরু করবেন। আপনার পরবর্তী টার্ন পর্যন্ত যদি আপনি জীবিত থাকেন এবং অন্য কেউ নতুন করে ছিচকে চোর না খেলে, তবে আপনি অতিরিক্ত ১টি কয়েন (টোকেন) পাবেন। (সেটিংসে রাউন্ড-শেষে একমাত্র ছিচকে চোর নিয়মও চালু করা যায়)।',
    fullDescEn:
      'Marks you as attempting to steal 1 coin. If you survive until your next turn without another player playing a Pickpocket to cancel yours, you immediately steal 1 bonus coin!',
    strategyBn:
      'মান ০ হওয়ায় তলোয়ারবাজের ডুয়েলে ঝুঁকি থাকে, কিন্তু শুরুতে বা গুপ্তচর খেলার পর এটি খেললে বিনা যুদ্ধে মূল্যবান কয়েন জেতা যায়।',
    strategyEn:
      'Vulnerable in Swordsman duels due to Value 0, but playing it early or when opponents lack targeted attacks yields free coins.',
    defaultCount: 2,
    bannerColor: 'from-[#4a1d6e] to-[#2e1047]',
    badgeColor: '#4c1d95',
    accentHex: '#9333ea',
    imageUrl: 'assets/aistudio/CHICHKE CHOR.jpg',
    requiresTarget: false,
    requiresGuess: false,
    canTargetSelf: false,
  },
  1: {
    value: 1,
    bengaliNumber: '১',
    id: 'guard',
    nameBn: 'পাহারাদার',
    nameEn: 'Guard',
    shortDescBn: 'অন্য খেলোয়াড়ের হাতের কার্ড অনুমান করুন (পাহারাদার ছাড়া)। সঠিক হলে সে আউট!',
    shortDescEn: 'Guess an opponent’s hand card (except Guard). If correct, they are eliminated!',
    fullDescBn:
      'অন্য একজন জীবিত খেলোয়াড় বেছে নিন এবং পাহারাদার (১) ছাড়া অন্য যেকোনো একটি চরিত্রের নাম ঘোষণা করুন। যদি ওই খেলোয়াড়ের হাতে সত্যিই সেই কার্ডটি থাকে, তবে তিনি সাথে সাথে এই রাউন্ড থেকে বাদ পড়বেন। ভুল হলে খেলা স্বাভাবিকভাবে চলবে এবং কারও কার্ড প্রকাশ পাবে না।',
    fullDescEn:
      'Choose a living opponent and name any character other than the Guard (1). If the target holds that character, they are immediately eliminated from the round! If wrong, nothing is revealed.',
    restrictionBn: 'পাহারাদার দিয়ে অন্য কারও হাতে পাহারাদার (১) আছে কি না তা অনুমান করা যাবে না।',
    restrictionEn: 'You cannot guess that a target holds another Guard (1).',
    strategyBn:
      'ডিসকার্ড পাইলের কার্ডগুলো লক্ষ্য রাখুন। কেউ ক্যাপ্টেন (৮) খেলতে বাধ্য হলে তার হাতে কামানচালক (৫) বা নাবিক (৭) থাকার সম্ভাবনা প্রবল!',
    strategyEn:
      'Track discarded cards closely. If an opponent was forced to play Captain (8), they very likely hold Cannon Operator (5) or Sailor (7)!',
    defaultCount: 6,
    bannerColor: 'from-[#475569] to-[#1e293b]',
    badgeColor: '#334155',
    accentHex: '#64748b',
    imageUrl: 'assets/aistudio/PAHARADAR.jpg',
    requiresTarget: true,
    requiresGuess: true,
    canTargetSelf: false,
  },
  2: {
    value: 2,
    bengaliNumber: '২',
    id: 'ship_worker',
    nameBn: 'জাহাজ কর্মচারী',
    nameEn: 'Ship Worker',
    shortDescBn: 'গোপনে অন্য একজন খেলোয়াড়ের হাতের কার্ড দেখে নিন।',
    shortDescEn: 'Secretly inspect another living player’s hand card.',
    fullDescBn:
      'অন্য একজন জীবিত খেলোয়াড় বেছে নিন এবং গোপনে তার হাতের কার্ডটি দেখে নিন (অন্য কাউকে না দেখিয়ে)। এরপর খেলা স্বাভাবিকভাবে চলবে।',
    fullDescEn:
      'Choose any unprotected living opponent and privately inspect the card in their hand without revealing it to anyone else.',
    strategyBn:
      'কার্ড দেখার পর পরবর্তী টার্নে পাহারাদার (১) বা তলোয়ারবাজ (৩) ব্যবহার করে নিখুঁত আক্রমণ করুন।',
    strategyEn:
      'Combine with a Guard (1) or Swordsman (3) on your next turn to eliminate the opponent whose card you just inspected.',
    defaultCount: 2,
    bannerColor: 'from-[#b45309] to-[#78350f]',
    badgeColor: '#92400e',
    accentHex: '#d97706',
    imageUrl: 'assets/aistudio/JAHAZ KORMOCHARI.jpg',
    requiresTarget: true,
    requiresGuess: false,
    canTargetSelf: false,
  },
  3: {
    value: 3,
    bengaliNumber: '৩',
    id: 'swordsman',
    nameBn: 'তলোয়ারবাজ',
    nameEn: 'Swordsman',
    shortDescBn: 'অন্য খেলোয়াড়ের সাথে গোপনে কার্ডের মান তুলনা করুন। কম মানের কার্ডধারী আউট!',
    shortDescEn: 'Secretly compare hand cards with an opponent. Lower value is eliminated!',
    fullDescBn:
      'অন্য একজন জীবিত খেলোয়াড় বেছে নিন। আপনি এবং সেই খেলোয়াড় গোপনে নিজেদের হাতের অবশিষ্ট কার্ডের মান তুলনা করবেন। যার কাছে কম মানের কার্ড আছে সে রাউন্ড থেকে বাদ পড়বে। সমান মান (টাই) হলে কেউই বাদ পড়বে না।',
    fullDescEn:
      'Challenge an unprotected opponent to a duel! Both players privately compare the numerical value of their remaining hand card. The lower value is eliminated; ties eliminate no one.',
    strategyBn:
      'আপনার হাতে জলদস্যু (৯), ক্যাপ্টেন (৮), বা নাবিক (৭) থাকলে তলোয়ারবাজ খেলে সহজেই প্রতিপক্ষকে পরাস্ত করতে পারেন।',
    strategyEn:
      'Deadly when your other card is the Pirate (9), Captain (8), or Sailor (7), guaranteeing a duel win or tie.',
    defaultCount: 2,
    bannerColor: 'from-[#4d7c0f] to-[#365314]',
    badgeColor: '#3f6212',
    accentHex: '#65a30d',
    imageUrl: 'assets/aistudio/TOLWARBAZ.jpg',
    requiresTarget: true,
    requiresGuess: false,
    canTargetSelf: false,
  },
  4: {
    value: 4,
    bengaliNumber: '৪',
    id: 'spy',
    nameBn: 'গুপ্তচর',
    nameEn: 'Spy',
    shortDescBn: 'আপনার পরবর্তী টার্ন পর্যন্ত অন্য কারও কার্ডের প্রভাব আপনার ওপর পড়বে না।',
    shortDescEn: 'Protects you from all targeted abilities until your next turn starts.',
    fullDescBn:
      'আপনার পরবর্তী টার্ন শুরু না হওয়া পর্যন্ত অন্যান্য কোনো খেলোয়াড়ের টার্গেট করা কার্ডের প্রভাব (যেমন পাহারাদার, জাহাজ কর্মচারী, তলোয়ারবাজ, কামানচালক, নাবিক) আপনার ওপর পড়বে না।',
    fullDescEn:
      'Grants a protective shield until the start of your next turn. While protected, opponents cannot target you with Guard, Ship Worker, Swordsman, Cannon Operator, or Sailor.',
    strategyBn:
      'হাতে জলদস্যু (৯) বা ছিচকে চোরের পেন্ডিং চুরি থাকলে গুপ্তচর আপনাকে নিরাপদে পরবর্তী টার্নে পৌঁছে দেবে।',
    strategyEn:
      'Essential for shielding a high-value Pirate (9) in hand or surviving long enough for your Pickpocket (0) theft to succeed.',
    defaultCount: 2,
    bannerColor: 'from-[#b91c1c] to-[#7f1d1d]',
    badgeColor: '#991b1b',
    accentHex: '#dc2626',
    imageUrl: 'assets/aistudio/GHUPTOCHOR.jpg',
    requiresTarget: false,
    requiresGuess: false,
    canTargetSelf: false,
  },
  5: {
    value: 5,
    bengaliNumber: '৫',
    id: 'cannon_operator',
    nameBn: 'কামানচালক',
    nameEn: 'Cannon Operator',
    shortDescBn: 'টার্গেট খেলোয়াড়ের হাতের কার্ড ধ্বংস করে ডেক থেকে নতুন কার্ড নিতে বাধ্য করে।',
    shortDescEn: 'Destroys a target’s hand card and forces them to draw a replacement.',
    fullDescBn:
      'যেকোনো জীবিত খেলোয়াড়কে বেছে নিন। সেই খেলোয়াড় তার হাতে থাকা কার্ডটি ডিসকার্ড করবেন এবং ডেক থেকে উপরের কার্ডটি নিবেন। যদি ধ্বংস হওয়া কার্ডটি জলদস্যু (৯) হয়, তবে সেই খেলোয়াড় সাথে সাথে রাউন্ড থেকে বাদ পড়বেন!',
    fullDescEn:
      'Fire a cannonball at an opponent (or yourself if needed), destroying their current hand card and forcing them to draw a new one if the deck is not empty. If the destroyed card is the Pirate (9), the target is immediately eliminated!',
    restrictionBn: 'হাতে ক্যাপ্টেন (৮) থাকলে কামানচালক খেলা যাবে না—ক্যাপ্টেন খেলতেই হবে।',
    restrictionEn: 'Cannot be played if your other card is the Captain (8) — you must play the Captain instead.',
    strategyBn:
      'যখন কারও কাছে জলদস্যু (৯) আছে বলে সন্দেহ হয়, তখন কামানচালক দিয়ে তাকে সরাসরি রাউন্ড থেকে উড়িয়ে দিন!',
    strategyEn:
      'The ultimate counter against anyone hoarding the Pirate (9) at the end of a round.',
    defaultCount: 2,
    bannerColor: 'from-[#15803d] to-[#14532d]',
    badgeColor: '#166534',
    accentHex: '#22c55e',
    imageUrl: 'assets/aistudio/KAMAN CHALOK.jpg',
    requiresTarget: true,
    requiresGuess: false,
    canTargetSelf: true,
  },
  6: {
    value: 6,
    bengaliNumber: '৬',
    id: 'merchant',
    nameBn: 'বণিক',
    nameEn: 'Merchant',
    shortDescBn: 'ডেক থেকে ২টি কার্ড নিন, ৩টির মধ্যে ১টি হাতে রেখে বাকি ২টি ডেকের নিচে রাখুন।',
    shortDescEn: 'Draw up to 2 cards, keep 1 of the 3 in hand, and put the rest at the bottom of the deck.',
    fullDescBn:
      'ডেক থেকে দুটি কার্ড আপনার হাতে নিন (ডেকে কম থাকলে যতগুলো আছে)। এখন মোট তিনটি কার্ডের মধ্যে একটি কার্ড বেছে নিয়ে আপনার হাতে রাখুন এবং অন্য দুটি কার্ড গোপনে ডেকের নিচে যেকোনো ক্রমে রেখে দিন।',
    fullDescEn:
      'Draw up to 2 cards from the deck. Combine them with your current hand card, choose 1 card to keep, and secretly return the remaining unchosen cards to the bottom of the deck.',
    strategyBn:
      'বণিক আপনাকে সেরা কার্ডটি বাছাই করার পাশাপাশি ডেকের নিচে কোন কার্ডগুলো থাকছে তার নিখুঁত তথ্য দেয়!',
    strategyEn:
      'Gives you card selection AND secret knowledge of the exact cards sitting at the bottom of the deck.',
    defaultCount: 2,
    bannerColor: 'from-[#4d6b5d] to-[#2c4036]',
    badgeColor: '#3d5a4c',
    accentHex: '#5f8d78',
    imageUrl: 'assets/aistudio/BONIK.jpg',
    requiresTarget: false,
    requiresGuess: false,
    canTargetSelf: false,
  },
  7: {
    value: 7,
    bengaliNumber: '৭',
    id: 'sailor',
    nameBn: 'নাবিক',
    nameEn: 'Sailor',
    shortDescBn: 'অন্য একজন খেলোয়াড়ের সাথে আপনার হাতের কার্ড গোপনে বদল করুন।',
    shortDescEn: 'Secretly swap your remaining hand card with another living opponent.',
    fullDescBn:
      'অন্য একজন জীবিত খেলোয়াড় বেছে নিন এবং সেই খেলোয়াড়ের সাথে হাতের কার্ড গোপনে বদল করুন। এর ফলে কারও কার্ডই অন্যদের কাছে প্রকাশ পায় না।',
    fullDescEn:
      'Choose an unprotected living opponent and secretly exchange your remaining hand card with theirs.',
    restrictionBn: 'হাতে ক্যাপ্টেন (৮) থাকলে নাবিক খেলা যাবে না—ক্যাপ্টেন খেলতেই হবে।',
    restrictionEn: 'Cannot be played if your other card is the Captain (8) — you must play the Captain instead.',
    strategyBn:
      'আপনার হাতে কম মানের কার্ড (যেমন ০ বা ১) থাকলে প্রতিপক্ষের সাথে বদল করে পরের টার্নে পাহারাদার দিয়ে তাকে আউট করুন!',
    strategyEn:
      'Give a low card like Guard (1) or Pickpocket (0) to an opponent so you know their exact hand for a future Guard guess or duel.',
    defaultCount: 1,
    bannerColor: 'from-[#476b87] to-[#263c4d]',
    badgeColor: '#36556d',
    accentHex: '#6090b5',
    imageUrl: 'assets/aistudio/NABIK.jpg',
    requiresTarget: true,
    requiresGuess: false,
    canTargetSelf: false,
  },
  8: {
    value: 8,
    bengaliNumber: '৮',
    id: 'captain',
    nameBn: 'ক্যাপ্টেন',
    nameEn: 'Captain',
    shortDescBn: 'উচ্চ মানের কার্ড। হাতে কামানচালক (৫) বা নাবিক (৭) থাকলে ক্যাপ্টেন খেলতেই হবে!',
    shortDescEn: 'High-value card (8). Must be played if held with Cannon Operator (5) or Sailor (7)!',
    fullDescBn:
      'ক্যাপ্টেনের কোনো সক্রিয় ক্ষমতা নেই, তবে এর মান ৮ যা রাউন্ডের শেষে বা ডুয়েলে জেতার জন্য অত্যন্ত শক্তিশালী। বিশেষ নিয়ম: আপনার হাতে কামানচালক (৫) অথবা নাবিক (৭) এর মধ্যে কোনো একটি কার্ড থাকলে আপনার টার্নে অবশ্যই ক্যাপ্টেন কার্ডটি খেলতে হবে।',
    fullDescEn:
      'The Captain has no active effect when played, but its high value (8) dominates duels and end-of-round showdowns. Mandatory Rule: If you hold the Captain alongside either Cannon Operator (5) or Sailor (7), you MUST play the Captain on your turn.',
    restrictionBn: 'হাতে কামানচালক (৫) বা নাবিক (৭) থাকলে ক্যাপ্টেন (৮) খেলা বাধ্যতামূলক!',
    restrictionEn: 'Mandatory play when your other card is Cannon Operator (5) or Sailor (7).',
    strategyBn:
      'এমনকি হাতে ৫ বা ৭ না থাকলেও ইচ্ছা করে ক্যাপ্টেন খেলে প্রতিপক্ষকে ধোঁকা (Bluff) দিতে পারেন!',
    strategyEn:
      'You can voluntarily play the Captain even when holding Pirate (9) to bluff opponents into guessing 5 or 7 with their Guards.',
    defaultCount: 1,
    bannerColor: 'from-[#7f2d3c] to-[#4c1923]',
    badgeColor: '#6b2331',
    accentHex: '#be123c',
    imageUrl: 'assets/aistudio/CAPTAIN.jpg',
    requiresTarget: false,
    requiresGuess: false,
    canTargetSelf: false,
  },
  9: {
    value: 9,
    bengaliNumber: '৯',
    id: 'pirate',
    nameBn: 'জলদস্যু',
    nameEn: 'Pirate',
    shortDescBn: 'সর্বোচ্চ মান (৯)। কিন্তু এটি খেললে বা ডিসকার্ড করলে আপনি সাথে সাথে বাদ পড়বেন!',
    shortDescEn: 'Highest value (9). If you play or discard the Pirate, you are eliminated immediately!',
    fullDescBn:
      'জলদস্যু কার্ডের মান ৯, যা খেলার সর্বোচ্চ কার্ড। রাউন্ডের শেষে এটি হাতে থাকলে আপনার জয় প্রায় নিশ্চিত। কিন্তু যদি আপনি কোনো কারণে জলদস্যু খেলেন অথবা কামানচালকের তোপে ডিসকার্ড করতে বাধ্য হন, তাহলে আপনি সাথে সাথে চলমান রাউন্ড থেকে বাদ পড়বেন!',
    fullDescEn:
      'The Pirate has the highest numerical value (9) in the game, winning any duel or end-of-round showdown. However, if you ever play the Pirate voluntarily OR have it destroyed by a Cannon Operator (5), you are immediately eliminated from the round!',
    restrictionBn: 'জলদস্যু খেললে বা ডিসকার্ড করলে তাৎক্ষণিক এলিমিনেশন!',
    restrictionEn: 'Playing or discarding the Pirate causes immediate elimination.',
    strategyBn:
      'জলদস্যু হাতে পেলে গুপ্তচর (৪) দিয়ে নিজেকে রক্ষা করুন এবং অন্যদের কামানচালক (৫) থেকে সাবধান থাকুন।',
    strategyEn:
      'Keep a low profile when holding the Pirate, and use the Spy (4) to shield yourself from Cannon Operators (5) and Guards (1).',
    defaultCount: 1,
    bannerColor: 'from-[#991b1b] to-[#450a0a]',
    badgeColor: '#7f1d1d',
    accentHex: '#ef4444',
    imageUrl: 'assets/aistudio/JOLODOSHSSU.jpg',
    requiresTarget: false,
    requiresGuess: false,
    canTargetSelf: false,
  },
};

export const CHARACTER_LIST: CharacterDefinition[] = [
  CHARACTERS[0],
  CHARACTERS[1],
  CHARACTERS[2],
  CHARACTERS[3],
  CHARACTERS[4],
  CHARACTERS[5],
  CHARACTERS[6],
  CHARACTERS[7],
  CHARACTERS[8],
  CHARACTERS[9],
];

export const PIRATE_AVATARS = [
  { id: 'corsair', emoji: '🏴‍☠️', nameBn: 'কর্সেয়ার', nameEn: 'Corsair' },
  { id: 'captain', emoji: '🦜', nameBn: 'ক্যাপ্টেন তোতা', nameEn: 'Captain Parrot' },
  { id: 'navigator', emoji: '🧭', nameBn: 'দিকনির্দেশক', nameEn: 'Navigator' },
  { id: 'gunner', emoji: '💣', nameBn: 'গোলন্দাজ', nameEn: 'Master Gunner' },
  { id: 'duelist', emoji: '⚔️', nameBn: 'তলোয়ারবাজ', nameEn: 'Blade Duelist' },
  { id: 'anchor', emoji: '⚓', nameBn: 'নোঙর প্রহরী', nameEn: 'Iron Anchor' },
];
