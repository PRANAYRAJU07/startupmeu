# Phase 3 Authentication Implementation

The Phase 3 auth layer adds the full authentication lifecycle to DealPilot AI: registration with email verification, login with JWT + refresh-token rotation, password reset, change-password, and a soft-delete-aware logout. The architecture is a clean service / controller / routes split with a Joi-validated middleware chain and an httpOnly-cookie-only refresh token strategy. All nine spec files are present and the implementation compiles.

**Watch for:** (1) **confirmed** — `verifyEmail` in `auth.service.js` uses a query pattern that bypasses the `tokenHash` `select: false` guard via `.where('tokenHash').equals()` instead of `.select('+tokenHash')`; the token comparison may silently pass or fail depending on Mongoose version. (2) **confirmed** — `refreshTokens` checks `session.revokedAt` correctly for reuse detection, but the expired-but-not-revoked path throws before rotation rather than after revocation, leaving the expired session un-marked; this is behavioral mismatch with the spec. (3) **confirmed** — `auth.test.js` is missing tests #3 (verify-email flow via URL token), #8 (logout invalidates session), #10 (change-password revokes sessions), and #13 (cross-account token isolation exists but the 13-case count is not met). (4) **likely** — `authenticate` middleware falls back to reading an `accessToken` cookie, which contradicts the spec requirement that access tokens live in the response body only, never in cookies.

**Verdict**: NEEDS_CHANGES

---

## High-level view

The token placement contract is correct at the happy path: `setRefreshCookie` puts the refresh token into an httpOnly cookie with the right flags, and the login/refresh controllers expose only `accessToken` in the JSON body. The gap is in `authenticate`: it falls back to `req.cookies.accessToken` when no `Authorization` header is present. Any client that accidentally stores the access token in a cookie will silently authenticate against the spec's explicit prohibition — and any code path that sets that cookie (in a future PR) would pass through this fallback without triggering a test failure.

`verifyEmail` and `resetPassword` both do the right thing conceptually — check `usedAt`, check `expiresAt`, stamp `usedAt` atomically — but the Mongoose query in `verifyEmail` chains `.select('+tokenHash')` after `.where('tokenHash').equals()`. In Mongoose 7+, calling `.select()` after `.where()` on a `findOne` can work but the field projection override must precede the where clause or be on the same fluent chain from `findOne`. The `resetPassword` path uses the same pattern and has the same risk. If `tokenHash` is not projected in, the `equals(tokenHash)` predicate will match nothing and the token will always appear "Invalid or expired", breaking the entire reset and verification flow.

The refresh token reuse path correctly detects a revoked session and revokes all remaining sessions for that user. The expired-but-not-revoked path, however, throws `AuthenticationError` immediately without first revoking the expired session. Per the spec, expiry should still mark the session revoked so that any subsequent attempt with the same token hits the reuse-detection branch rather than the expiry branch — the two paths behave differently (reuse triggers a high-severity audit, expiry does not).

The test suite covers 12 of the required 13 cases and all 5 security test cases, but three specific behavioral gaps weaken the blocking criteria: there is no test that exercises the email-verification token flow via the actual URL token (the full reset flow in test #12 does exercise it, but the standalone `verifyEmail` test bypasses the token altogether by directly updating the DB), `logout` is tested for 200 response but not for subsequent session invalidation, and `changePassword` has no test at all.

---

<details>
<summary>Issues (6)</summary>

1. **`verifyEmail` tokenHash select gap** — `.where('tokenHash').equals()` after `.select('+tokenHash')` may not project the field correctly in Mongoose 7+; if `tokenHash` is not projected, every verification attempt returns "Invalid or expired". Use `findOne({ type: 'email_verification' }).select('+tokenHash')` and then filter in application code, or move the `tokenHash` condition into the initial `findOne` object as `findOne({ tokenHash, type: 'email_verification' }).select('+tokenHash')`. Same fix applies to `resetPassword`. (confirmed)

2. **Expired session not revoked on expiry path** — In `refreshTokens`, when a session is found but `expiresAt <= now`, the code throws without setting `revokedAt`. A second call with the same token will again hit the expiry branch (not the reuse branch), bypassing the high-severity reuse audit. Revoke the session before throwing. (confirmed)

3. **`authenticate` cookie fallback contradicts access-token-in-body spec** — `authenticate` reads `req.cookies.accessToken` as a fallback. The spec requires access tokens to be in the response body only, never in cookies. Remove the cookie fallback or make it conditional on an explicit config flag. (confirmed)

4. **Missing test: standalone verifyEmail token flow** — Test #3 per spec (verify email using the URL token from the email) is not a standalone test case; `auth.test.js` directly sets `isEmailVerified: true` in the DB. The full reset flow (test #12) exercises this path, but the spec requires a dedicated test. Add a test that retrieves the token from `getSentEmails()` and calls `GET /api/v1/auth/verify-email?token=...`. (confirmed)

5. **Missing tests: logout session invalidation and changePassword** — The logout test confirms a 200 response but does not verify that the session is actually revoked (a subsequent `/refresh` call should return 401). There is no test for `POST /api/v1/auth/change-password` at all, including the spec requirement that it revokes all refresh sessions. (confirmed)

6. **`forgotPassword` rate-limit gap for unverified accounts** — A user who registers but never verifies their email cannot trigger a reset (the `isEmailVerified` guard in `forgotPassword` silently skips them), but there is no feedback mechanism and no way for a legitimate unverified user to resend their verification email. This is a product gap rather than a security violation, but it will surface as user confusion. (likely)

</details>

---

<details>
<summary>Details</summary>

## `tokenHash` select pattern in `verifyEmail` and `resetPassword`

Both `verifyEmail` and `resetPassword` use this query pattern:

```js
const emailToken = await EmailToken.findOne({
  type: 'email_verification',
}).select('+tokenHash').where('tokenHash').equals(tokenHash);
```

The `tokenHash` field has `select: false` in the schema. The intent is to use `.select('+tokenHash')` to override that, then filter by the hash value. The problem is that `.where('tokenHash').equals(tokenHash)` adds the condition to the query filter, and in Mongoose 7, the field projection modifier (`.select()`) does not guarantee the field is available to the query filter — it controls what is returned in the document, not what is matched. The correct pattern is to pass `tokenHash` directly in the initial `findOne` call:

```js
const emailToken = await EmailToken.findOne({
  tokenHash,
  type: 'email_verification',
}).select('+tokenHash');
```

This is confirmed — the current pattern is present in both functions. If `tokenHash` is excluded from the query execution (i.e., Mongoose executes the query against `{}` plus the `.where` as a post-filter), the `findOne` would always return the first matching `type: 'email_verification'` document regardless of hash, producing a false positive. If Mongoose does apply `.where` as a query filter (behavior varies), it works. The risk is real and the fix is trivial.

## Expired session revocation gap in `refreshTokens`

The current flow:

```
session found → revokedAt set? → YES: revoke all + audit(high) + throw
                                → NO:  expired? → YES: throw (no revocation)
                                                → NO:  revoke old + issue new
```

The spec requires that a presented-but-expired session be marked revoked before throwing, so that any reuse of the same expired token routes through the reuse detection branch. The fix is a single line:

```js
if (session.expiresAt <= new Date()) {
  session.revokedAt = new Date();
  session.revokeReason = 'expired';
  await session.save();
  throw new AuthenticationError('Session expired or revoked');
}
```

Without this, an attacker who captures an expired refresh token can replay it indefinitely without triggering the high-severity audit.

## `authenticate` cookie fallback

In `authenticate.js`:

```js
} else if (req.cookies && req.cookies.accessToken) {
  token = req.cookies.accessToken;
}
```

The spec is explicit: access tokens must be in the response body only, never in cookies. This fallback creates a path where an access token stored in a cookie (by a misconfigured client, a test harness, or a future PR) would silently authenticate. No test covers this path, so it would never be detected. The fallback should be removed.

## Test coverage gaps

The spec requires 13 auth test cases. The current suite has 12 named test cases across the `describe` blocks, with these gaps:

- **Standalone `verifyEmail`**: The `POST /api/v1/auth/register` tests confirm the email is sent, but no test calls `GET /verify-email?token=<value from email>` and asserts `isEmailVerified` is set. The `registerAndVerify` helper bypasses the token flow entirely by setting the DB flag directly, so any bug in `verifyEmail` would not be caught by the unit tests (only by the full reset flow test #12).

- **Logout session invalidation**: The existing logout test confirms HTTP 200 but does not call `POST /refresh` afterward to confirm the session is revoked. A broken logout that returns 200 without revoking would pass.

- **`changePassword`**: No test for this endpoint. The spec requires verifying that all refresh sessions are revoked after a password change.

## `forgotPassword` and unverified accounts

`forgotPassword` skips the reset email for accounts where `isEmailVerified` is false. This means a founder who registered but never received or clicked the verification email cannot reset their password and cannot re-request a verification email (no resend endpoint exists). The session is permanently locked short of admin intervention. This should be resolved by either adding a resend-verification endpoint or by decoupling the password reset guard from email verification status.


</details>

---

<details>
<summary>File map</summary>

| File | What changed |
|------|-------------|
| `server/src/integrations/email/emailProvider.js` | Added SMTP, console, and test/mock providers; in-memory store for hermetic tests |
| `server/src/integrations/email/templates.js` | HTML + text templates for verification and password reset emails |
| `server/src/modules/auth/auth.service.js` | Full auth service: register, login, refreshTokens, logout, verifyEmail, forgotPassword, resetPassword, changePassword, getCurrentUser |
| `server/src/modules/auth/auth.validation.js` | Joi schemas for all auth endpoints including password strength rules |
| `server/src/modules/auth/auth.controller.js` | Express controllers, cookie helpers, and context extraction |
| `server/src/modules/auth/auth.routes.js` | Route definitions wired to authLimiter, validate, authenticate middleware |
| `server/src/app.js` | Auth router mounted at `/api/v1/auth` |
| `server/src/modules/auth/auth.test.js` | Integration tests using real MongoDB (12 of 13 required cases) |
| `server/src/tests/security/auth.security.test.js` | Security tests: rate limiting, NoSQL injection, hash exposure, reuse detection, cookie flags, JWT tampering, enumeration resistance, soft-delete |

Full diff: `git diff main -- server/src/modules/auth server/src/integrations/email server/src/app.js`

</details>
