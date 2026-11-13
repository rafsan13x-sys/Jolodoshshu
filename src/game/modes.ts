import { PIRATE_AVATARS } from './cards.ts';
import type {
  GameMode,
  GameModeDefinition,
  GameSettings,
  GameState,
  MatchModeId,
  PlayerConfig,
  PlayerState,
  TeamState,
} from './types.ts';

export const GAME_MODE_CONFIGS: Record<MatchModeId, GameModeDefinition> = {
  classic: {
    id: 'classic',
    badgeEmoji: '🏴‍☠️',
    nameBn: 'ক্লাসিক — ফ্রি ফর অল',
    nameEn: 'Classic — Free for All',
    subtitleBn: 'একক লড়াই · সবাই সবার প্রতিদ্বন্দ্বী',
    subtitleEn: 'Solo Pirate Battle · Every Pirate for Themselves',
    shortDescBn:
      'আসল জলদস্যু কার্ড গেম! ২–৬ জন খেলোয়াড় এককভাবে লড়বে এবং নির্দিষ্ট সংখ্যক কয়েন জিতে বিজয়ী হবে।',
    shortDescEn:
      'The original Jolodoshshu rules! 2–6 players compete individually to collect the target coins first.',
    fullRulesBn: [
      '২ থেকে ৬ জন খেলোয়াড় এককভাবে অংশগ্রহণ করে (কোনো দল নেই)।',
      'প্রতি রাউন্ডে ২১ কার্ডের ডেক থেকে ১টি কার্ড গোপনে সরিয়ে সবাইকে ১টি করে কার্ড দেওয়া হয়।',
      'সর্বশেষ টিকে থাকা খেলোয়াড় অথবা ডেক শেষ হলে সর্বোচ্চ মানের কার্ডধারী রাউন্ড জেতে।',
      'নির্ধারিত লক্ষ্য কয়েন (Target Coins) আগে পূর্ণ করা খেলোয়াড় চূড়ান্ত বিজয়ী হয়।',
    ],
    fullRulesEn: [
      '2 to 6 players compete individually with no teams.',
      'Each round, 1 secret card is set aside from the 21-card deck and 1 card is dealt to each player.',
      'The last surviving pirate or the highest card holder when the deck runs out wins the round.',
      'The first player to reach the target coin count wins the match.',
    ],
    coinRuleBn: 'প্রত্যেক খেলোয়াড়ের নিজস্ব একক কয়েন ও স্কোর থাকবে।',
    coinRuleEn: 'Every pirate maintains an individual coin balance and score.',
    victoryRuleBn: 'প্রথম খেলোয়াড় হিসেবে নির্ধারিত কয়েন লক্ষ্য পূর্ণ করা অথবা সর্বোচ্চ কয়েন অর্জন।',
    victoryRuleEn: 'First player to reach the target coins or hold the most coins after max rounds.',
    victoryConditionBn: 'প্রথম খেলোয়াড় হিসেবে নির্ধারিত কয়েন লক্ষ্য পূর্ণ করা অথবা সর্বোচ্চ কয়েন অর্জন।',
    victoryConditionEn: 'First player to reach the target coins or hold the most coins after max rounds.',
    playerCountLabelBn: '২–৬ জন খেলোয়াড়',
    playerCountLabelEn: '2–6 Players',
    teamArrangementBn: 'একক (ফ্রি ফর অল)',
    teamArrangementEn: 'Solo (Free for All)',
    minPlayers: 2,
    maxPlayers: 6,
    defaultPlayers: 4,
    allowedPlayerCounts: [2, 3, 4, 5, 6],
    teamStructure: 'none',
    teamsCount: 0,
    sharedTeamEconomy: false,
    defaultTargetCoins: 4,
    defaultRoundReward: 2,
    defaultMaxRounds: 10,
    supportsAI: true,
    supportsLocal: true,
    supportsOnline: true,
    accentHex: '#f59e0b',
  },

  duo: {
    id: 'duo',
    badgeEmoji: '⚔️',
    nameBn: 'ডুয়ো — ক্রু ব্যাটল',
    nameEn: 'Duo — Crew Battle',
    subtitleBn: '২ বনাম ২ দলগত লড়াই · যৌথ কয়েন ভান্ডার',
    subtitleEn: '2 vs 2 Team Clash · Shared Crew Treasury',
    shortDescBn:
      'ঠিক ৪ জন খেলোয়াড় ২টি দলে (প্রতি দলে ২ জন) ভাগ হয়ে লড়বে। দলের অর্জিত কয়েন ও স্কোর যৌথভাবে গণনা হবে।',
    shortDescEn:
      'Exactly 4 players split into 2 crews of 2. Teammates keep private hands and turns while sharing one team coin balance.',
    fullRulesBn: [
      'ঠিক ৪ জন খেলোয়াড়: ২টি দল এবং প্রতি দলে ২ জন করে সদস্য।',
      'হোস্ট খেলা শুরুর আগে খেলোয়াড়দের দল নির্ধারণ বা অদলবদল করতে পারবেন।',
      'প্রত্যেক খেলোয়াড়ের হাতের কার্ড সম্পূর্ণ গোপন থাকবে এবং প্রত্যেকে আলাদাভাবে নিজের চাল দেবে।',
      'দলের যেকোনো সদস্য কয়েন জিতলে তা সরাসরি দলের যৌথ কয়েন ভান্ডারে যুক্ত হবে (দ্বিগুণ হবে না)।',
      'কোনো দলের উভয় প্রতিপক্ষ আউট হলে বা ডেক শেষে সর্বোচ্চ কার্ড থাকলে সেই দল রাউন্ড জিতবে।',
    ],
    fullRulesEn: [
      'Exactly 4 players divided into 2 teams of 2 players each.',
      'The host manually assigns or rearranges teams before starting.',
      'Each player keeps their own private hand and takes individual turns.',
      'Coins earned by any teammate are added once to the team’s shared coin balance.',
      'First crew to reach the team coin target wins the match.',
    ],
    coinRuleBn: 'দলের ২ জন সদস্য ১টি যৌথ কয়েন ভান্ডার ও স্কোর শেয়ার করবেন (হাতের কার্ড গোপন থাকবে)।',
    coinRuleEn: 'Both teammates share one team coin balance and score while keeping hands private.',
    victoryRuleBn: 'প্রথম দল হিসেবে যৌথভাবে নির্ধারিত কয়েন লক্ষ্য অর্জন করা।',
    victoryRuleEn: 'First 2-player crew to reach the shared team coin target wins.',
    victoryConditionBn: 'প্রথম দল হিসেবে যৌথভাবে নির্ধারিত কয়েন লক্ষ্য অর্জন করা।',
    victoryConditionEn: 'First 2-player crew to reach the shared team coin target wins.',
    playerCountLabelBn: '৪ জন খেলোয়াড়',
    playerCountLabelEn: '4 Players',
    teamArrangementBn: '২টি দল (২ বনাম ২)',
    teamArrangementEn: '2 Teams (2v2)',
    minPlayers: 4,
    maxPlayers: 4,
    defaultPlayers: 4,
    allowedPlayerCounts: [4],
    teamStructure: 'fixed_teams',
    teamsCount: 2,
    sharedTeamEconomy: true,
    defaultTargetCoins: 5,
    defaultRoundReward: 2,
    defaultMaxRounds: 10,
    supportsAI: true,
    supportsLocal: true,
    supportsOnline: true,
    accentHex: '#ef4444',
  },

  trio: {
    id: 'trio',
    badgeEmoji: '🔱',
    nameBn: 'ট্রিও — তিন ক্রুয়ের লড়াই',
    nameEn: 'Trio — Three Crews',
    subtitleBn: '২ বনাম ২ বনাম ২ · ত্রিমুখী নৌবহর যুদ্ধ',
    subtitleEn: '2 vs 2 vs 2 · Three-Way Fleet Warfare',
    shortDescBn:
      'ঠিক ৬ জন খেলোয়াড় ৩টি দলে (প্রতি দলে ২ জন) বিভক্ত হয়ে লড়বে। তিন দলের যৌথ কয়েন ও স্কোর সরাসরি প্রদর্শিত হবে।',
    shortDescEn:
      'Exactly 6 players in 3 crews of 2. Three pirate fleets clash with shared team treasuries and individual secret hands.',
    fullRulesBn: [
      'ঠিক ৬ জন খেলোয়াড়: ৩টি দল এবং প্রতি দলে ২ জন করে নাবিক।',
      'হোস্ট দল গঠন, ব্যালেন্স অথবা র‍্যান্ডম টিম অ্যাসাইনমেন্ট নিয়ন্ত্রণ করবেন।',
      'প্রতিটি দলের ১টি যৌথ কয়েন ব্যালেন্স থাকবে; দলের যেকোনো সদস্যের জয় দলের স্কোর বাড়াবে।',
      'সদস্যদের হাতের কার্ড পরস্পরের কাছে গোপন থাকবে এবং মূল কার্ডের নিয়ম অপরিবর্তিত থাকবে।',
    ],
    fullRulesEn: [
      'Exactly 6 players organized into 3 crews of 2 players each.',
      'Host controls team assignment, balancing, or randomizing before launch.',
      'Each crew shares one combined coin balance and score.',
      'Individual hands remain strictly private and all 10 character card abilities work as written.',
    ],
    coinRuleBn: '৩টি দলের প্রতিটির ১টি করে যৌথ কয়েন ভান্ডার ও দলগত স্কোর থাকবে।',
    coinRuleEn: 'Each of the 3 crews shares one combined coin treasury and team score.',
    victoryRuleBn: 'তিনটি দলের মধ্যে যে দল সবার আগে লক্ষ্য কয়েন পূর্ণ করবে তারা বিজয়ী হবে।',
    victoryRuleEn: 'First of the three crews to reach the target team coins wins.',
    victoryConditionBn: 'তিনটি দলের মধ্যে যে দল সবার আগে লক্ষ্য কয়েন পূর্ণ করবে তারা বিজয়ী হবে।',
    victoryConditionEn: 'First of the three crews to reach the target team coins wins.',
    playerCountLabelBn: '৬ জন খেলোয়াড়',
    playerCountLabelEn: '6 Players',
    teamArrangementBn: '৩টি দল (২x৩)',
    teamArrangementEn: '3 Teams (2v2v2)',
    minPlayers: 6,
    maxPlayers: 6,
    defaultPlayers: 6,
    allowedPlayerCounts: [6],
    teamStructure: 'fixed_teams',
    teamsCount: 3,
    sharedTeamEconomy: true,
    defaultTargetCoins: 5,
    defaultRoundReward: 2,
    defaultMaxRounds: 10,
    supportsAI: true,
    supportsLocal: true,
    supportsOnline: true,
    accentHex: '#06b6d4',
  },

  captain: {
    id: 'captain',
    badgeEmoji: '👑',
    nameBn: 'ক্যাপ্টেন — লাস্ট স্ট্যান্ড',
    nameEn: 'Captain — Last Stand',
    subtitleBn: '১ জন ক্যাপ্টেন বনাম ৩ জন চ্যালেঞ্জার',
    subtitleEn: '1 Captain vs 3 Challengers · Asymmetric Survival',
    shortDescBn:
      '১ জন ক্যাপ্টেন এককভাবে লড়বেন ৩ জন চ্যালেঞ্জারের দলের বিরুদ্ধে! ক্যাপ্টেন আউট হলে চ্যালেঞ্জাররা জিতবে, আর ৩ চ্যালেঞ্জার আউট হলে ক্যাপ্টেন জিতবেন!',
    shortDescEn:
      '1 Captain fights solo against a united crew of 3 Challengers! Captain wins by eliminating all 3 Challengers; Challengers win if the Captain is eliminated.',
    fullRulesBn: [
      'ঠিক ৪ জন খেলোয়াড়: ১ জন ক্যাপ্টেন বনাম ৩ জন চ্যালেঞ্জার।',
      'ক্যাপ্টেন এককভাবে লড়বেন এবং তার নিজস্ব কয়েন ও স্কোর থাকবে।',
      '৩ জন চ্যালেঞ্জার ১টি যৌথ দলের অধীনে কয়েন ও স্কোর শেয়ার করবেন।',
      'ক্যাপ্টেন যদি তিনজন চ্যালেঞ্জারকেই এলিমিনেট করে টিকে থাকেন (অথবা কয়েন লক্ষ্য পূর্ণ করেন), তবে ক্যাপ্টেন সরাসরি জয়ী হবেন!',
      'চ্যালেঞ্জাররা যদি ক্যাপ্টেনকে এলিমিনেট করতে সক্ষম হয়, তবে চ্যালেঞ্জার দল সাথে সাথে জয়ী হবে!',
    ],
    fullRulesEn: [
      'Exactly 4 players: 1 solo Captain against 3 Challengers.',
      'The Captain maintains an individual coin balance and score.',
      'All 3 Challengers share one combined team coin balance and score.',
      'The Captain wins immediately by surviving until all three Challengers are eliminated (or reaching target coins).',
      'The Challengers win immediately when the Captain is eliminated!',
    ],
    coinRuleBn: 'ক্যাপ্টেনের একক কয়েন থাকবে; ৩ জন চ্যালেঞ্জার ১টি যৌথ কয়েন ভান্ডার শেয়ার করবেন।',
    coinRuleEn: 'The Captain has an individual coin balance; all 3 Challengers share one team coin balance.',
    victoryRuleBn:
      'সব চ্যালেঞ্জার এলিমিনেট হলে ক্যাপ্টেন জয়ী; ক্যাপ্টেন এলিমিনেট হলে চ্যালেঞ্জার দল সাথে সাথে জয়ী!',
    victoryRuleEn:
      'Captain wins by surviving until all 3 Challengers are eliminated; Challengers win when the Captain is eliminated.',
    victoryConditionBn:
      'সব চ্যালেঞ্জার এলিমিনেট হলে ক্যাপ্টেন জয়ী; ক্যাপ্টেন এলিমিনেট হলে চ্যালেঞ্জার দল জয়ী!',
    victoryConditionEn:
      'Captain wins by surviving until all 3 Challengers are eliminated; Challengers win when the Captain is eliminated.',
    playerCountLabelBn: '৪ জন খেলোয়াড়',
    playerCountLabelEn: '4 Players',
    teamArrangementBn: '১ ক্যাপ্টেন বনাম ৩ চ্যালেঞ্জার',
    teamArrangementEn: '1 Captain vs 3',
    minPlayers: 4,
    maxPlayers: 4,
    defaultPlayers: 4,
    allowedPlayerCounts: [4],
    teamStructure: 'asymmetric_1v3',
    teamsCount: 2,
    sharedTeamEconomy: true,
    defaultTargetCoins: 4,
    defaultRoundReward: 2,
    defaultMaxRounds: 5,
    supportsAI: true,
    supportsLocal: true,
    supportsOnline: true,
    accentHex: '#a855f7',
  },

  race: {
    id: 'race',
    badgeEmoji: '🏁',
    nameBn: 'রেস — ট্রেজার রাশ',
    nameEn: 'Race — Treasure Rush',
    subtitleBn: 'একক রত্নভাণ্ডার দৌড় · কোনো দল নেই',
    subtitleEn: 'Solo Treasure Sprint · First to Target Wins',
    shortDescBn:
      '২–৬ জন খেলোয়াড়ের একক প্রতিযোগিতা! কোনো দল নেই—যে খেলোয়াড় সবার আগে রত্নভাণ্ডারের কয়েন লক্ষ্যে পৌঁছাবে, সে-ই সাথে সাথে জয়ী হবে।',
    shortDescEn:
      'Fast-paced individual treasure race for 2–6 players! No teams—every pirate races to fill their treasure meter to the target first.',
    fullRulesBn: [
      'শুধুমাত্র একক প্রতিযোগিতা (কোনো দল নেই, ২ থেকে ৬ জন খেলোয়াড়)।',
      'প্রত্যেক খেলোয়াড়ের নিজস্ব কয়েন ব্যালেন্স এবং ট্রেজার প্রোগ্রেস মিটার থাকবে।',
      'ছিচকে চোরের চুরি কিংবা রাউন্ড জয়—যেভাবেই হোক নির্ধারিত ট্রেজার লক্ষ্য (Target Coins) সবার আগে স্পর্শ করলেই তাৎক্ষণিক বিজয়!',
      'সকল মূল বাংলা চরিত্র কার্ডের ক্ষমতা অপরিবর্তিত থাকবে।',
    ],
    fullRulesEn: [
      'Individual competition only with no teams (2 to 6 players).',
      'Every player maintains an individual coin balance and treasure progress tracker.',
      'The first player to reach the configurable treasure target wins the match immediately.',
      'All original character card abilities and rules remain intact.',
    ],
    coinRuleBn: 'কোনো দল নেই—প্রত্যেক খেলোয়াড়ের নিজস্ব কয়েন ও ট্রেজার প্রোগ্রেস মিটার থাকবে।',
    coinRuleEn: 'No teams—every pirate tracks their own individual coin balance and treasure progress.',
    victoryRuleBn: 'নির্ধারিত রত্নভাণ্ডার লক্ষ্য (Treasure Target) স্পর্শ করা প্রথম খেলোয়াড় সাথে সাথে বিজয়ী!',
    victoryRuleEn: 'First individual player to reach the configured treasure target wins immediately.',
    victoryConditionBn: 'নির্ধারিত রত্নভাণ্ডার লক্ষ্য (Treasure Target) স্পর্শ করা প্রথম খেলোয়াড় সাথে সাথে বিজয়ী!',
    victoryConditionEn: 'First individual player to reach the configured treasure target wins immediately.',
    playerCountLabelBn: '২–৬ জন খেলোয়াড়',
    playerCountLabelEn: '2–6 Players',
    teamArrangementBn: 'একক (ট্রেজার রেস)',
    teamArrangementEn: 'Solo (Treasure Race)',
    minPlayers: 2,
    maxPlayers: 6,
    defaultPlayers: 4,
    allowedPlayerCounts: [2, 3, 4, 5, 6],
    teamStructure: 'none',
    teamsCount: 0,
    sharedTeamEconomy: false,
    defaultTargetCoins: 6,
    defaultRoundReward: 2,
    defaultMaxRounds: 15,
    supportsAI: true,
    supportsLocal: true,
    supportsOnline: true,
    accentHex: '#10b981',
  },
};

export const GAME_MODE_LIST: GameModeDefinition[] = [
  GAME_MODE_CONFIGS.classic,
  GAME_MODE_CONFIGS.duo,
  GAME_MODE_CONFIGS.trio,
  GAME_MODE_CONFIGS.captain,
  GAME_MODE_CONFIGS.race,
];

export interface TeamTemplate {
  id: string;
  nameBn: string;
  nameEn: string;
  shortNameBn: string;
  shortNameEn: string;
  color: string;
  colorHex: string;
  badgeClass: string;
  borderClass: string;
  maxMembers: number;
  isCaptainTeam?: boolean;
}

export function getTeamTemplatesForMode(matchMode: MatchModeId = 'classic'): TeamTemplate[] {
  if (matchMode === 'duo') {
    return [
      {
        id: 'team_alpha',
        nameBn: 'লাল ক্রু (Crimson Crew)',
        nameEn: 'Crimson Crew',
        shortNameBn: 'লাল ক্রু',
        shortNameEn: 'Crimson',
        color: 'crimson',
        colorHex: '#ef4444',
        badgeClass: 'bg-red-950/90 text-red-200 border-red-500/60',
        borderClass: 'border-red-500/65',
        maxMembers: 2,
      },
      {
        id: 'team_beta',
        nameBn: 'নীল ক্রু (Sapphire Crew)',
        nameEn: 'Sapphire Crew',
        shortNameBn: 'নীল ক্রু',
        shortNameEn: 'Sapphire',
        color: 'sapphire',
        colorHex: '#3b82f6',
        badgeClass: 'bg-blue-950/90 text-blue-200 border-blue-400/60',
        borderClass: 'border-blue-400/65',
        maxMembers: 2,
      },
    ];
  }

  if (matchMode === 'trio') {
    return [
      {
        id: 'team_alpha',
        nameBn: 'লাল ক্রু (Crimson Crew)',
        nameEn: 'Crimson Crew',
        shortNameBn: 'লাল ক্রু',
        shortNameEn: 'Crimson',
        color: 'crimson',
        colorHex: '#ef4444',
        badgeClass: 'bg-red-950/90 text-red-200 border-red-500/60',
        borderClass: 'border-red-500/65',
        maxMembers: 2,
      },
      {
        id: 'team_beta',
        nameBn: 'নীল ক্রু (Sapphire Crew)',
        nameEn: 'Sapphire Crew',
        shortNameBn: 'নীল ক্রু',
        shortNameEn: 'Sapphire',
        color: 'sapphire',
        colorHex: '#06b6d4',
        badgeClass: 'bg-cyan-950/90 text-cyan-200 border-cyan-400/60',
        borderClass: 'border-cyan-400/65',
        maxMembers: 2,
      },
      {
        id: 'team_gamma',
        nameBn: 'সবুজ ক্রু (Emerald Crew)',
        nameEn: 'Emerald Crew',
        shortNameBn: 'সবুজ ক্রু',
        shortNameEn: 'Emerald',
        color: 'emerald',
        colorHex: '#10b981',
        badgeClass: 'bg-emerald-950/90 text-emerald-200 border-emerald-400/60',
        borderClass: 'border-emerald-400/65',
        maxMembers: 2,
      },
    ];
  }

  if (matchMode === 'captain') {
    return [
      {
        id: 'team_captain',
        nameBn: 'জাহাজের ক্যাপ্টেন (Captain)',
        nameEn: 'The Captain',
        shortNameBn: 'ক্যাপ্টেন',
        shortNameEn: 'Captain',
        color: 'gold',
        colorHex: '#f59e0b',
        badgeClass: 'bg-amber-500/25 text-amber-200 border-amber-400/80',
        borderClass: 'border-amber-400',
        maxMembers: 1,
        isCaptainTeam: true,
      },
      {
        id: 'team_challengers',
        nameBn: 'চ্যালেঞ্জার দল (Challengers)',
        nameEn: 'Challenger Crew',
        shortNameBn: 'চ্যালেঞ্জার',
        shortNameEn: 'Challenger',
        color: 'crimson',
        colorHex: '#a855f7',
        badgeClass: 'bg-purple-950/90 text-purple-200 border-purple-400/60',
        borderClass: 'border-purple-400/65',
        maxMembers: 3,
        isCaptainTeam: false,
      },
    ];
  }

  return [];
}

export function getModeConfig(matchMode?: MatchModeId): GameModeDefinition {
  return GAME_MODE_CONFIGS[matchMode ?? 'classic'] ?? GAME_MODE_CONFIGS.classic;
}

const DEFAULT_BN_NAMES = [
  'ক্যাপ্টেন রফিক',
  'জলদস্যু রুস্তম',
  'নাবিক সুলতানা',
  'গোলন্দাজ করিম',
  'গুপ্তচর নাদিয়া',
  'বণিক হাশেম',
];

/**
 * Ensures the player roster matches the required player count for `matchMode`
 * and assigns valid default teams when entering or switching modes.
 */
export function normalizePlayersForMode(
  existingPlayers: PlayerConfig[],
  matchMode: MatchModeId = 'classic',
  connectionMode: GameMode = 'ai'
): PlayerConfig[] {
  const modeDef = getModeConfig(matchMode);
  let targetCount = existingPlayers.length;
  if (targetCount < modeDef.minPlayers || targetCount > modeDef.maxPlayers) {
    targetCount = modeDef.defaultPlayers;
  }

  const resized: PlayerConfig[] = [];
  for (let i = 0; i < targetCount; i++) {
    const existing = existingPlayers[i];
    if (existing) {
      resized.push({
        ...existing,
        isAI: connectionMode === 'ai' ? i > 0 : existing.isAI,
        ready: true,
      });
    } else {
      resized.push({
        id: `player_${i + 1}`,
        name:
          i === 0 && connectionMode === 'ai'
            ? 'আপনি (You)'
            : DEFAULT_BN_NAMES[i % DEFAULT_BN_NAMES.length],
        avatar: PIRATE_AVATARS[i % PIRATE_AVATARS.length].emoji,
        isAI: connectionMode === 'ai' ? i > 0 : false,
        aiDifficulty: i === 1 ? 'medium' : i === 2 ? 'hard' : 'easy',
        ready: true,
      });
    }
  }

  // Check if current team assignment is already valid for this mode; if not, balance teams
  if (modeDef.teamStructure === 'none') {
    return resized.map((p) => ({
      ...p,
      teamId: undefined,
      role: 'solo',
    }));
  }

  const validation = validateTeamDistribution(resized, matchMode);
  if (validation.valid) {
    return resized;
  }

  return balanceTeams(resized, matchMode);
}

/**
 * Evenly assigns players to teams according to the mode's team structure.
 */
export function balanceTeams(
  players: PlayerConfig[],
  matchMode: MatchModeId = 'classic'
): PlayerConfig[] {
  if (matchMode === 'classic' || matchMode === 'race') {
    return players.map((p) => ({ ...p, teamId: undefined, role: 'solo' }));
  }

  if (matchMode === 'duo') {
    // 4 players -> 2 in team_alpha, 2 in team_beta
    return players.map((p, idx) => ({
      ...p,
      teamId: idx < 2 ? 'team_alpha' : 'team_beta',
      role: 'crew',
    }));
  }

  if (matchMode === 'trio') {
    // 6 players -> 2 in team_alpha, 2 in team_beta, 2 in team_gamma
    const teamIds = ['team_alpha', 'team_alpha', 'team_beta', 'team_beta', 'team_gamma', 'team_gamma'];
    return players.map((p, idx) => ({
      ...p,
      teamId: teamIds[idx % teamIds.length],
      role: 'crew',
    }));
  }

  if (matchMode === 'captain') {
    // 4 players -> Player 0 is Captain, Players 1..3 are Challengers
    return players.map((p, idx) => ({
      ...p,
      teamId: idx === 0 ? 'team_captain' : 'team_challengers',
      role: idx === 0 ? 'captain' : 'challenger',
    }));
  }

  return players;
}

/**
 * Randomly assigns players to teams while preserving the exact required team sizes.
 */
export function randomizeTeams(
  players: PlayerConfig[],
  matchMode: MatchModeId,
  rng: () => number = Math.random
): PlayerConfig[] {
  const balanced = balanceTeams(players, matchMode);
  if (matchMode === 'classic' || matchMode === 'race') {
    return balanced;
  }

  const slots = balanced.map((p) => ({ teamId: p.teamId, role: p.role }));
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = slots[i];
    slots[i] = slots[j];
    slots[j] = tmp;
  }

  return players.map((p, idx) => ({
    ...p,
    teamId: slots[idx].teamId,
    role: slots[idx].role,
  }));
}

/**
 * Allows the Host to manually assign or swap a player's team in the lobby.
 * In `captain` mode, assigning a player to `team_captain` makes them the sole Captain
 * and moves the previous Captain to `team_challengers`.
 * In `duo` / `trio`, if the target team already has `maxMembers`, it swaps with a member of that team
 * so the host can rearrange teams effortlessly with a single click, or sets `teamId` directly if space is open.
 */
export function assignPlayerToTeam(
  players: PlayerConfig[],
  playerId: string,
  targetTeamId: string,
  matchMode: MatchModeId,
  strictDirectSet: boolean = false
): PlayerConfig[] {
  const templates = getTeamTemplatesForMode(matchMode);
  const targetTemplate = templates.find((t) => t.id === targetTeamId);
  if (!targetTemplate) return players;

  const targetIdx = players.findIndex((p) => p.id === playerId);
  if (targetIdx === -1) return players;

  const currentTeamId = players[targetIdx].teamId;
  if (currentTeamId === targetTeamId) return players;

  const next = players.map((p) => ({ ...p }));

  if (matchMode === 'captain') {
    if (targetTeamId === 'team_captain') {
      return next.map((p) => ({
        ...p,
        teamId: p.id === playerId ? 'team_captain' : 'team_challengers',
        role: p.id === playerId ? 'captain' : 'challenger',
      }));
    } else {
      // Moving the current Captain to Challengers promotes the next player to Captain
      const otherCandidate = next.find((p) => p.id !== playerId);
      return next.map((p) => {
        if (p.id === playerId) {
          return { ...p, teamId: 'team_challengers', role: 'challenger' };
        }
        if (otherCandidate && p.id === otherCandidate.id && currentTeamId === 'team_captain') {
          return { ...p, teamId: 'team_captain', role: 'captain' };
        }
        return p;
      });
    }
  }

  if (strictDirectSet) {
    next[targetIdx].teamId = targetTeamId;
    next[targetIdx].role = 'crew';
    return next;
  }

  const currentMembersOfTarget = next.filter((p) => p.teamId === targetTeamId);
  if (currentMembersOfTarget.length >= targetTemplate.maxMembers && currentTeamId) {
    // Swap with the first member of targetTeamId
    const swapPartnerIdx = next.findIndex(
      (p) => p.teamId === targetTeamId && p.id !== playerId
    );
    if (swapPartnerIdx !== -1) {
      next[swapPartnerIdx].teamId = currentTeamId;
      next[swapPartnerIdx].role = 'crew';
    }
  }

  next[targetIdx].teamId = targetTeamId;
  next[targetIdx].role = 'crew';
  return next;
}

export function validateTeamDistribution(
  players: PlayerConfig[],
  matchMode: MatchModeId = 'classic'
): { valid: boolean; errorBn?: string; errorEn?: string } {
  const modeDef = getModeConfig(matchMode);

  if (players.length < modeDef.minPlayers || players.length > modeDef.maxPlayers) {
    return {
      valid: false,
      errorBn: `${modeDef.nameBn} মোডে খেলোয়াড় সংখ্যা অবশ্যই ${
        modeDef.minPlayers === modeDef.maxPlayers
          ? `${modeDef.minPlayers} জন`
          : `${modeDef.minPlayers} থেকে ${modeDef.maxPlayers} জন`
      } হতে হবে (বর্তমানে ${players.length} জন)।`,
      errorEn: `${modeDef.nameEn} requires ${
        modeDef.minPlayers === modeDef.maxPlayers
          ? `exactly ${modeDef.minPlayers}`
          : `${modeDef.minPlayers}–${modeDef.maxPlayers}`
      } players (currently ${players.length}).`,
    };
  }

  if (matchMode === 'classic' || matchMode === 'race') {
    return { valid: true };
  }

  const templates = getTeamTemplatesForMode(matchMode);
  for (const tmpl of templates) {
    const count = players.filter((p) => p.teamId === tmpl.id).length;
    if (count !== tmpl.maxMembers) {
      return {
        valid: false,
        errorBn: `${tmpl.nameBn} দলে ঠিক ${tmpl.maxMembers} জন খেলোয়াড় প্রয়োজন (বর্তমানে ${count} জন)।`,
        errorEn: `${tmpl.nameEn} must have exactly ${tmpl.maxMembers} player(s) (currently ${count}).`,
      };
    }
  }

  return { valid: true };
}

export function validateLobbyForMode(
  players: PlayerConfig[],
  settingsOrMode: GameSettings | MatchModeId
): {
  valid: boolean;
  errorBn?: string;
  errorEn?: string;
  reasonBn?: string;
  reasonEn?: string;
} {
  const matchMode: MatchModeId =
    typeof settingsOrMode === 'string'
      ? settingsOrMode
      : settingsOrMode.matchMode ?? 'classic';
  const res = validateTeamDistribution(players, matchMode);
  return {
    ...res,
    reasonBn: res.errorBn,
    reasonEn: res.errorEn,
  };
}

/**
 * Creates the initial authoritative `TeamState[]` array for a match.
 */
export function createInitialTeams(
  players: PlayerState[],
  matchMode: MatchModeId = 'classic'
): TeamState[] {
  const templates = getTeamTemplatesForMode(matchMode);
  if (templates.length === 0) return [];

  return templates.map((tmpl) => ({
    id: tmpl.id,
    nameBn: tmpl.nameBn,
    nameEn: tmpl.nameEn,
    shortNameBn: tmpl.shortNameBn,
    shortNameEn: tmpl.shortNameEn,
    color: tmpl.color,
    colorHex: tmpl.colorHex,
    badgeClass: tmpl.badgeClass,
    borderClass: tmpl.borderClass,
    memberIds: players.filter((p) => p.teamId === tmpl.id).map((p) => p.id),
    coins: 0,
    roundCoinsEarned: 0,
    isCaptainTeam: tmpl.isCaptainTeam,
  }));
}

export function getPlayerTeam(
  state: GameState,
  playerId: string | undefined | null
): TeamState | undefined {
  if (!playerId || !state.teams || state.teams.length === 0) return undefined;
  const player = state.players.find((p) => p.id === playerId);
  if (player?.teamId) {
    return state.teams.find((t) => t.id === player.teamId);
  }
  return state.teams.find((t) => t.memberIds.includes(playerId));
}

export function areTeammates(
  state: GameState,
  playerAId: string | undefined | null,
  playerBId: string | undefined | null
): boolean {
  if (!playerAId || !playerBId || playerAId === playerBId) return false;
  const matchMode = state.settings.matchMode ?? 'classic';
  if (matchMode === 'classic' || matchMode === 'race') return false;
  const pA = state.players.find((p) => p.id === playerAId);
  const pB = state.players.find((p) => p.id === playerBId);
  return Boolean(pA?.teamId && pB?.teamId && pA.teamId === pB.teamId);
}

/**
 * Synchronizes each player's `coins` to their team's authoritative shared coin balance
 * when in a shared-team-economy mode (`duo`, `trio`, `captain`).
 */
export function syncTeamCoinsToPlayers(state: GameState): void {
  const matchMode = state.settings.matchMode ?? 'classic';
  const modeDef = getModeConfig(matchMode);
  if (!modeDef.sharedTeamEconomy || !state.teams || state.teams.length === 0) {
    return;
  }

  for (const team of state.teams) {
    for (const memberId of team.memberIds) {
      const player = state.players.find((p) => p.id === memberId);
      if (player) {
        player.coins = team.coins;
      }
    }
  }
}

/**
 * Awards coins to a player (or once to their shared team balance in team modes).
 */
export function awardCoinsToPlayerOrTeam(
  state: GameState,
  player: PlayerState,
  amount: number
): void {
  if (amount <= 0) return;
  const matchMode = state.settings.matchMode ?? 'classic';
  const modeDef = getModeConfig(matchMode);

  if (modeDef.sharedTeamEconomy && state.teams && state.teams.length > 0) {
    const team = getPlayerTeam(state, player.id);
    if (team) {
      team.coins += amount;
      team.roundCoinsEarned += amount;
      player.roundCoinsEarned += amount;
      syncTeamCoinsToPlayers(state);
      return;
    }
  }

  player.coins += amount;
  player.roundCoinsEarned += amount;
}
