import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const VALID_VAULT = 'vlt_9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e';

const VALID_HASH_64 =
  'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';
const VALID_SALT_32 = '0123456789abcdef0123456789abcdef';

async function assertPermissionDenied(fn: () => Promise<unknown>, label: string) {
  let failedWithDenied = false;
  try {
    await fn();
  } catch (err: any) {
    if (
      err?.code === 'permission-denied' ||
      String(err?.message).includes('Missing or insufficient permissions')
    ) {
      failedWithDenied = true;
    } else {
      throw err;
    }
  }
  assert.equal(failedWithDenied, true, `Expected PERMISSION_DENIED for: ${label}`);
}

test('Dirty Dozen #1-2: Unauthenticated / Spoofed writes to /users/{uid}/public are rejected', async () => {
  await assertPermissionDenied(
    () =>
      setDoc(doc(db, 'users', 'uid_victim', 'public', 'main'), {
        playerId: 'uid_victim',
        username: 'SpoofedPirate',
        avatar: '🏴‍☠️',
        level: 1,
        xp: 0,
        totalMatches: 0,
        wins: 0,
        losses: 0,
        coins: 50,
        rankedRating: 1000,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    'Spoofed write to /users/uid_victim/public/main'
  );
});

test('Dirty Dozen #3: Shadow Field Injection on VaultAccountRecord create is rejected', async () => {
  await assertPermissionDenied(
    () =>
      setDoc(doc(db, 'vaults', VALID_VAULT, 'accounts', 'capt_shadow1'), {
        playerId: 'capt_shadow1',
        username: 'ShadowPirate',
        usernameLower: 'shadowpirate',
        avatar: '🏴‍☠️',
        passwordHash: VALID_HASH_64,
        passwordSalt: VALID_SALT_32,
        recoveryHash: '',
        recoverySalt: '',
        hasRecovery: false,
        level: 1,
        xp: 0,
        totalMatches: 0,
        wins: 0,
        losses: 0,
        coins: 50,
        rankedRating: 1000,
        createdAtIso: new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isAdmin: true, // Shadow field!
      }),
    'Shadow field injection isAdmin: true'
  );
});

test('Dirty Dozen #6: PII Blanket Read on /users/{uid}/private is rejected', async () => {
  await assertPermissionDenied(
    () => getDoc(doc(db, 'users', 'uid_victim', 'private', 'settings')),
    'Blanket read on private user subcollection'
  );
});

test('Dirty Dozen #7: Vault Enumeration / List Scraping on /vaults/{vaultId}/accounts is rejected', async () => {
  await assertPermissionDenied(
    () => getDocs(collection(db, 'vaults', VALID_VAULT, 'accounts')),
    'List query on vault accounts collection'
  );
  await assertPermissionDenied(
    () => getDocs(collection(db, 'vaults', VALID_VAULT, 'usernames')),
    'List query on vault usernames collection'
  );
});

test('Dirty Dozen #8: Invalid Vault Key access is rejected', async () => {
  await assertPermissionDenied(
    () => getDoc(doc(db, 'vaults', 'vlt_wrong_key', 'accounts', 'capt_test1')),
    'Get with invalid vault key'
  );
});

test('Dirty Dozen #9 & #10: Oversized username and short plaintext passwordHash are rejected', async () => {
  await assertPermissionDenied(
    () =>
      setDoc(doc(db, 'vaults', VALID_VAULT, 'accounts', 'capt_oversize'), {
        playerId: 'capt_oversize',
        username: 'PirateWithWayTooLongUsernameOverTwentyChars',
        usernameLower: 'piratewithwaytoolongusernameovertwentyChars',
        avatar: '🏴‍☠️',
        passwordHash: VALID_HASH_64,
        passwordSalt: VALID_SALT_32,
        recoveryHash: '',
        recoverySalt: '',
        hasRecovery: false,
        level: 1,
        xp: 0,
        totalMatches: 0,
        wins: 0,
        losses: 0,
        coins: 50,
        rankedRating: 1000,
        createdAtIso: new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    'Oversized username > 20 chars'
  );

  await assertPermissionDenied(
    () =>
      setDoc(doc(db, 'vaults', VALID_VAULT, 'accounts', 'capt_plaintext'), {
        playerId: 'capt_plaintext',
        username: 'PlaintextBob',
        usernameLower: 'plaintextbob',
        avatar: '🏴‍☠️',
        passwordHash: 'plaintext_short',
        passwordSalt: VALID_SALT_32,
        recoveryHash: '',
        recoverySalt: '',
        hasRecovery: false,
        level: 1,
        xp: 0,
        totalMatches: 0,
        wins: 0,
        losses: 0,
        coins: 50,
        rankedRating: 1000,
        createdAtIso: new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    'Short plaintext password hash'
  );
});

test('Dirty Dozen #12: Forged client timestamp on create is rejected', async () => {
  await assertPermissionDenied(
    () =>
      setDoc(doc(db, 'vaults', VALID_VAULT, 'accounts', 'capt_forgedtime'), {
        playerId: 'capt_forgedtime',
        username: 'ForgedClock',
        usernameLower: 'forgedclock',
        avatar: '🏴‍☠️',
        passwordHash: VALID_HASH_64,
        passwordSalt: VALID_SALT_32,
        recoveryHash: '',
        recoverySalt: '',
        hasRecovery: false,
        level: 1,
        xp: 0,
        totalMatches: 0,
        wins: 0,
        losses: 0,
        coins: 50,
        rankedRating: 1000,
        createdAtIso: new Date().toISOString(),
        createdAt: Timestamp.fromMillis(1000000000),
        updatedAt: serverTimestamp(),
      }),
    'Forged client timestamp'
  );
});

test('Dirty Dozen #4, #5, #11 & Positive Flow: Atomic account creation succeeds, while Value Poisoning and Immortal Field mutation on update fail', async () => {
  const uniqueSuffix = Date.now().toString(36);
  const playerId = `capt_rt_${uniqueSuffix}`;
  const username = `RT_${uniqueSuffix}`.slice(0, 18);
  const usernameLower = username.toLowerCase();
  const usernameKey = `u_${Buffer.from(usernameLower, 'utf8').toString('hex')}`;

  const accountRef = doc(db, 'vaults', VALID_VAULT, 'accounts', playerId);
  const unameRef = doc(db, 'vaults', VALID_VAULT, 'usernames', usernameKey);

  const batch = writeBatch(db);
  batch.set(accountRef, {
    playerId,
    username,
    usernameLower,
    avatar: '🏴‍☠️',
    passwordHash: VALID_HASH_64,
    passwordSalt: VALID_SALT_32,
    recoveryHash: '',
    recoverySalt: '',
    hasRecovery: false,
    level: 1,
    xp: 0,
    totalMatches: 0,
    wins: 0,
    losses: 0,
    coins: 50,
    rankedRating: 1000,
    createdAtIso: new Date().toISOString(),
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

  // Verify created document
  const snap = await getDoc(accountRef);
  assert.equal(snap.exists(), true);
  assert.equal(snap.data()?.username, username);

  // Dirty Dozen #4 & #11: Attempt to mutate immutable field username or createdAtIso
  await assertPermissionDenied(
    () =>
      updateDoc(accountRef, {
        username: 'HackedName',
        updatedAt: serverTimestamp(),
      }),
    'Mutating immutable username field'
  );

  // Dirty Dozen #5: Attempt Value Poisoning (negative coins)
  await assertPermissionDenied(
    () =>
      updateDoc(accountRef, {
        level: 1,
        xp: 0,
        totalMatches: 0,
        wins: 0,
        losses: 0,
        coins: -999,
        rankedRating: 1000,
        updatedAt: serverTimestamp(),
      }),
    'Value poisoning negative coins'
  );

  // Valid Progression Update succeeds
  await updateDoc(accountRef, {
    level: 2,
    xp: 120,
    totalMatches: 1,
    wins: 1,
    losses: 0,
    coins: 90,
    rankedRating: 1025,
    updatedAt: serverTimestamp(),
  });

  const updatedSnap = await getDoc(accountRef);
  assert.equal(updatedSnap.data()?.level, 2);
  assert.equal(updatedSnap.data()?.wins, 1);
  assert.equal(updatedSnap.data()?.coins, 90);
});
