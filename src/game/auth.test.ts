import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateLevelFromXp,
  canAccessMultiplayerQueue,
  computeMatchProgressionReward,
  createInitialGuestProfile,
  encodeUsernameKey,
  getPirateRankTitle,
  sanitizeGuestLobbyName,
  validatePassword,
  validateRegistrationInput,
  validateUsername,
} from './auth.ts';
import {
  createSessionToken,
  hashSecretWithSalt,
  revokeSessionToken,
  verifySecretHash,
  verifySessionToken,
} from '../server/accountStore.ts';
import type { StoredVaultAccount } from '../server/accountStore.ts';

describe('Jolodoshshu Custom Account & Security Logic', () => {
  it('validates usernames in both Bengali and English and blocks reserved Guest prefixes', () => {
    assert.equal(validateUsername('ক্যাপ্টেন_৭').valid, true);
    assert.equal(validateUsername('Blackbeard_99').valid, true);
    assert.equal(validateUsername('ab').valid, false); // too short (<3)
    assert.equal(validateUsername('a'.repeat(25)).valid, false); // too long (>20)
    assert.equal(validateUsername('bad space').valid, false); // spaces disallowed
    assert.equal(validateUsername('guest_pirate').valid, false); // reserved prefix
    assert.equal(validateUsername('গেস্ট_নাবিক').valid, false); // reserved Bengali prefix
  });

  it('encodes canonical usernames deterministically into safe ASCII Firestore keys', () => {
    const k1 = encodeUsernameKey('BlackBeard');
    const k2 = encodeUsernameKey('  blackbeard ');
    assert.equal(k1, k2);
    assert.match(k1, /^u_[0-9a-f]+$/);

    const bnKey = encodeUsernameKey('জলদস্যু_রাজা');
    assert.match(bnKey, /^u_[0-9a-f]+$/);
  });

  it('validates password length, confirmation matching, and recovery phrase bounds', () => {
    assert.equal(validatePassword('12345').valid, false);
    assert.equal(validatePassword('secret123').valid, true);

    const mismatch = validateRegistrationInput('PirateKing', 'secret123', 'secret999');
    assert.equal(mismatch.valid, false);

    const badRecovery = validateRegistrationInput('PirateKing', 'secret123', 'secret123', 'ab');
    assert.equal(badRecovery.valid, false);

    const validReg = validateRegistrationInput(
      'PirateKing',
      'secret123',
      'secret123',
      'my_ship_anchor'
    );
    assert.equal(validReg.valid, true);
  });

  it('hashes passwords with scrypt + random salt and verifies timing-safely without plaintext', () => {
    const plain = 'SevenSeas#2026!';
    const h1 = hashSecretWithSalt(plain);
    const h2 = hashSecretWithSalt(plain);

    assert.notEqual(h1.hash, plain);
    assert.notEqual(h1.salt, h2.salt);
    assert.notEqual(h1.hash, h2.hash);

    assert.equal(verifySecretHash(plain, h1.hash, h1.salt), true);
    assert.equal(verifySecretHash('WrongPassword!', h1.hash, h1.salt), false);
  });

  it('signs HMAC-SHA256 session tokens, rejects tampered signatures, and supports revocation', () => {
    const sampleAccount: StoredVaultAccount = {
      playerId: 'pirate_test001',
      username: 'Captain_Jack',
      usernameLower: 'captain_jack',
      avatar: '🏴‍☠️',
      passwordHash: '0'.repeat(64),
      passwordSalt: '1'.repeat(32),
      recoveryHash: '',
      recoverySalt: '',
      hasRecovery: false,
      level: 1,
      xp: 0,
      totalMatches: 0,
      wins: 0,
      losses: 0,
      coins: 0,
      rankedRating: 1000,
      createdAtIso: new Date().toISOString(),
    };

    const token = createSessionToken(sampleAccount, true);
    const verified = verifySessionToken(token);
    assert.ok(verified);
    assert.equal(verified.playerId, 'pirate_test001');
    assert.equal(verified.username, 'Captain_Jack');
    assert.equal(verified.rememberMe, true);

    // Tamper with signature
    const tampered = `${token.slice(0, -4)}aaaa`;
    assert.equal(verifySessionToken(tampered), null);

    // Revoke token on logout
    revokeSessionToken(token);
    assert.equal(verifySessionToken(token), null);
  });

  it('calculates deterministic XP levels, pirate rank titles, and bounded match rewards', () => {
    const lvl1 = calculateLevelFromXp(0);
    assert.equal(lvl1.level, 1);
    assert.equal(lvl1.xpIntoLevel, 0);

    const lvl3 = calculateLevelFromXp(245);
    assert.equal(lvl3.level, 3);
    assert.equal(lvl3.xpIntoLevel, 45);

    assert.equal(getPirateRankTitle(1000).rankTitleEn, 'Deckhand');
    assert.equal(getPirateRankTitle(1650).rankTitleEn, 'Sovereign of the Seas');

    const winReward = computeMatchProgressionReward({
      won: true,
      roundCoinsEarned: 4,
      isRanked: true,
      roundsPlayed: 3,
    });
    assert.ok(winReward.xpDelta > 0);
    assert.ok(winReward.coinsDelta > 0);
    assert.equal(winReward.ratingDelta, 25);
  });

  it('enforces Ranked multiplayer access for authenticated accounts only and prevents guest impersonation', () => {
    const guest = createInitialGuestProfile('guest_1234');
    assert.equal(canAccessMultiplayerQueue(guest, false).valid, true);
    assert.equal(canAccessMultiplayerQueue(guest, true).valid, false);
    assert.equal(canAccessMultiplayerQueue({ isGuest: false }, true).valid, true);

    const registeredSet = new Set(['captain_nemo', 'জলদস্যু']);
    const sanitizedCollision = sanitizeGuestLobbyName('Captain_Nemo', registeredSet, '1');
    assert.notEqual(sanitizedCollision.toLowerCase(), 'captain_nemo');
    assert.ok(sanitizedCollision.includes('গেস্ট'));
  });
});
