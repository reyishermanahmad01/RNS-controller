# Security Specification — RNS RGB Controller

## 1. Data Invariants
1. **Default-Deny Baseline**: Every path not explicitly matched under `/databases/{database}/documents` is denied for both reads and writes.
2. **Admin-Only Remote Publishing**: Only a verified Firebase Auth user whose email is `reyishermanahmad@gmail.com` (`request.auth.token.email_verified == true`) or whose UID exists in `/admins/{uid}` can create, update, or delete `/appReleases/{releaseId}` or `/admins/{adminId}`. Customers cannot write to any Firestore document.
3. **Public Single-Doc OTA Config Read (Zero PII)**: Distributed Customer apps only `get` `/appReleases/latest` (`releaseId == 'latest'`). Collection listing (`allow list`) on `/appReleases` is strictly denied to prevent enumeration. The `/appReleases/latest` document never stores user emails, phone numbers, addresses, or device secrets.
4. **Strict Payload Schema & Anti-Update-Gap**: Every `create` and `update` on `/appReleases/{releaseId}` and `/admins/{adminId}` passes through `isValidAppRelease(incoming())` or `isValidAdminMember(incoming())`, enforcing exact key allowlists (`hasAll` + `hasOnly`), field types, string `.size()` bounds, list `.size()` bounds, `updatedByUid == request.auth.uid`, and server-authoritative `request.time` timestamps.
5. **Monotonic Version Integrity**: On updates to `/appReleases/latest`, `incoming().version >= existing().version` so an accidental stale write cannot roll back published updates silently without Admin intent, while `affectedKeys().hasOnly(...)` restricts modifiable fields.

## 2. The "Dirty Dozen" Payloads (Expected: `PERMISSION_DENIED`)
1. **Unauthenticated Release Create**: Anonymous client attempts `setDoc('/appReleases/latest', validRelease)`.
2. **Unverified Admin Email Spoof**: Signed-in user with `email == 'reyishermanahmad@gmail.com'` and `email_verified == false` attempts `setDoc('/appReleases/latest', ...)`.
3. **Non-Admin Customer Write**: Signed-in user `customer@gmail.com` (`email_verified == true`) attempts to update `/appReleases/latest`.
4. **Self-Assigned Admin Escalation**: Signed-in non-admin user attempts `setDoc('/admins/' + uid, { uid, createdAt: serverTimestamp() })`.
5. **Shadow / Ghost Field Injection**: Admin attempts to write `{ ...validRelease, isSuperAdmin: true }` to `/appReleases/latest`.
6. **UID Spoofing on Release**: Admin writes `updatedByUid: 'someone-else'` instead of `request.auth.uid`.
7. **Forged Client Timestamp**: Admin writes `updatedAt: new Date('2020-01-01')` instead of `serverTimestamp()`.
8. **Oversized String DoS**: Admin submits `appName` of 500 characters (`> 48`) or `releaseNotes` of 5,000 characters (`> 300`).
9. **Unbounded List Exhaustion**: Admin submits `customModes` with 100 items (`> 50`) or `modeOverridesList` with 300 items (`> 168`).
10. **Invalid Enum / Accent Theme**: Admin submits `accentTheme: 'neon-pink-hack'` not in `['cyan', 'magenta', 'crimson', 'amber', 'emerald']`.
11. **Collection Enumeration (`list`)**: Unauthenticated or Customer user calls `getDocs(collection(db, 'appReleases'))` or `getDocs(collection(db, 'admins'))`.
12. **Document ID Poisoning**: User attempts `getDoc(doc(db, 'appReleases', 'a'.repeat(300)))` or invalid characters `latest$bad`.

## 3. Conflict & Red Team Summary
- **Identity Spoofing**: Blocked by `updatedByUid == request.auth.uid`, `uid == request.auth.uid`, and `email_verified == true`.
- **State Shortcutting**: Blocked by `incoming().version >= existing().version` and `version >= 1`.
- **Resource Poisoning**: Blocked by `isValidId()` regex + length <= 128 and strict `.size()` bounds on every string and array.
- **PII Protection**: `/admins/{adminId}` restricts both `get` and `list` strictly to verified admins; `/appReleases/latest` contains zero PII.
