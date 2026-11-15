# Jolodoshshu: Pirate Strategy — Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Default-Deny Catch-All**: Every path not explicitly matched is unconditionally denied (`allow read, write: if false;`).
2. **PII & Credential Isolation (Split Collection + Server Vault)**:
   - Public profile documents live at `/users/{userId}/public/{profileId}` and never contain password hashes, salts, or private recovery data.
   - Owner-isolated settings live at `/users/{userId}/private/{secretId}` and are strictly readable/writable only when `request.auth.uid == userId` and `request.auth.token.email_verified == true`.
   - Authoritative custom in-game account records (`/vaults/{vaultId}/accounts/{accountId}`) and username reservations (`/vaults/{vaultId}/usernames/{usernameKey}`) require the cryptographic `vaultId` gate (`isValidVaultKey(vaultId)`), enforce `allow list: if false;` to prevent collection enumeration/scraping, and enforce strict schema validation on every write.
3. **Strict Key Allowlisting & Anti-Shadow-Update**:
   - Every `create` operation enforces `data.keys().hasAll(...) && data.keys().hasOnly(...)`.
   - Every `update` operation begins with `isValid[Entity](incoming())` and restricts mutated fields via `incoming().diff(existing()).affectedKeys().hasOnly(...)`.
4. **Path Variable Hardening & Volumetric Bounds**:
   - All path IDs (`userId`, `profileId`, `secretId`, `accountId`, `usernameKey`) are validated with `isValidId()` (`<= 128` chars, `^[a-zA-Z0-9_\-]+$`).
   - Every string field enforces both `is string` and explicit `.size()` bounds matching `firebase-blueprint.json`.
   - Every numeric progression field (`level`, `xp`, `totalMatches`, `wins`, `losses`, `coins`, `rankedRating`) enforces `is int` and non-negative bounds.
5. **Temporal & Identity Immutability**:
   - `playerId` and `createdAt` are immutable across all updates (`incoming().playerId == existing().playerId && incoming().createdAt == existing().createdAt`).
   - `createdAt` on `create` and `updatedAt` on `create`/`update` must equal `request.time`.

---

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 (Identity Spoofing on Public Profile)**: Authenticated user `uid_attacker` attempts to create `/users/uid_victim/public/main` with `playerId: "uid_victim"`. -> `PERMISSION_DENIED`
2. **Payload 2 (Unverified Email Spoof)**: User with `email_verified: false` attempts to write `/users/uid_1/public/main`. -> `PERMISSION_DENIED`
3. **Payload 3 (Shadow Field Injection on Create)**: Creating `/vaults/{vaultId}/accounts/capt_1` with an extra unauthorized field `"isAdmin": true`. -> `PERMISSION_DENIED`
4. **Payload 4 (Shadow Field Injection on Update)**: Updating `/vaults/{vaultId}/accounts/capt_1` by modifying an immutable field `createdAtIso` not in `affectedKeys().hasOnly(...)`. -> `PERMISSION_DENIED`
5. **Payload 5 (Value Poisoning on Update)**: Updating `coins` on `/vaults/{vaultId}/accounts/capt_1` with a string `"999999"` or negative integer `-50`. -> `PERMISSION_DENIED`
6. **Payload 6 (PII Blanket Read Attack)**: Authenticated user `uid_attacker` attempts `get` on `/users/uid_victim/private/settings`. -> `PERMISSION_DENIED`
7. **Payload 7 (Vault Enumeration / List Scraping)**: Any caller attempts `list` on `/vaults/{vaultId}/accounts` or `/vaults/{vaultId}/usernames`. -> `PERMISSION_DENIED`
8. **Payload 8 (Invalid Vault Key Access)**: Caller attempts `get` or `create` on `/vaults/wrong_vault_key/accounts/capt_1`. -> `PERMISSION_DENIED`
9. **Payload 9 (Resource Poisoning / Oversized Username)**: Creating an account with a 500-character `username` exceeding `maxLength: 20`. -> `PERMISSION_DENIED`
10. **Payload 10 (Plaintext / Short Password Hash Injection)**: Creating a vault account where `passwordHash` is shorter than 64 hex characters (`"plaintext123"`). -> `PERMISSION_DENIED`
11. **Payload 11 (Immortal Field Mutation)**: Updating `playerId` on `/vaults/{vaultId}/accounts/capt_1` to a different ID. -> `PERMISSION_DENIED`
12. **Payload 12 (Forged Client Timestamp)**: Creating or updating a record where `createdAt` or `updatedAt` does not match `request.time`. -> `PERMISSION_DENIED`

---

## 3. Test Runner Verification

All 12 adversarial payloads and positive control cases are verified in `firestore.rules.test.ts` via `npx --yes tsx --test firestore.rules.test.ts`.
