import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { PIRATE_AVATARS } from '../game/cards.ts';
import {
  calculateLevelFromXp,
  computeMatchProgressionReward,
  encodeUsernameKey,
  getPirateRankTitle,
  normalizeUsername,
  PlayerAccountProfile,
  validatePassword,
  validateRegistrationInput,
  validateUsername,
} from '../game/auth.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VAULT_KEY = 'vlt_9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e';
const TOKEN_SECRET =
  process.env.JOLODOSHSHU_SESSION_SECRET ||
  'jolodoshshu_pirate_hmac_secret_9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d';

const fbApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const firestoreDb = getFirestore(fbApp, firebaseConfig.firestoreDatabaseId);

export interface StoredVaultAccount {
  playerId: string;
  username: string;
  usernameLower: string;
  avatar: string;
  passwordHash: string;
  passwordSalt: string;
  recoveryHash: string;
  recoverySalt: string;
  hasRecovery: boolean;
  level: number;
  xp: number;
  totalMatches: number;
  wins: number;
  losses: number;
  coins: number;
  rankedRating: number;
  createdAtIso: string;
}

interface LocalCachePayload {
  accountsById: Record<string, StoredVaultAccount>;
  playerIdByUsernameLower: Record<string, string>;
  recordedMatchKeys: string[];
  revokedTokens: string[];
}

const DATA_DIR = path.resolve(__dirname, '../../.data');
const CACHE_FILE = path.join(DATA_DIR, 'accounts-cache.json');

const accountsById = new Map<string, StoredVaultAccount>();
const playerIdByUsernameLower = new Map<string, string>();
const recordedMatchKeys = new Set<string>();
const revokedTokens = new Set<string>();

function loadLocalCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return;
    const raw = fs.readFileSync(CACHE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<LocalCachePayload>;
    if (parsed.accountsById) {
      for (const [k, v] of Object.entries(parsed.accountsById)) {
        accountsById.set(k, v);
      }
    }
    if (parsed.playerIdByUsernameLower) {
      for (const [k, v] of Object.entries(parsed.playerIdByUsernameLower)) {
        playerIdByUsernameLower.set(k, v);
      }
    }
    if (Array.isArray(parsed.recordedMatchKeys)) {
      for (const k of parsed.recordedMatchKeys) recordedMatchKeys.add(k);
    }
    if (Array.isArray(parsed.revokedTokens)) {
      for (const t of parsed.revokedTokens) revokedTokens.add(t);
    }
  } catch (err) {
    console.error('Failed to load local account cache:', err);
  }
}

function saveLocalCache() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const payload: LocalCachePayload = {
      accountsById: Object.fromEntries(accountsById.entries()),
      playerIdByUsernameLower: Object.fromEntries(playerIdByUsernameLower.entries()),
      recordedMatchKeys: Array.from(recordedMatchKeys).slice(-2000),
      revokedTokens: Array.from(revokedTokens).slice(-2000),
    };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(payload, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write local account cache:', err);
  }
}

loadLocalCache();

export function hashSecretWithSalt(secret: string, existingSalt?: string): {
  hash: string;
  salt: string;
} {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(secret, salt, 32).toString('hex');
  return { hash: derived, salt };
}

export function verifySecretHash(
  secret: string,
  expectedHashHex: string,
  saltHex: string
): boolean {
  if (!expectedHashHex || !saltHex) return false;
  try {
    const derived = crypto.scryptSync(secret, saltHex, 32);
    const expected = Buffer.from(expectedHashHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export interface SessionTokenPayload {
  playerId: string;
  username: string;
  rememberMe: boolean;
  iat: number;
  exp: number;
  jti: string;
}

export function createSessionToken(
  account: StoredVaultAccount,
  rememberMe: boolean
): string {
  const now = Date.now();
  const ttlMs = rememberMe
    ? 30 * 24 * 60 * 60 * 1000 // 30 days
    : 24 * 60 * 60 * 1000;     // 24 hours
  const payload: SessionTokenPayload = {
    playerId: account.playerId,
    username: account.username,
    rememberMe: Boolean(rememberMe),
    iat: now,
    exp: now + ttlMs,
    jti: crypto.randomBytes(12).toString('hex'),
  };
  const bodyB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(bodyB64)
    .digest('base64url');
  return `${bodyB64}.${sig}`;
}

export function verifySessionToken(token?: string | null): SessionTokenPayload | null {
  if (!token || typeof token !== 'string') return null;
  const clean = token.trim();
  if (revokedTokens.has(clean)) return null;
  const parts = clean.split('.');
  if (parts.length !== 2) return null;
  const [bodyB64, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(bodyB64)
    .digest('base64url');
  try {
    const sigBuf = Buffer.from(sig, 'utf8');
    const expBuf = Buffer.from(expectedSig, 'utf8');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    const payload = JSON.parse(
      Buffer.from(bodyB64, 'base64url').toString('utf8')
    ) as SessionTokenPayload;
    if (!payload.playerId || !payload.exp || Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function revokeSessionToken(token?: string | null): void {
  if (!token || typeof token !== 'string') return;
  revokedTokens.add(token.trim());
  saveLocalCache();
}

export function toPublicAccountProfile(acc: StoredVaultAccount): PlayerAccountProfile {
  const { level, xpIntoLevel, xpForNextLevel } = calculateLevelFromXp(acc.xp);
  const { rankTitleBn, rankTitleEn } = getPirateRankTitle(acc.rankedRating);
  return {
    playerId: acc.playerId,
    username: acc.username,
    avatar: acc.avatar,
    level,
    xp: acc.xp,
    xpIntoLevel,
    xpForNextLevel,
    totalMatches: acc.totalMatches,
    wins: acc.wins,
    losses: acc.losses,
    coins: acc.coins,
    rankedRating: acc.rankedRating,
    rankTitleBn,
    rankTitleEn,
    hasRecovery: Boolean(acc.hasRecovery),
    createdAt: acc.createdAtIso,
    isGuest: false,
  };
}

async function fetchAccountFromFirestoreById(
  playerId: string
): Promise<StoredVaultAccount | null> {
  try {
    const snap = await getDoc(doc(firestoreDb, 'vaults', VAULT_KEY, 'accounts', playerId));
    if (!snap.exists()) return null;
    const data = snap.data();
    const record: StoredVaultAccount = {
      playerId: String(data.playerId),
      username: String(data.username),
      usernameLower: String(data.usernameLower),
      avatar: String(data.avatar || PIRATE_AVATARS[0].emoji),
      passwordHash: String(data.passwordHash),
      passwordSalt: String(data.passwordSalt),
      recoveryHash: String(data.recoveryHash || ''),
      recoverySalt: String(data.recoverySalt || ''),
      hasRecovery: Boolean(data.hasRecovery),
      level: Number(data.level || 1),
      xp: Number(data.xp || 0),
      totalMatches: Number(data.totalMatches || 0),
      wins: Number(data.wins || 0),
      losses: Number(data.losses || 0),
      coins: Number(data.coins || 0),
      rankedRating: Number(data.rankedRating || 1000),
      createdAtIso: String(data.createdAtIso || new Date().toISOString()),
    };
    accountsById.set(record.playerId, record);
    playerIdByUsernameLower.set(record.usernameLower, record.playerId);
    saveLocalCache();
    return record;
  } catch (err) {
    console.error('Firestore fetchAccountFromFirestoreById error:', err);
    return accountsById.get(playerId) ?? null;
  }
}

async function fetchAccountFromFirestoreByUsername(
  username: string
): Promise<StoredVaultAccount | null> {
  const lower = normalizeUsername(username);
  const cachedId = playerIdByUsernameLower.get(lower);
  if (cachedId && accountsById.has(cachedId)) {
    return accountsById.get(cachedId)!;
  }
  try {
    const usernameKey = encodeUsernameKey(lower);
    const indexSnap = await getDoc(
      doc(firestoreDb, 'vaults', VAULT_KEY, 'usernames', usernameKey)
    );
    if (!indexSnap.exists()) return null;
    const targetPlayerId = String(indexSnap.data().playerId);
    return await fetchAccountFromFirestoreById(targetPlayerId);
  } catch (err) {
    console.error('Firestore fetchAccountFromFirestoreByUsername error:', err);
    return null;
  }
}

export async function getAccountById(
  playerId: string
): Promise<StoredVaultAccount | null> {
  if (accountsById.has(playerId)) {
    return accountsById.get(playerId)!;
  }
  return await fetchAccountFromFirestoreById(playerId);
}

export function getRegisteredUsernamesLowerSet(): Set<string> {
  return new Set(playerIdByUsernameLower.keys());
}

export async function registerAccount(params: {
  username: string;
  password: string;
  confirmPassword: string;
  avatar?: string;
  recoveryPhrase?: string;
  rememberMe?: boolean;
  migrateGuestStats?: {
    wins?: number;
    losses?: number;
    coins?: number;
    xp?: number;
  };
}): Promise<{
  ok: boolean;
  token?: string;
  profile?: PlayerAccountProfile;
  errorBn?: string;
  errorEn?: string;
}> {
  const validation = validateRegistrationInput(
    params.username,
    params.password,
    params.confirmPassword,
    params.recoveryPhrase
  );
  if (!validation.valid) {
    return {
      ok: false,
      errorBn: validation.errorBn,
      errorEn: validation.errorEn,
    };
  }

  const trimmedUsername = params.username.trim();
  const usernameLower = normalizeUsername(trimmedUsername);

  // Check duplicate username in cache & Firestore
  const existing = await fetchAccountFromFirestoreByUsername(trimmedUsername);
  if (existing) {
    return {
      ok: false,
      errorBn: `"${trimmedUsername}" ইউজারনেমটি ইতোমধ্যে ব্যবহৃত হয়েছে! অনুগ্রহ করে অন্য নাম দিন।`,
      errorEn: `Username "${trimmedUsername}" is already taken! Please choose another.`,
    };
  }

  const playerId = `capt_${crypto.randomBytes(6).toString('hex')}`;
  const validAvatars = new Set(PIRATE_AVATARS.map((a) => a.emoji));
  const chosenAvatar =
    params.avatar && validAvatars.has(params.avatar)
      ? params.avatar
      : PIRATE_AVATARS[0].emoji;

  const { hash: passwordHash, salt: passwordSalt } = hashSecretWithSalt(params.password);

  let recoveryHash = '';
  let recoverySalt = '';
  let hasRecovery = false;
  if (params.recoveryPhrase && params.recoveryPhrase.trim().length > 0) {
    const rec = hashSecretWithSalt(params.recoveryPhrase.trim());
    recoveryHash = rec.hash;
    recoverySalt = rec.salt;
    hasRecovery = true;
  }

  // Bounded guest migration (prevents abuse while letting guests keep their initial trial stats)
  const migratedWins = Math.min(Math.max(0, Math.floor(params.migrateGuestStats?.wins ?? 0)), 3);
  const migratedLosses = Math.min(
    Math.max(0, Math.floor(params.migrateGuestStats?.losses ?? 0)),
    5
  );
  const migratedTotal = migratedWins + migratedLosses;
  const migratedXp = Math.min(Math.max(0, Math.floor(params.migrateGuestStats?.xp ?? 0)), 180);
  const migratedCoins =
    50 + Math.min(Math.max(0, Math.floor(params.migrateGuestStats?.coins ?? 0)), 90);
  const { level } = calculateLevelFromXp(migratedXp);

  const createdAtIso = new Date().toISOString();
  const record: StoredVaultAccount = {
    playerId,
    username: trimmedUsername,
    usernameLower,
    avatar: chosenAvatar,
    passwordHash,
    passwordSalt,
    recoveryHash,
    recoverySalt,
    hasRecovery,
    level,
    xp: migratedXp,
    totalMatches: migratedTotal,
    wins: migratedWins,
    losses: migratedLosses,
    coins: migratedCoins,
    rankedRating: 1000,
    createdAtIso,
  };

  const usernameKey = encodeUsernameKey(usernameLower);

  // Persist atomically to Cloud Firestore
  try {
    const batch = writeBatch(firestoreDb);
    const accRef = doc(firestoreDb, 'vaults', VAULT_KEY, 'accounts', playerId);
    const unameRef = doc(firestoreDb, 'vaults', VAULT_KEY, 'usernames', usernameKey);

    batch.set(accRef, {
      ...record,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(unameRef, {
      usernameKey,
      usernameLower,
      playerId,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    console.error('Firestore atomic registration error:', err);
    return {
      ok: false,
      errorBn: 'ডাটাবেসে অ্যাকাউন্ট সংরক্ষণ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।',
      errorEn: 'Failed to persist account to database. Please try again.',
    };
  }

  accountsById.set(playerId, record);
  playerIdByUsernameLower.set(usernameLower, playerId);
  saveLocalCache();

  const token = createSessionToken(record, Boolean(params.rememberMe));
  return {
    ok: true,
    token,
    profile: toPublicAccountProfile(record),
  };
}

export async function loginAccount(params: {
  username: string;
  password: string;
  rememberMe?: boolean;
}): Promise<{
  ok: boolean;
  token?: string;
  profile?: PlayerAccountProfile;
  errorBn?: string;
  errorEn?: string;
}> {
  const uCheck = validateUsername(params.username);
  if (!uCheck.valid) {
    return {
      ok: false,
      errorBn: 'সঠিক ইউজারনেম ও পাসওয়ার্ড প্রদান করুন।',
      errorEn: 'Invalid username or password.',
    };
  }

  const record = await fetchAccountFromFirestoreByUsername(params.username);
  if (!record) {
    return {
      ok: false,
      errorBn: 'এই ইউজারনেমে কোনো অ্যাকাউন্ট পাওয়া যায়নি!',
      errorEn: 'No account found with that username!',
    };
  }

  const matched = verifySecretHash(
    params.password || '',
    record.passwordHash,
    record.passwordSalt
  );
  if (!matched) {
    return {
      ok: false,
      errorBn: 'পাসওয়ার্ডটি সঠিক নয়! আবার চেষ্টা করুন।',
      errorEn: 'Incorrect password! Please try again.',
    };
  }

  const token = createSessionToken(record, Boolean(params.rememberMe));
  return {
    ok: true,
    token,
    profile: toPublicAccountProfile(record),
  };
}

export async function checkRecoveryStatus(username: string): Promise<{
  ok: boolean;
  exists: boolean;
  hasRecovery: boolean;
  errorBn?: string;
  errorEn?: string;
}> {
  const uCheck = validateUsername(username);
  if (!uCheck.valid) {
    return {
      ok: false,
      exists: false,
      hasRecovery: false,
      errorBn: uCheck.errorBn,
      errorEn: uCheck.errorEn,
    };
  }
  const record = await fetchAccountFromFirestoreByUsername(username);
  if (!record) {
    return {
      ok: false,
      exists: false,
      hasRecovery: false,
      errorBn: 'এই ইউজারনেমে কোনো অ্যাকাউন্ট পাওয়া যায়নি।',
      errorEn: 'No account found with that username.',
    };
  }
  return {
    ok: true,
    exists: true,
    hasRecovery: Boolean(record.hasRecovery),
  };
}

export async function resetPasswordWithRecovery(params: {
  username: string;
  recoveryPhrase: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{
  ok: boolean;
  errorBn?: string;
  errorEn?: string;
}> {
  const record = await fetchAccountFromFirestoreByUsername(params.username);
  if (!record) {
    return {
      ok: false,
      errorBn: 'এই ইউজারনেমে কোনো অ্যাকাউন্ট পাওয়া যায়নি।',
      errorEn: 'Account not found.',
    };
  }
  if (!record.hasRecovery || !record.recoveryHash || !record.recoverySalt) {
    return {
      ok: false,
      errorBn: 'এই অ্যাকাউন্টে কোনো পাসওয়ার্ড পুনরুদ্ধার কোড (Recovery Passphrase) সেট করা নেই।',
      errorEn: 'No verified recovery passphrase is configured for this account.',
    };
  }

  const validRecovery = verifySecretHash(
    (params.recoveryPhrase || '').trim(),
    record.recoveryHash,
    record.recoverySalt
  );
  if (!validRecovery) {
    return {
      ok: false,
      errorBn: 'পুনরুদ্ধার কোডটি (Recovery Passphrase) সঠিক নয়!',
      errorEn: 'Invalid recovery passphrase!',
    };
  }

  const pwdCheck = validatePassword(params.newPassword);
  if (!pwdCheck.valid) {
    return {
      ok: false,
      errorBn: pwdCheck.errorBn,
      errorEn: pwdCheck.errorEn,
    };
  }
  if (params.newPassword !== params.confirmPassword) {
    return {
      ok: false,
      errorBn: 'নতুন পাসওয়ার্ড এবং নিশ্চিতকরণ পাসওয়ার্ড মিলছে না!',
      errorEn: 'New password and confirmation do not match!',
    };
  }

  const { hash: passwordHash, salt: passwordSalt } = hashSecretWithSalt(
    params.newPassword
  );

  try {
    const accRef = doc(firestoreDb, 'vaults', VAULT_KEY, 'accounts', record.playerId);
    await updateDoc(accRef, {
      passwordHash,
      passwordSalt,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('Firestore resetPasswordWithRecovery error:', err);
    return {
      ok: false,
      errorBn: 'পাসওয়ার্ড আপডেট করতে সমস্যা হয়েছে।',
      errorEn: 'Failed to update password in database.',
    };
  }

  record.passwordHash = passwordHash;
  record.passwordSalt = passwordSalt;
  accountsById.set(record.playerId, record);
  saveLocalCache();

  return { ok: true };
}

export async function updateAccountAvatarAndRecovery(params: {
  playerId: string;
  avatar?: string;
  recoveryPhrase?: string;
}): Promise<{
  ok: boolean;
  profile?: PlayerAccountProfile;
  errorBn?: string;
  errorEn?: string;
}> {
  const record = await getAccountById(params.playerId);
  if (!record) {
    return {
      ok: false,
      errorBn: 'অ্যাকাউন্ট খুঁজে পাওয়া যায়নি।',
      errorEn: 'Account not found.',
    };
  }

  const validAvatars = new Set(PIRATE_AVATARS.map((a) => a.emoji));
  const nextAvatar =
    params.avatar && validAvatars.has(params.avatar) ? params.avatar : record.avatar;

  let nextRecoveryHash = record.recoveryHash;
  let nextRecoverySalt = record.recoverySalt;
  let nextHasRecovery = record.hasRecovery;

  if (params.recoveryPhrase && params.recoveryPhrase.trim().length > 0) {
    const trimmed = params.recoveryPhrase.trim();
    if (trimmed.length < 4 || trimmed.length > 32) {
      return {
        ok: false,
        errorBn: 'পুনরুদ্ধার কোড ৪ থেকে ৩২ অক্ষরের মধ্যে হতে হবে।',
        errorEn: 'Recovery passphrase must be between 4 and 32 characters.',
      };
    }
    const hashed = hashSecretWithSalt(trimmed);
    nextRecoveryHash = hashed.hash;
    nextRecoverySalt = hashed.salt;
    nextHasRecovery = true;
  }

  try {
    const accRef = doc(firestoreDb, 'vaults', VAULT_KEY, 'accounts', record.playerId);
    await updateDoc(accRef, {
      avatar: nextAvatar,
      recoveryHash: nextRecoveryHash,
      recoverySalt: nextRecoverySalt,
      hasRecovery: nextHasRecovery,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('Firestore updateAccountAvatarAndRecovery error:', err);
    return {
      ok: false,
      errorBn: 'প্রোফাইল আপডেট করতে সমস্যা হয়েছে।',
      errorEn: 'Failed to update profile in database.',
    };
  }

  record.avatar = nextAvatar;
  record.recoveryHash = nextRecoveryHash;
  record.recoverySalt = nextRecoverySalt;
  record.hasRecovery = nextHasRecovery;
  accountsById.set(record.playerId, record);
  saveLocalCache();

  return {
    ok: true,
    profile: toPublicAccountProfile(record),
  };
}

export async function recordAuthoritativeMatchOutcome(params: {
  playerId: string;
  matchId: string;
  won: boolean;
  roundCoinsEarned: number;
  roundsPlayed: number;
  isRanked?: boolean;
}): Promise<{
  ok: boolean;
  alreadyRecorded?: boolean;
  rewards?: { xpDelta: number; coinsDelta: number; ratingDelta: number };
  profile?: PlayerAccountProfile;
}> {
  if (!params.playerId || !params.matchId) {
    return { ok: false };
  }
  const dedupeKey = `${params.playerId}:${params.matchId}`;
  if (recordedMatchKeys.has(dedupeKey)) {
    const existing = await getAccountById(params.playerId);
    return {
      ok: true,
      alreadyRecorded: true,
      profile: existing ? toPublicAccountProfile(existing) : undefined,
    };
  }

  const record = await getAccountById(params.playerId);
  if (!record) {
    return { ok: false };
  }

  recordedMatchKeys.add(dedupeKey);

  const rewards = computeMatchProgressionReward({
    won: Boolean(params.won),
    roundCoinsEarned: params.roundCoinsEarned,
    isRanked: Boolean(params.isRanked),
    roundsPlayed: params.roundsPlayed,
  });

  const nextXp = Math.min(10000000, record.xp + rewards.xpDelta);
  const { level: nextLevel } = calculateLevelFromXp(nextXp);
  const nextTotalMatches = Math.min(1000000, record.totalMatches + 1);
  const nextWins = Math.min(1000000, record.wins + (params.won ? 1 : 0));
  const nextLosses = Math.min(1000000, record.losses + (params.won ? 0 : 1));
  const nextCoins = Math.min(100000000, record.coins + rewards.coinsDelta);
  const nextRating = Math.min(
    50000,
    Math.max(100, record.rankedRating + rewards.ratingDelta)
  );

  try {
    const accRef = doc(firestoreDb, 'vaults', VAULT_KEY, 'accounts', record.playerId);
    await updateDoc(accRef, {
      level: nextLevel,
      xp: nextXp,
      totalMatches: nextTotalMatches,
      wins: nextWins,
      losses: nextLosses,
      coins: nextCoins,
      rankedRating: nextRating,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('Firestore recordAuthoritativeMatchOutcome error:', err);
  }

  record.level = nextLevel;
  record.xp = nextXp;
  record.totalMatches = nextTotalMatches;
  record.wins = nextWins;
  record.losses = nextLosses;
  record.coins = nextCoins;
  record.rankedRating = nextRating;
  accountsById.set(record.playerId, record);
  saveLocalCache();

  return {
    ok: true,
    rewards,
    profile: toPublicAccountProfile(record),
  };
}
