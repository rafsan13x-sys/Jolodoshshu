import { PIRATE_AVATARS } from './cards.ts';

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 64;
export const RECOVERY_MIN_LENGTH = 4;
export const RECOVERY_MAX_LENGTH = 32;

// Allows English letters, Bengali letters/digits (\u0980-\u09FF), ASCII digits, and underscore
export const USERNAME_ALLOWED_REGEX = /^[a-zA-Z0-9_\u0980-\u09FF]+$/;

export interface PlayerAccountProfile {
  playerId: string;
  username: string;
  avatar: string;
  level: number;
  xp: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  totalMatches: number;
  wins: number;
  losses: number;
  coins: number;
  rankedRating: number;
  rankTitleBn: string;
  rankTitleEn: string;
  hasRecovery: boolean;
  createdAt: string;
  isGuest: false;
}

export interface GuestProfile {
  playerId: string;
  username: string;
  avatar: string;
  level: number;
  xp: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  totalMatches: number;
  wins: number;
  losses: number;
  coins: number;
  rankedRating: number;
  rankTitleBn: string;
  rankTitleEn: string;
  hasRecovery: false;
  createdAt: string;
  isGuest: true;
}

export type ActiveIdentity = PlayerAccountProfile | GuestProfile;

export interface ValidationResult {
  valid: boolean;
  errorBn?: string;
  errorEn?: string;
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function encodeUsernameKey(username: string): string {
  const lower = normalizeUsername(username);
  return `u_${Array.from(new TextEncoder().encode(lower))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')}`;
}

export function validateUsername(rawUsername: string): ValidationResult {
  const trimmed = (rawUsername || '').trim();
  if (trimmed.length < USERNAME_MIN_LENGTH) {
    return {
      valid: false,
      errorBn: `ইউজারনেম কমপক্ষে ${USERNAME_MIN_LENGTH} অক্ষরের হতে হবে।`,
      errorEn: `Username must be at least ${USERNAME_MIN_LENGTH} characters long.`,
    };
  }
  if (trimmed.length > USERNAME_MAX_LENGTH) {
    return {
      valid: false,
      errorBn: `ইউজারনেম সর্বোচ্চ ${USERNAME_MAX_LENGTH} অক্ষরের হতে পারবে।`,
      errorEn: `Username cannot exceed ${USERNAME_MAX_LENGTH} characters.`,
    };
  }
  if (!USERNAME_ALLOWED_REGEX.test(trimmed)) {
    return {
      valid: false,
      errorBn: 'ইউজারনেমে শুধুমাত্র অক্ষর, সংখ্যা এবং আন্ডারস্কোর (_) ব্যবহার করা যাবে (স্পেস বা বিশেষ চিহ্ন নয়)।',
      errorEn: 'Username may only contain letters, numbers, and underscores (_) with no spaces.',
    };
  }
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('guest_') || lower === 'guest' || lower.startsWith('গেস্ট')) {
    return {
      valid: false,
      errorBn: '"Guest" বা "গেস্ট" শব্দ দিয়ে অ্যাকাউন্টের ইউজারনেম শুরু করা যাবে না।',
      errorEn: 'Registered usernames cannot start with reserved "Guest" prefixes.',
    };
  }
  return { valid: true };
}

export function validatePassword(rawPassword: string): ValidationResult {
  const pwd = rawPassword || '';
  if (pwd.length < PASSWORD_MIN_LENGTH) {
    return {
      valid: false,
      errorBn: `পাসওয়ার্ড কমপক্ষে ${PASSWORD_MIN_LENGTH} অক্ষরের হতে হবে।`,
      errorEn: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`,
    };
  }
  if (pwd.length > PASSWORD_MAX_LENGTH) {
    return {
      valid: false,
      errorBn: `পাসওয়ার্ড সর্বোচ্চ ${PASSWORD_MAX_LENGTH} অক্ষরের হতে পারবে।`,
      errorEn: `Password cannot exceed ${PASSWORD_MAX_LENGTH} characters.`,
    };
  }
  return { valid: true };
}

export function validateRegistrationInput(
  username: string,
  password: string,
  confirmPassword: string,
  recoveryPhrase?: string
): ValidationResult {
  const uCheck = validateUsername(username);
  if (!uCheck.valid) return uCheck;

  const pCheck = validatePassword(password);
  if (!pCheck.valid) return pCheck;

  if (password !== confirmPassword) {
    return {
      valid: false,
      errorBn: 'পাসওয়ার্ড এবং নিশ্চিতকরণ পাসওয়ার্ড মিলছে না!',
      errorEn: 'Passwords do not match!',
    };
  }

  if (recoveryPhrase && recoveryPhrase.trim().length > 0) {
    const trimmedRec = recoveryPhrase.trim();
    if (trimmedRec.length < RECOVERY_MIN_LENGTH || trimmedRec.length > RECOVERY_MAX_LENGTH) {
      return {
        valid: false,
        errorBn: `পুনরুদ্ধার কোড ${RECOVERY_MIN_LENGTH} থেকে ${RECOVERY_MAX_LENGTH} অক্ষরের মধ্যে হতে হবে।`,
        errorEn: `Recovery passphrase must be between ${RECOVERY_MIN_LENGTH} and ${RECOVERY_MAX_LENGTH} characters.`,
      };
    }
  }

  return { valid: true };
}

export function calculateLevelFromXp(rawXp: number): {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
} {
  const safeXp = Math.max(0, Math.floor(Number.isFinite(rawXp) ? rawXp : 0));
  const level = Math.min(999, Math.floor(safeXp / 100) + 1);
  return {
    level,
    xpIntoLevel: safeXp % 100,
    xpForNextLevel: 100,
  };
}

export function getPirateRankTitle(rankedRating: number): {
  rankTitleBn: string;
  rankTitleEn: string;
} {
  if (rankedRating >= 1600) {
    return {
      rankTitleBn: 'সাত সমুদ্রের সম্রাট',
      rankTitleEn: 'Sovereign of the Seas',
    };
  }
  if (rankedRating >= 1350) {
    return {
      rankTitleBn: 'জলদস্যু অধিপতি',
      rankTitleEn: 'Pirate Lord',
    };
  }
  if (rankedRating >= 1150) {
    return {
      rankTitleBn: 'জাহাজ কমান্ডার',
      rankTitleEn: 'Quartermaster',
    };
  }
  if (rankedRating >= 1050) {
    return {
      rankTitleBn: 'জাহাজ চালক',
      rankTitleEn: 'Helmsman',
    };
  }
  return {
    rankTitleBn: 'ডেক নাবিক',
    rankTitleEn: 'Deckhand',
  };
}

export function computeMatchProgressionReward(params: {
  won: boolean;
  roundCoinsEarned: number;
  isRanked?: boolean;
  roundsPlayed?: number;
}): {
  xpDelta: number;
  coinsDelta: number;
  ratingDelta: number;
} {
  const safeRounds = Math.min(Math.max(1, Math.floor(params.roundsPlayed ?? 1)), 12);
  const safeRoundCoins = Math.min(Math.max(0, Math.floor(params.roundCoinsEarned ?? 0)), 15);
  const xpDelta = (params.won ? 45 : 20) + safeRounds * 3;
  const coinsDelta = (params.won ? 25 : 10) + safeRoundCoins * 3;
  const ratingDelta = params.isRanked ? (params.won ? 25 : -12) : 0;
  return { xpDelta, coinsDelta, ratingDelta };
}

export function canAccessMultiplayerQueue(
  identity: { isGuest: boolean } | null | undefined,
  isRanked: boolean
): ValidationResult {
  if (!isRanked) {
    return { valid: true };
  }
  if (!identity || identity.isGuest) {
    return {
      valid: false,
      errorBn:
        'র‍্যাঙ্কড মাল্টিপ্লেয়ার শুধুমাত্র লগইন করা অ্যাকাউন্টের জন্য উন্মুক্ত! গেস্ট খেলোয়াড়রা ক্যাজুয়াল মাল্টিপ্লেয়ার খেলতে পারবেন।',
      errorEn:
        'Only authenticated accounts can access Ranked Multiplayer! Guests may play Casual Multiplayer modes.',
    };
  }
  return { valid: true };
}

export function sanitizeGuestLobbyName(
  requestedName: string,
  registeredUsernamesLower: Set<string>,
  fallbackSuffix = '1'
): string {
  const raw = (requestedName || '').trim().slice(0, 18) || `নাবিক ${fallbackSuffix}`;
  const lower = raw.toLowerCase();
  if (registeredUsernamesLower.has(lower)) {
    return `গেস্ট · ${raw}`.slice(0, 24);
  }
  if (!raw.startsWith('গেস্ট') && !raw.toLowerCase().startsWith('guest')) {
    return `${raw} (গেস্ট)`.slice(0, 24);
  }
  return raw.slice(0, 24);
}

export function createInitialGuestProfile(seedId?: string): GuestProfile {
  const suffix = (seedId || Math.random().toString(36).slice(2, 6)).slice(-4).toUpperCase();
  return {
    playerId: seedId || `guest_${Math.random().toString(36).slice(2, 9)}`,
    username: `গেস্ট নাবিক #${suffix}`,
    avatar: PIRATE_AVATARS[1]?.emoji || '⚓',
    level: 1,
    xp: 0,
    xpIntoLevel: 0,
    xpForNextLevel: 100,
    totalMatches: 0,
    wins: 0,
    losses: 0,
    coins: 0,
    rankedRating: 1000,
    rankTitleBn: 'ডেক নাবিক (গেস্ট)',
    rankTitleEn: 'Deckhand (Guest)',
    hasRecovery: false,
    createdAt: new Date().toISOString(),
    isGuest: true,
  };
}
