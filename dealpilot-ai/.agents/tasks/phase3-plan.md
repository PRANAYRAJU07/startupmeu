# Phase 3 Implementation Plan — Authentication

## Architecture decisions

### Validation approach: Joi (not express-validator)

`express-validator` is listed in `package.json` dependencies but the project's only
existing middleware — `validate.js` — already uses Joi. Config validation uses Joi.
The Phase 2 plan explicitly chose Joi for `validate.js`. `auth.validation.js` will
follow the exact same Joi + `validate(schema)` pattern already wired into the app.
This keeps the codebase consistent; `express-validator` will remain an unused
dependency and can be removed in a later cleanup phase.

Validation schemas will export plain Joi schema objects shaped as
`{ body: Joi.object({...}), query: ..., params: ... }` so they slot directly into
`validate(schema)` from `src/common/middleware/validate.js`.

### Refresh-token storage: hashed token in DB

`generateRefreshToken()` from `token.js` produces a 64-char hex string via
`crypto.randomBytes`. The raw token is sent to the client as an httpOnly cookie.
The DB stores only `hashToken(rawToken)` (SHA-256 hex). On refresh, the incoming
token is hashed and compared against the DB — raw token is never persisted.

### Refresh-token rotation: strict rotation with reuse detection

On every `POST /api/v1/auth/refresh`:
1. Find the active session by tokenHash.
2. Revoke the old session with `revokeReason: 'rotation'`.
3. Issue a new access token and a new refresh token; create a new `RefreshSession`.
4. If the token is already revoked (reuse attack), revoke ALL sessions for that user.

### Cookie strategy

- Access token: not set as a cookie (sent in JSON body only so SPAs can read it).
- Refresh token: httpOnly, Secure (in production), SameSite=Strict, Path=/api/v1/auth/refresh.
- This is the pattern already implied by `authenticate.js` which reads from both
  `Authorization: Bearer` header and the `accessToken` cookie fallback.

### Email verification and password-reset token lifetime

- Email verification tokens expire in 24 hours.
- Password-reset tokens expire in 1 hour.
- Both stored hashed in `EmailToken` with a TTL index (already on the model).

### Test database setup

`vitest.config.js` already configures `MONGODB_URI: 'mongodb://localhost:27017/dealpilot-test'`
and all required env vars via `env:` block. Integration tests will use
`mongodb-memory-server` so tests are hermetic (no external MongoDB required).
Pattern: a shared `tests/helpers/db.js` that exports `connectTestDb()` and
`disconnectTestDb()`, called in `beforeAll`/`afterAll` hooks.

The `EMAIL_PROVIDER` test env is `'mock'`, so the `test` provider branch in
`emailProvider.js` will be active during all tests (no real SMTP calls).
Note: vitest.config.js has `EMAIL_PROVIDER: 'mock'` but the emailProvider
implementation spec uses the value `'test'` for the in-memory store.
**Resolution**: implement the provider so that both `'mock'` and `'test'`
activate the in-memory store path (treat them as synonymous), since the vitest
config cannot be changed without breaking existing tests.

### npm packages to install

```
mongodb-memory-server   (devDependency) — hermetic in-process MongoDB for tests
```

No other new runtime packages are needed. `nodemailer` is already in dependencies.

---

## File creation order (dependency graph)

```
emailProvider.js          ← config only
  └── templates.js        ← no imports from this project
auth.service.js           ← User, RefreshSession, EmailToken, AuditLog models
                             hash.js, token.js, config, emailProvider.js, templates.js
auth.validation.js        ← Joi only (no project imports)
auth.controller.js        ← auth.service.js, response.js
auth.routes.js            ← auth.controller.js, auth.validation.js, validate.js,
                             rateLimiter.js, authenticate.js
app.js (update)           ← auth.routes.js
auth.test.js              ← supertest + app.js + db helper
auth.security.test.js     ← supertest + app.js + db helper
```

No circular imports: service never imports controller, routes never import service
directly (only controller does).

---

## Implementation Plan

- [ ] 1. Install `mongodb-memory-server` as a dev dependency.

  Run `npm install --save-dev mongodb-memory-server` from `server/`. This is needed
  before any test file is written so the import resolves.

  Files: `server/package.json` (updated by npm)

  Verify: `node -e "import('mongodb-memory-server').then(()=>console.log('ok'))" --input-type=module`
  exits 0 from `server/`.

---

- [ ] 2. Create `server/tests/helpers/db.js` — shared test database helper.

  Export two functions:
  - `connectTestDb()` — creates a new `MongoMemoryServer`, connects mongoose to its
    URI, runs `mongoose.connection.readyState` check. Store the server instance in
    module scope so `disconnectTestDb` can stop it.
  - `disconnectTestDb()` — calls `mongoose.disconnect()` then stops the
    `MongoMemoryServer` instance.

  Also export `clearCollections()` — iterates over all collections in the current
  connection and calls `deleteMany({})` on each. Used in `beforeEach` blocks to
  isolate tests.

  Use the pattern: `const { MongoMemoryServer } = await import('mongodb-memory-server')`.
  The file must use ESM (`import`/`export`).

  Files: `server/tests/helpers/db.js`

  Verify: No direct verification at this step; it is exercised by the tests in items
  8 and 9. Ensure the file parses with `node --input-type=module
  --eval "import('./tests/helpers/db.js').then(()=>console.log('ok'))"` from `server/`.

---

- [ ] 3. Create `server/src/integrations/email/emailProvider.js`.

  This file reads `config.emailProvider` once at module load and exports a single
  `sendEmail({ to, subject, html, text })` function plus `getSentEmails()` and
  `clearSentEmails()`.

  Three provider branches, selected by `config.emailProvider`:

  **`'smtp'` branch:**
  - Create a `nodemailer` transporter using `config.smtpHost`, `config.smtpPort`,
    `config.smtpUser`, `config.smtpPass`.
  - `sendEmail` calls `transporter.sendMail({ from: config.emailFrom, to, subject,
    html, text })`.
  - On failure, catch and rethrow as
    `new ExternalServiceError('Failed to send email', 'smtp')`.

  **`'console'` branch:**
  - `sendEmail` logs the email fields to `console.log` with a `[EMAIL]` prefix.
  - Never throws.
  - `getSentEmails()` returns `[]`, `clearSentEmails()` is a no-op.

  **`'test'` / `'mock'` branch (both values map here):**
  - `sentEmails` is a module-level `[]` array.
  - `sendEmail` pushes `{ to, subject, html, text, sentAt: new Date() }` onto the array.
  - `getSentEmails()` returns a shallow copy of the array.
  - `clearSentEmails()` empties the array.
  - Never calls external services; never throws.

  Import: `config` from `../../config/index.js`, `ExternalServiceError` from
  `../../common/errors/index.js`, `nodemailer` from `'nodemailer'`, `logger` from
  `../../common/utils/logger.js`.

  Files: `server/src/integrations/email/emailProvider.js`

  Verify: `npm test` — the integration tests in item 8 call `clearSentEmails()` and
  `getSentEmails()` and assert they work. No standalone test needed for this item.

---

- [ ] 4. Create `server/src/integrations/email/templates.js`.

  Export two functions. Both accept `(name, url)` and return `{ subject, html, text }`.
  URLs are passed in — never constructed inside templates.

  **`verificationEmail(name, verificationUrl)`**
  - `subject`: `'Verify your DealPilot AI account'`
  - `html`: Professional HTML template. Structure: centered container, DealPilot AI
    header, greeting using `name`, one-sentence explanation, a styled CTA button
    linking to `verificationUrl`, expiry note (24 hours), footer disclaimer.
  - `text`: Plain-text fallback with the same information and the URL printed inline.

  **`passwordResetEmail(name, resetUrl)`**
  - `subject`: `'Reset your DealPilot AI password'`
  - `html`: Same structure; button links to `resetUrl`; expiry note (1 hour);
    "If you didn't request this, ignore this email" disclaimer.
  - `text`: Plain-text fallback.

  Both functions must HTML-escape `name` before embedding it in HTML to prevent
  XSS from user-supplied display names. Use a small inline escape helper
  (`str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')`).

  Files: `server/src/integrations/email/templates.js`

  Verify: `npm test` — the template output is exercised indirectly by auth integration
  tests. Add a micro unit test at `server/tests/unit/emailTemplates.test.js`:
  assert that `verificationEmail('Alice', 'https://example.com')` returns an object
  with non-empty `subject`, `html`, and `text`; that `html` contains the URL; and
  that `verificationEmail('<script>', 'url')` does NOT include `<script>` literally
  in the HTML output (XSS guard). Run `npm test` and confirm it passes.

---

- [ ] 5. Create `server/src/modules/auth/auth.validation.js` — Joi schemas for all auth endpoints.

  Export one named schema object per route, each shaped as `{ body: Joi.object({}) }`:

  **`registerSchema`** — body:
  - `firstName`: `Joi.string().trim().min(1).max(50).required()`
  - `lastName`: `Joi.string().trim().min(1).max(50).required()`
  - `email`: `Joi.string().email().lowercase().required()`
  - `password`: `Joi.string().min(8).max(128).required()` (no regex complexity
    requirement — length is the practical control here)

  **`loginSchema`** — body:
  - `email`: `Joi.string().email().lowercase().required()`
  - `password`: `Joi.string().required()`

  **`verifyEmailSchema`** — body:
  - `token`: `Joi.string().hex().length(64).required()`

  **`resendVerificationSchema`** — body:
  - `email`: `Joi.string().email().lowercase().required()`

  **`forgotPasswordSchema`** — body:
  - `email`: `Joi.string().email().lowercase().required()`

  **`resetPasswordSchema`** — body:
  - `token`: `Joi.string().hex().length(64).required()`
  - `password`: `Joi.string().min(8).max(128).required()`

  **`changePasswordSchema`** — body:
  - `currentPassword`: `Joi.string().required()`
  - `newPassword`: `Joi.string().min(8).max(128).required()`

  **`refreshSchema`** — body is empty (token comes from httpOnly cookie); export as
  `{ body: Joi.object({}) }` so the `validate` middleware still passes.

  All schemas use `{ abortEarly: false, stripUnknown: true }` options (those are
  applied inside `validate.js`, not here — the schemas are plain Joi objects).

  Files: `server/src/modules/auth/auth.validation.js`

  Verify: `npm test` — a unit test at `server/tests/unit/authValidation.test.js`
  imports each schema and asserts that `schema.body.validate({ email: 'not-an-email' })`
  returns an error, and that valid payloads return `{ error: undefined }`.
  Run `npm test` and confirm all pass.

---

- [ ] 6. Create `server/src/modules/auth/auth.service.js` — full auth business logic.

  Import: `User` from `../users/user.model.js`, `RefreshSession` from
  `./refreshSession.model.js`, `EmailToken` from `./emailToken.model.js`,
  `AuditLog` from `./auditLog.model.js`, `hashPassword`, `comparePassword`,
  `hashToken`, `generateSecureToken` from `../../common/utils/hash.js`,
  `generateAccessToken`, `generateRefreshToken` from `../../common/utils/token.js`,
  `config` from `../../config/index.js`, `sendEmail` from
  `../../integrations/email/emailProvider.js`, `verificationEmail`,
  `passwordResetEmail` from `../../integrations/email/templates.js`,
  all needed error classes from `../../common/errors/index.js`.

  Export these named async functions:

  **`register({ firstName, lastName, email, password }, { ipAddress, userAgent, requestId })`**
  1. Check `User.findOne({ email })`. If found and `deletedAt === null`, throw
     `ConflictError('Email already registered')`.
  2. `const passwordHash = await hashPassword(password)`.
  3. Create and save the user. Role defaults to `'founder'`.
  4. Generate a verification token: `const rawToken = generateSecureToken()`;
     compute `tokenHash = hashToken(rawToken)`.
  5. Save `EmailToken({ userId, tokenHash, type: 'email_verification',
     expiresAt: Date.now() + 24 * 60 * 60 * 1000 })`.
  6. Build `verificationUrl = \`${config.appBaseUrl}/api/v1/auth/verify-email?token=${rawToken}\``.
  7. Call `sendEmail({ to: email, ...verificationEmail(firstName, verificationUrl) })`.
     Do NOT await — fire and forget (avoid blocking registration on email delivery).
     Log errors from the promise with `logger.warn`.
  8. Write `AuditLog({ userId, action: 'user_registered', ipAddress, userAgent,
     metadata: { email }, requestId, severity: 'low' })`.
  9. Return `user.toSafeObject()`.

  **`login({ email, password }, { ipAddress, userAgent, requestId })`**
  1. Find user by email with `+passwordHash` (select override). If not found or
     `deletedAt !== null` or `!isActive`, throw `AuthenticationError('Invalid credentials')`.
     Never reveal which field is wrong.
  2. `const valid = await comparePassword(password, user.passwordHash)`. If false,
     throw `AuthenticationError('Invalid credentials')`.
  3. Generate access and refresh tokens:
     - `const accessToken = generateAccessToken({ sub: user._id.toString(), email: user.email, role: user.role }, config.accessTokenSecret, config.accessTokenTtl)`.
     - `const rawRefresh = generateRefreshToken()`.
     - `const refreshTokenHash = hashToken(rawRefresh)`.
  4. Compute `expiresAt`: parse `config.refreshTokenTtl` (e.g. `'7d'`) to milliseconds
     by mapping: strip suffix, multiply by `86400000` for `d`, `3600000` for `h`.
     Add to `Date.now()`. Use a helper `parseTtl(ttl)` defined locally in the service.
  5. Save `RefreshSession({ userId: user._id, tokenHash: refreshTokenHash, expiresAt,
     userAgent, ipAddress })`.
  6. Update `user.lastLoginAt = new Date()` and save (do not await — fire-and-forget).
  7. Write `AuditLog` with action `'user_login'`, severity `'low'`.
  8. Return `{ user: user.toSafeObject(), accessToken, refreshToken: rawRefresh }`.

  **`refreshTokens(rawRefreshToken, { ipAddress, userAgent, requestId })`**
  1. `const tokenHash = hashToken(rawRefreshToken)`.
  2. Find session: `RefreshSession.findOne({ tokenHash }).select('+tokenHash')`.
  3. If not found: throw `AuthenticationError('Invalid refresh token')`.
  4. If `session.revokedAt !== null` (token reuse): revoke ALL active sessions for
     `session.userId` (`RefreshSession.updateMany({ userId, revokedAt: null },
     { revokedAt: new Date(), revokeReason: 'admin' })`). Write audit log with
     `severity: 'high'` and action `'refresh_token_reuse_detected'`. Throw
     `AuthenticationError('Refresh token reused — all sessions revoked')`.
  5. If `session.expiresAt < new Date()`: throw `AuthenticationError('Refresh token expired')`.
  6. Revoke the old session: `session.revokedAt = new Date(); session.revokeReason = 'rotation'`.
  7. Find the user. If not found or inactive, throw `AuthenticationError`.
  8. Issue new tokens (same as login steps 3–5). Write audit log `'token_refreshed'`, severity `'low'`.
  9. Return `{ accessToken, refreshToken: newRawRefresh }`.

  **`logout(userId, rawRefreshToken, { ipAddress, userAgent, requestId })`**
  1. If `rawRefreshToken` provided: hash it, find and revoke that session
     (`revokeReason: 'logout'`).
  2. If not provided: revoke all active sessions for `userId` (full logout from all
     devices), write audit log `'user_logout_all'`.
  3. Write audit log `'user_logout'` (or `'user_logout_all'`), severity `'low'`.

  **`verifyEmail(rawToken, { requestId })`**
  1. `const tokenHash = hashToken(rawToken)`.
  2. Find `EmailToken.findOne({ tokenHash, type: 'email_verification' })`.
     If not found or `usedAt !== null` or `expiresAt < new Date()`, throw
     `AuthenticationError('Invalid or expired verification token')`.
  3. Mark `emailToken.usedAt = new Date()` and save.
  4. Find user; set `user.isEmailVerified = true`; save.
  5. Write audit log `'email_verified'`, severity `'low'`.
  6. Return `{ message: 'Email verified successfully' }`.

  **`resendVerification(email, { requestId })`**
  1. Find user by email. If not found, return silently (no information leak).
  2. If already verified, return silently.
  3. Invalidate existing verification tokens: `EmailToken.updateMany({ userId,
     type: 'email_verification', usedAt: null }, { usedAt: new Date() })`.
  4. Generate and send a new verification email (same flow as register steps 4–7).
  5. Return `{ message: 'Verification email sent' }` regardless of whether user exists.

  **`forgotPassword(email, { ipAddress, requestId })`**
  1. Find user by email. If not found, return silently.
  2. Invalidate existing reset tokens.
  3. Generate reset token, save `EmailToken({ type: 'password_reset', expiresAt:
     Date.now() + 3600000 })`.
  4. Build `resetUrl = \`${config.appBaseUrl}/api/v1/auth/reset-password?token=${rawToken}\``.
  5. Fire-and-forget `sendEmail({ to: email, ...passwordResetEmail(user.firstName, resetUrl) })`.
  6. Write audit log `'password_reset_requested'`, severity `'medium'`.
  7. Always return `{ message: 'If that email is registered, a reset link has been sent.' }`.

  **`resetPassword(rawToken, newPassword, { ipAddress, requestId })`**
  1. Hash token, find `EmailToken` of type `'password_reset'`.
  2. If not found, used, or expired, throw `AuthenticationError('Invalid or expired reset token')`.
  3. Mark token used.
  4. Hash new password; update user's `passwordHash`.
  5. Revoke ALL active refresh sessions for user (`revokeReason: 'password_change'`).
  6. Write audit log `'password_reset'`, severity `'high'`.
  7. Return `{ message: 'Password reset successfully' }`.

  **`changePassword(userId, { currentPassword, newPassword }, { ipAddress, requestId })`**
  1. Find user with `+passwordHash`. Verify `currentPassword`. If wrong, throw
     `AuthenticationError('Current password is incorrect')`.
  2. Hash new password; save.
  3. Revoke all refresh sessions except the current one (by userId, `revokedAt: null`,
     `revokeReason: 'password_change'`).
  4. Write audit log `'password_changed'`, severity `'high'`.
  5. Return `{ message: 'Password changed successfully' }`.

  **`getProfile(userId)`**
  Find user by `_id`. If not found or `deletedAt !== null`, throw `NotFoundError`.
  Return `user.toSafeObject()`.

  **`deleteAccount(userId, password, { ipAddress, requestId })`**
  1. Find user with `+passwordHash`. Verify `password`. If wrong, throw
     `AuthenticationError`.
  2. Soft-delete: `user.deletedAt = new Date(); user.isActive = false`. Save.
  3. Revoke all sessions.
  4. Write audit log `'account_deleted'`, severity `'high'`.
  5. Return `{ message: 'Account deleted' }`.

  Files: `server/src/modules/auth/auth.service.js`

  Verify: `npm test` — the integration test suite in item 8 exercises every exported
  function end-to-end. No separate unit test for the service; the integration tests
  are the verification.

---

- [ ] 7. Create `server/src/modules/auth/auth.controller.js` — thin HTTP adapter.

  Import: `* as authService` from `./auth.service.js`, `{ success, created }` from
  `../../common/utils/response.js`, `config` from `../../config/index.js`.

  Each controller function extracts `{ ipAddress: req.ip, userAgent: req.headers['user-agent'], requestId: req.id }` from the request and passes it to the service.

  **`register(req, res)`**
  Calls `authService.register(req.body, ctx)`. Responds `201` with
  `{ user, message: 'Registration successful. Please verify your email.' }`.
  Does NOT set any cookie (refresh token not issued yet — user must verify email
  first... actually, issue tokens immediately for UX; email verification is a soft
  gate). **Decision: issue tokens on register** so the user can access the app right
  away while verification remains pending. Set the refresh cookie and return the
  access token.
  
  Revised: `authService.register` only creates the user and sends the email. The
  controller then calls `authService.login` internally to issue tokens. Simpler: just
  return `{ user }` with status 201 and require the client to call `/login` next.
  **Final decision**: return `{ user }` only — no token on register. The client
  redirects to login. This keeps the service function boundaries clean.

  Responses and cookie behaviour for each endpoint:

  - `register` → `created(res, { user })`, no cookie.
  - `login` → `success(res, { user, accessToken })`, set refresh cookie.
  - `refresh` → `success(res, { accessToken })`, set new refresh cookie, clear old.
  - `logout` → clear refresh cookie, `success(res, null)`.
  - `verifyEmail` → `success(res, { message })`.
  - `resendVerification` → `success(res, { message })`.
  - `forgotPassword` → `success(res, { message })`.
  - `resetPassword` → `success(res, { message })`.
  - `changePassword` → `success(res, { message })`. Requires `authenticate`.
  - `getProfile` → `success(res, { user })`. Requires `authenticate`.
  - `deleteAccount` → `success(res, { message })`. Requires `authenticate`.

  **Refresh cookie settings:**
  ```js
  res.cookie('refreshToken', rawRefreshToken, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth/refresh',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  ```

  **Clear cookie:**
  ```js
  res.clearCookie('refreshToken', { httpOnly: true, path: '/api/v1/auth/refresh' });
  ```

  Raw refresh token for `refreshTokens` is read from `req.cookies.refreshToken`.
  If missing, throw `AuthenticationError('No refresh token provided')`.

  Raw refresh token for `logout` is also read from `req.cookies.refreshToken`
  (allowed to be missing — defaults to full logout).

  Files: `server/src/modules/auth/auth.controller.js`

  Verify: Indirectly verified by integration tests in item 8.

---

- [ ] 8. Create `server/src/modules/auth/auth.routes.js` — Express Router.

  Import: `{ Router }` from `'express'`, `asyncHandler` from
  `../../common/utils/asyncHandler.js`, `{ authLimiter }` from
  `../../common/middleware/rateLimiter.js`, `{ validate }` from
  `../../common/middleware/validate.js`, `authenticate` from
  `../../common/middleware/authenticate.js`, all schemas from
  `./auth.validation.js`, all controller functions from `./auth.controller.js`.

  Route table:
  ```
  POST /register        authLimiter, validate(registerSchema),      register
  POST /login           authLimiter, validate(loginSchema),          login
  POST /refresh         validate(refreshSchema),                     refresh
  POST /logout                                                        logout
  GET  /verify-email    validate(verifyEmailSchema, 'query'),        verifyEmail
  POST /resend-verification  authLimiter, validate(resendVerificationSchema), resendVerification
  POST /forgot-password authLimiter, validate(forgotPasswordSchema), forgotPassword
  POST /reset-password  validate(resetPasswordSchema),               resetPassword
  POST /change-password authenticate, validate(changePasswordSchema), changePassword
  GET  /me              authenticate,                                 getProfile
  DELETE /me            authenticate,                                 deleteAccount
  ```

  Note: `verifyEmail` uses a `token` query parameter, so the schema targets `'query'`
  not `'body'`. Update `verifyEmailSchema` import/call accordingly.

  All route handlers wrapped in `asyncHandler`.

  Export the router as default.

  Files: `server/src/modules/auth/auth.routes.js`

  Verify: Indirectly verified by integration tests in item 9.

---

- [ ] 9. Update `server/src/app.js` — mount auth routes.

  Add two lines to `app.js`:
  1. Import: `import authRouter from './modules/auth/auth.routes.js';`
  2. Mount: `app.use('/api/v1/auth', authRouter);`
     Place this before the existing `// TODO: mount...` placeholder comment.

  Remove or replace the stub `app.use('/api/v1', (req, res, next) => next())` with the
  actual auth mount so routes are reachable.

  Files: `server/src/app.js`

  Verify: `npm test` — integration tests in item 10 hit `POST /api/v1/auth/register`
  and receive non-404 responses. Run `npm test` and confirm it passes.

---

- [ ] 10. Create `server/src/modules/auth/auth.test.js` — integration tests.

  Use `vitest` + `supertest`. Import `app` from `../../app.js`.
  Use the `connectTestDb` / `disconnectTestDb` / `clearCollections` helpers from
  `../../../tests/helpers/db.js`.

  `beforeAll`: `await connectTestDb()`.
  `afterAll`: `await disconnectTestDb()`.
  `beforeEach`: `await clearCollections()` + `clearSentEmails()` from emailProvider.

  Test suites and cases (minimum required; the coder may add more):

  **POST /api/v1/auth/register**
  - Returns 201 with `{ success: true, data: { user } }` and user has no `passwordHash`.
  - Sends a verification email (check `getSentEmails().length === 1` and
    `sentEmails[0].to === email`).
  - Returns 409 on duplicate email.
  - Returns 400 with `fieldErrors` on missing required fields.
  - Returns 400 on short password (< 8 chars).

  **POST /api/v1/auth/login**
  - Returns 200 with `accessToken` in body and `Set-Cookie: refreshToken` header.
  - Returns 401 on wrong password.
  - Returns 401 on unknown email.
  - Returns 400 on missing body fields.

  **POST /api/v1/auth/refresh**
  - With a valid refreshToken cookie, returns 200 with new `accessToken` and
    sets a new `Set-Cookie: refreshToken`.
  - Returns 401 if cookie is missing.
  - Returns 401 if cookie is invalid (bad token).
  - Token rotation: using the same refresh token twice returns 401 on the second use.

  **POST /api/v1/auth/logout**
  - With a valid refresh cookie, returns 200 and clears the cookie.
  - Without a cookie, still returns 200 (graceful).

  **GET /api/v1/auth/verify-email**
  - With a valid token query param, returns 200 and user's `isEmailVerified` becomes true.
  - With an invalid token, returns 401.
  - With a reused token (already `usedAt`), returns 401.

  **POST /api/v1/auth/forgot-password**
  - Always returns 200 regardless of whether the email exists.
  - When email exists, one email is sent.
  - When email does not exist, zero emails are sent.

  **POST /api/v1/auth/reset-password**
  - With valid token and new password, returns 200; subsequent login with new password
    succeeds and with old password fails.
  - With expired/invalid token, returns 401.

  **POST /api/v1/auth/change-password** (requires auth)
  - With correct current password, returns 200.
  - With wrong current password, returns 401.
  - Without auth header, returns 401.

  **GET /api/v1/auth/me** (requires auth)
  - With valid Bearer token, returns 200 with `{ user }` and no `passwordHash`.
  - Without auth header, returns 401.

  **DELETE /api/v1/auth/me** (requires auth)
  - Soft-deletes user; subsequent login returns 401.
  - Without auth header, returns 401.

  **Rate limiting (authLimiter)**
  - Sending 6 consecutive `POST /api/v1/auth/login` requests with wrong credentials
    returns 429 on the 6th request.

  Files: `server/src/modules/auth/auth.test.js`

  Verify: `npm test` from `server/` — all new tests pass. Target: zero failures.

---

- [ ] 11. Create `server/src/tests/security/auth.security.test.js` — security-focused tests.

  Same setup: `connectTestDb`, `disconnectTestDb`, `clearCollections`, `clearSentEmails`.

  Test suites:

  **JWT security**
  - A manipulated token (modified payload, same signature) returns 401 from `GET /api/v1/auth/me`.
  - An expired access token (stub `Date.now` to advance time) returns 401.
  - Token from one user is rejected for another user's protected resource.

  **Refresh token rotation / reuse detection**
  - After using a refresh token once, using it again returns 401 AND all sessions for
    that user are revoked (login again and the original refresh token also fails).

  **Password reset token invalidation**
  - Using a reset token twice: second use returns 401.
  - Using a reset token after a password change (via `changePassword`): still valid
    for the reset token (it wasn't consumed), but password change revokes all sessions.

  **Cookie security**
  - `refreshToken` cookie in `Set-Cookie` header has `HttpOnly` flag.
  - In test env (`NODE_ENV=test`), `Secure` flag is absent; verify this does not
    throw (the cookie is still set).

  **NoSQL injection guard**
  - POST `/api/v1/auth/login` with body `{ "email": { "$gt": "" }, "password": "x" }`
    returns 400 (Joi strips/rejects non-string email) rather than matching any user.

  **Account enumeration resistance**
  - `POST /forgot-password` with registered and unregistered email both return 200
    with identical response body.
  - `POST /resend-verification` with unregistered email returns 200.

  **Soft-deleted account**
  - After `DELETE /me`, subsequent `POST /login` with correct credentials returns 401.

  **Authorization boundary**
  - Accessing `GET /me` with a valid token but for a soft-deleted user returns 401.

  Files: `server/src/tests/security/auth.security.test.js`

  Verify: `npm test` from `server/` — all security tests pass. Zero failures.

---

## Cross-cutting implementation notes for the coding agent

1. **ESM imports**: Every relative import must include the `.js` extension.
   Example: `import User from '../users/user.model.js'`.

2. **`express-async-errors` is already imported** in `app.js` at the top. All async
   route handlers automatically forward thrown errors to the error handler. The
   `asyncHandler` wrapper in routes is for explicitness but is doubly safe.

3. **`validate.js` uses Joi** — the `schema` argument to `validate(schema)` must be
   a plain object with keys `body`, `query`, and/or `params`, each a `Joi.object()`.
   Do not pass a raw Joi schema; pass `{ body: Joi.object({...}) }`.

4. **`verifyEmailSchema` targets query**: The route is `GET /verify-email?token=...`.
   The controller should call `validate(verifyEmailSchema)` where `verifyEmailSchema`
   is `{ query: Joi.object({ token: Joi.string().hex().length(64).required() }) }`.
   Update the schema export accordingly.

5. **`token.js` function signatures**: `generateAccessToken(payload, secret, ttl)`
   and `verifyAccessToken(token, secret)` — both require explicit `secret` and `ttl`
   arguments (as seen in the existing implementation). Do not call them without these
   args.

6. **`toSafeObject()` strips `passwordHash`** — always use it when returning user data.

7. **Test isolation**: `clearCollections()` in `beforeEach` ensures no bleed between
   test cases. Each test that needs a user should create one fresh.

8. **Helper for registered + logged-in user**: Define a `registerAndLogin(agent, data)`
   helper at the top of the test file (not exported) that registers a user, extracts
   the `refreshToken` cookie from the login response, and returns
   `{ accessToken, refreshToken, user }`. Use `supertest`'s `.set('Cookie', ...)` to
   forward the cookie on refresh calls.

9. **Audit logs are fire-and-forget**: Do not `await` audit log writes inside service
   functions — write them with `.catch(err => logger.warn(...))`. They must never
   block or fail the main operation.

10. **`mongodb-memory-server` v10+**: The API is
    `const mongod = await MongoMemoryServer.create()`. Connect mongoose with
    `await mongoose.connect(mongod.getUri())`. Stop with `await mongod.stop()`.

11. **Rate limiter in tests**: `express-rate-limit` uses an in-memory store by
    default, which means the counter persists across requests within the same process.
    The rate limiting test must run last in its `describe` block, or reset the limiter
    by calling `clearCollections()` won't help (the store is not in MongoDB).
    Accept that the limiter test may interfere if run in the same process — isolate it
    in its own describe block and account for requests made in earlier tests by using
    a fresh IP (set `X-Forwarded-For: 127.0.0.X` with a unique X per test suite).
    Alternatively, skip asserting the exact 6th-request limit and assert that the
    limiter middleware exists on the route (check `router.stack`). **Final decision**:
    use `X-Forwarded-For` with a unique IP per rate-limit test to avoid pollution from
    other tests in the same run.

12. **No new npm packages beyond `mongodb-memory-server`**: `nodemailer`, `joi`,
    `express-rate-limit`, `jsonwebtoken`, `bcryptjs` are already installed. Do not
    add any new runtime dependencies.
