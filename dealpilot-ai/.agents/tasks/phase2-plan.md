# Phase 2 Implementation Plan — DealPilot AI Server Foundation

## Context

- **Project root:** `c:\Users\prana\OneDrive\Desktop\startupmeu\startupmeu\dealpilot-ai`
- **Server root:** `server/` (all paths below are relative to `server/`)
- **Module system:** ES Modules throughout — every import must include `.js` extension
- **Runtime:** Node.js; no transpilation step
- **Build check:** `npm run build` (no-op echo) — server is verified by running `npm test`
- **Test runner:** Vitest (`npm test` = `vitest run`)
- **Seed:** `npm run seed` = `node src/database/seed.js`

---

## Dependency order rationale

Each item below leaves the server in a state where `node src/server.js` can start (or fail with a clear config error) and `npm test` passes. The ordering is:

1. Constants first — imported by everything else, no dependencies of their own.
2. Config — depends only on `dotenv` + `joi` (both already installed).
3. Logger — depends on config for `NODE_ENV`.
4. Error classes — no runtime dependencies; used by middleware and modules.
5. Utility helpers — depend on config/logger; used by middleware and models.
6. Mongoose models — no inter-model dependencies except through schema refs (strings, not imports).
7. Middleware — depends on error classes, logger, config, utilities.
8. Database wiring — depends on config, logger, models (via ensureIndexes).
9. App wiring — depends on all middleware; depends on health routes.
10. Server entry — depends on app + database.
11. Seed script — depends on models + database.

---

## Implementation Plan

- [ ] 1. **Create `src/common/constants/index.js`**

  Define and export frozen arrays/objects: `INDUSTRIES`, `STAGES`, `BUSINESS_MODELS`,
  `INVESTOR_TYPES`, `PIPELINE_STAGES`, `ACTIVITY_TYPES`, `ALGORITHM_VERSION`,
  `MAX_PAGE_SIZE` (100), `DEFAULT_PAGE_SIZE` (20).

  All values must be `Object.freeze()`-ed so they cannot be mutated at runtime.
  These constants are imported by models (for enum validation) and business logic.

  Files: `src/common/constants/index.js`

  Verify: `node --input-type=module --eval "import c from './src/common/constants/index.js'; console.log(c.STAGES.length > 0)"` run from `server/` prints `true`.

---

- [ ] 2. **Create `src/config/index.js`**

  Load `.env` via `dotenv/config` at the top of the file. Define a Joi schema that
  validates every required env var listed below. Call `schema.validate(process.env,
  { allowUnknown: true, abortEarly: false })` and throw on error. Export a single
  `Object.freeze()`-ed `config` object.

  Required vars and their Joi types:
  - `PORT` — `Joi.number().default(5000)`
  - `NODE_ENV` — `Joi.string().valid('development','test','production').default('development')`
  - `CLIENT_URL` — `Joi.string().uri()`
  - `MONGODB_URI` — `Joi.string().required()`
  - `ACCESS_TOKEN_SECRET` — `Joi.string().min(32).required()`
  - `REFRESH_TOKEN_SECRET` — `Joi.string().min(32).required()`
  - `ACCESS_TOKEN_TTL` — `Joi.string().default('15m')`
  - `REFRESH_TOKEN_TTL` — `Joi.string().default('7d')`
  - `COOKIE_DOMAIN` — `Joi.string().default('localhost')`
  - `CORS_ORIGINS` — `Joi.string().default('http://localhost:5173')` (comma-separated, split into array in the config object)
  - `AI_PROVIDER` — `Joi.string().valid('openai','anthropic','mock').default('mock')`
  - `AI_MODEL` — `Joi.string().default('gpt-4o-mini')`
  - `AI_API_KEY` — `Joi.string().when('AI_PROVIDER', { is: 'mock', then: Joi.optional(), otherwise: Joi.required() })`
  - `EMAIL_PROVIDER` — `Joi.string().valid('smtp','mock').default('mock')`
  - `EMAIL_FROM` — `Joi.string().email().default('noreply@dealpilot.ai')`
  - `SMTP_HOST` — `Joi.string().default('localhost')`
  - `SMTP_PORT` — `Joi.number().default(587)`
  - `SMTP_USER` — `Joi.string().optional().allow('')`
  - `SMTP_PASS` — `Joi.string().optional().allow('')`
  - `APP_BASE_URL` — `Joi.string().uri().default('http://localhost:5000')`
  - `RATE_LIMIT_WINDOW_MS` — `Joi.number().default(900000)`
  - `RATE_LIMIT_MAX` — `Joi.number().default(100)`

  Files: `src/config/index.js`

  Verify: `node --input-type=module --eval "import cfg from './src/config/index.js'; console.log(cfg.port)"` (with a minimal `.env.test` setting MONGODB_URI + secrets) prints a port number.

---

- [ ] 3. **Create `src/common/utils/logger.js`**

  Use Winston. In `production` use JSON format; in all other environments use
  `winston.format.colorize()` + simple format. Always log to `Console` transport.
  Set level to `debug` in development, `info` in production.

  Redact sensitive fields: any log `meta` object containing keys `password`,
  `passwordHash`, `token`, `accessToken`, `refreshToken`, `apiKey` must have those
  values replaced with `'[REDACTED]'` before output. Implement this as a custom
  Winston format added before the final formatter.

  Export a single default `logger` instance. No file transports — cloud environments
  read stdout/stderr.

  Files: `src/common/utils/logger.js`

  Verify: `npm test` passes (no test yet — just ensure `node -e "import('./src/common/utils/logger.js').then(m=>m.default.info('ok'))"` exits 0).

---

- [ ] 4. **Create `src/common/errors/index.js`**

  Export `AppError` base class extending `Error` with properties:
  `statusCode`, `code` (string constant e.g. `'VALIDATION_ERROR'`), `isOperational`
  (always `true`), and optional `fieldErrors` array for validation failures.

  Export these 8 subclasses, each setting the correct `statusCode` and `code`:
  - `ValidationError` — 400, `'VALIDATION_ERROR'`, accepts optional `fieldErrors`
  - `AuthenticationError` — 401, `'AUTHENTICATION_ERROR'`
  - `ForbiddenError` — 403, `'FORBIDDEN'`
  - `NotFoundError` — 404, `'NOT_FOUND'`
  - `ConflictError` — 409, `'CONFLICT'`
  - `RateLimitError` — 429, `'RATE_LIMIT_EXCEEDED'`
  - `InternalError` — 500, `'INTERNAL_ERROR'`, `isOperational = false`
  - `ExternalServiceError` — 502, `'EXTERNAL_SERVICE_ERROR'`, accepts `service` name

  Files: `src/common/errors/index.js`

  Verify: `npm test` — add a unit test at `server/tests/unit/errors.test.js` that
  imports each class and asserts `statusCode`, `code`, and `isOperational`. Run
  `npm test` and confirm all tests pass.

---

- [ ] 5. **Create `src/common/utils/asyncHandler.js`**

  Export `asyncHandler(fn)` — wraps an async Express route handler and calls
  `next(err)` on rejection. This eliminates try/catch boilerplate in every route.

  ```js
  export const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
  ```

  Files: `src/common/utils/asyncHandler.js`

  Verify: `npm test` — unit test in `server/tests/unit/asyncHandler.test.js` confirms
  that a thrown error is forwarded to `next`.

---

- [ ] 6. **Create `src/common/utils/token.js`**

  Import `jsonwebtoken` and `config` from `../../config/index.js`.

  Export:
  - `generateAccessToken(payload)` — signs with `config.accessTokenSecret`, TTL from
    `config.accessTokenTtl`, algorithm `HS256`
  - `generateRefreshToken(payload)` — signs with `config.refreshTokenSecret`, TTL from
    `config.refreshTokenTtl`
  - `verifyAccessToken(token)` — verifies with `config.accessTokenSecret`; throws
    `AuthenticationError` (from errors/index.js) for invalid/expired tokens

  All three are named exports.

  Files: `src/common/utils/token.js`

  Verify: `npm test` — unit test in `server/tests/unit/token.test.js` round-trips a
  payload through generate/verify and confirms the error path on an invalid token.

---

- [ ] 7. **Create `src/common/utils/hash.js`**

  Import `bcryptjs` and `crypto` (built-in).

  Export:
  - `hashPassword(plaintext)` — `bcrypt.hash(plaintext, 12)`
  - `comparePassword(plaintext, hash)` — `bcrypt.compare`
  - `hashToken(token)` — `crypto.createHash('sha256').update(token).digest('hex')` (for
    storing email/refresh tokens in DB without exposing raw values)
  - `generateSecureToken(bytes = 32)` — `crypto.randomBytes(bytes).toString('hex')`

  Files: `src/common/utils/hash.js`

  Verify: `npm test` — unit test in `server/tests/unit/hash.test.js` checks that
  `comparePassword` returns true for a matching pair and false for a mismatch.

---

- [ ] 8. **Create `src/common/utils/response.js`**

  Export three helpers that write consistent response shapes:

  - `success(res, data, message, statusCode = 200)` — `{ success: true, message, data }`
  - `created(res, data, message)` — calls `success` with 201
  - `paginated(res, data, meta, message)` — `{ success: true, message, data, meta }`
    where `meta` comes from `buildPaginationMeta` (item 9)

  Files: `src/common/utils/response.js`

  Verify: Visual inspection is sufficient here; verify indirectly once health routes
  (item 22) are wired and `npm test` passes the integration tests introduced in item 24.

---

- [ ] 9. **Create `src/common/utils/pagination.js`**

  Export:
  - `parsePagination(query, defaults = {})` — reads `query.page` (default 1) and
    `query.limit` (default `DEFAULT_PAGE_SIZE`, capped at `MAX_PAGE_SIZE`); returns
    `{ page, limit, skip }`.
  - `buildPaginationMeta(page, limit, total)` — returns
    `{ page, limit, total, totalPages, hasNextPage, hasPrevPage }`.

  Import `DEFAULT_PAGE_SIZE` and `MAX_PAGE_SIZE` from `../../common/constants/index.js`.

  Files: `src/common/utils/pagination.js`

  Verify: `npm test` — unit test in `server/tests/unit/pagination.test.js` checks
  boundary values (page clamping, limit capping, totalPages calculation).

---

- [ ] 10. **Create `src/common/utils/sanitize.js`**

  Export:
  - `sanitizeMongoQuery(obj)` — recursively removes keys that start with `$` or contain
    `.` to prevent NoSQL injection; returns a clean object.
  - `sanitizeForCsv(value)` — escapes CSV injection by prepending a single quote if the
    string starts with `=`, `+`, `-`, or `@`; also escapes embedded double-quotes.

  Files: `src/common/utils/sanitize.js`

  Verify: `npm test` — unit test in `server/tests/unit/sanitize.test.js` confirms that
  `{ "$where": "..." }` and `{ "nested.$op": 1 }` are stripped, and that `=SUM(A1)`
  becomes `'=SUM(A1)`.

---

- [ ] 11. **Create all Mongoose models (10 files)**

  Create each model file using ES module syntax (`import mongoose from 'mongoose'; export default model`).
  All string enums must reference the frozen arrays from `src/common/constants/index.js`.
  All schemas must include `{ timestamps: true }` unless noted otherwise.

  **a. `src/modules/users/user.model.js`**
  Fields: `firstName` (String, required, trim, maxLength 100), `lastName` (String,
  required, trim, maxLength 100), `email` (String, required, unique, lowercase, trim),
  `passwordHash` (String, `select: false`), `role` (enum: `['founder','admin']`,
  default `'founder'`), `isEmailVerified` (Boolean, default false),
  `isActive` (Boolean, default true), `lastLoginAt` (Date), `preferences`
  (Mixed, default `{}`), `deletedAt` (Date, default null). Add a pre-save hook that
  calls `this.email = this.email.toLowerCase()`. Add a virtual `fullName`.
  Index: `{ email: 1 }` (unique already implied), `{ deletedAt: 1 }`.

  **b. `src/modules/auth/refreshSession.model.js`**
  Fields: `userId` (ObjectId ref `'User'`, required), `tokenHash` (String, required,
  `select: false`), `userAgent` (String), `ipAddress` (String), `expiresAt` (Date,
  required), `revokedAt` (Date, default null), `replacedByTokenHash` (String). Index:
  `{ userId: 1 }`, `{ expiresAt: 1, revokedAt: 1 }`.

  **c. `src/modules/auth/emailToken.model.js`**
  Fields: `userId` (ObjectId ref `'User'`, required), `tokenHash` (String, required,
  `select: false`), `type` (enum: `['email_verification','password_reset']`, required),
  `expiresAt` (Date, required), `usedAt` (Date, default null). TTL index on `expiresAt`
  (set expireAfterSeconds to 0 — MongoDB removes docs when `expiresAt` is passed).

  **d. `src/modules/auth/auditLog.model.js`**
  Fields: `userId` (ObjectId ref `'User'`), `action` (String, required),
  `targetType` (String), `targetId` (ObjectId), `ipAddress` (String),
  `userAgent` (String), `metadata` (Mixed, default `{}`), `createdAt` (Date).
  Use `{ timestamps: false }` and set `createdAt` manually (default `Date.now`).
  Do NOT update — audit logs are append-only. Index: `{ userId: 1, createdAt: -1 }`.

  **e. `src/modules/startups/startup.model.js`**
  Fields: `userId` (ObjectId ref `'User'`, required, unique), `name` (String, required,
  trim, maxLength 200), `tagline` (String, trim, maxLength 300), `description`
  (String, maxLength 5000), `industries` (array of enum from `INDUSTRIES`),
  `stage` (enum from `STAGES`), `location` (`{ city, country, remote: Boolean }`),
  `businessModel` (enum from `BUSINESS_MODELS`), `foundedYear` (Number),
  `teamSize` (Number), `website` (String), `linkedIn` (String),
  `fundingGoal` (Number), `minTicket` (Number), `maxTicket` (Number),
  `currency` (String, default `'USD'`), `traction` (Mixed, default `{}`),
  `revenue` (Number), `revenueModel` (String), `isDraft` (Boolean, default true),
  `isActive` (Boolean, default true), `deletedAt` (Date, default null).
  Add a virtual `profileCompleteness` that returns a number 0–100 computed from
  how many of the 10 key fields (`name`, `description`, `industries`, `stage`,
  `location.country`, `fundingGoal`, `traction`, `businessModel`, `teamSize`,
  `website`) are non-empty.

  **f. `src/modules/investors/investor.model.js`**
  Fields: `name` (String, required, trim), `firm` (String, trim), `type`
  (enum from `INVESTOR_TYPES`), `bio` (String), `industries` (Array of strings),
  `stages` (Array of strings), `geographies` (Array of strings),
  `minTicket` (Number), `maxTicket` (Number), `currency` (String, default `'USD'`),
  `portfolioCount` (Number), `website` (String), `linkedIn` (String),
  `twitter` (String), `isDemo` (Boolean, default false), `isDemoLabel` (String,
  default `'Demo Data'`), `source` (String), `sourceUrl` (String).
  Add a text index: `{ name: 'text', firm: 'text', bio: 'text' }` with weights
  `{ name: 3, firm: 2, bio: 1 }`. Add compound index: `{ type: 1, stages: 1 }`.

  **g. `src/modules/investors/savedInvestor.model.js`**
  Fields: `userId` (ObjectId ref `'User'`, required), `investorId` (ObjectId ref
  `'Investor'`, required), `notes` (String), `tags` (Array of strings).
  Compound unique index: `{ userId: 1, investorId: 1 }`.

  **h. `src/modules/matching/match.model.js`**
  Fields: `userId` (ObjectId ref `'User'`, required), `startupId` (ObjectId ref
  `'Startup'`, required), `investorId` (ObjectId ref `'Investor'`, required),
  `score` (Number, min 0, max 100), `breakdown` (array of
  `{ criterion: String, weight: Number, rawScore: Number, weightedScore: Number }`),
  `explanation` (String), `algorithmVersion` (String, default `ALGORITHM_VERSION`),
  `isStale` (Boolean, default false). Compound index:
  `{ userId: 1, startupId: 1, score: -1 }`. Compound unique on
  `{ startupId: 1, investorId: 1, algorithmVersion: 1 }`.

  **i. `src/modules/pipeline/deal.model.js`**
  Fields: `userId` (ObjectId ref `'User'`, required), `startupId` (ObjectId ref
  `'Startup'`, required), `investorId` (ObjectId ref `'Investor'`, required),
  `stage` (enum from `PIPELINE_STAGES`, required), `priority` (enum:
  `['low','medium','high']`, default `'medium'`), `nextActionDate` (Date),
  `nextActionNote` (String), `contactHistory` (array of
  `{ date: Date, channel: String, notes: String, outcome: String }`),
  `meetings` (array of `{ scheduledAt: Date, agenda: String, outcome: String,
  recordingUrl: String }`), `fundingAmountSought` (Number), `notes` (String),
  `closedAt` (Date), `closedReason` (String). Compound unique index:
  `{ userId: 1, investorId: 1 }` (one pipeline entry per investor per founder).
  Index: `{ userId: 1, stage: 1 }`.

  **j. `src/modules/activities/activity.model.js`**
  Fields: `userId` (ObjectId ref `'User'`, required), `type` (enum from
  `ACTIVITY_TYPES`, required), `resourceType` (String), `resourceId` (ObjectId),
  `metadata` (Mixed, default `{}`), `ipAddress` (String), `userAgent` (String).
  Index: `{ userId: 1, createdAt: -1 }`. Use `{ timestamps: true }`.

  **k. `src/modules/copilot/pitchAnalysis.model.js`**
  Fields: `userId` (ObjectId ref `'User'`, required), `startupId` (ObjectId ref
  `'Startup'`, required), `version` (Number, default 1), `inputSnapshot`
  (Mixed — the startup profile at time of analysis), `strengths` (Array of String),
  `weaknesses` (Array of String), `missingInfo` (Array of String), `risks`
  (Array of String), `suggestions` (Array of
  `{ priority: String, category: String, text: String }`),
  `overallScore` (Number, min 0, max 100), `readinessLevel`
  (enum: `['pre-seed-ready','seed-ready','series-a-ready','not-ready']`),
  `aiProvider` (String), `aiModel` (String), `promptVersion` (String),
  `rawResponse` (String, `select: false`), `isUserEdited` (Boolean, default false),
  `userNotes` (String). Index: `{ userId: 1, startupId: 1, createdAt: -1 }`.

  Files (all): listed above (a–k).

  Verify: `npm test` — add a schema-shape test in `server/tests/unit/models.test.js`
  that imports all 11 models, verifies that required paths exist in their schema, and
  that compound indexes are declared. Run `npm test`; all tests must pass.

---

- [ ] 12. **Create `src/common/middleware/requestId.js`**

  Import `{ v4 as uuidv4 }` from `'uuid'`. Export a single Express middleware function
  (default export) that:
  1. Reads `req.headers['x-request-id']`; if present and valid UUID, use it; otherwise
     generate a new `uuidv4()`.
  2. Sets `req.id` to that value.
  3. Sets the response header `X-Request-ID` to that value.
  4. Calls `next()`.

  Files: `src/common/middleware/requestId.js`

  Verify: `npm test` — unit test in `server/tests/unit/requestId.test.js` confirms
  that the middleware sets `req.id` and the response header.

---

- [ ] 13. **Create `src/common/middleware/errorHandler.js`**

  Import `logger`, `AppError` and all subclasses from errors/index.js.

  This is the global Express error handler (`(err, req, res, next)` signature).
  Logic:

  1. If `err` is a Mongoose `ValidationError` (check `err.name === 'ValidationError'`),
     convert to `new ValidationError('Validation failed', fieldErrors)` where
     `fieldErrors` is derived from `err.errors`.
  2. If `err.name === 'CastError'` (invalid ObjectId), convert to `NotFoundError`.
  3. If `err.code === 11000` (duplicate key), convert to `ConflictError` with a message
     naming the duplicate field extracted from `err.keyPattern`.
  4. If `err.name === 'JsonWebTokenError'` or `'TokenExpiredError'`, convert to
     `AuthenticationError`.
  5. If err is not an `AppError` (i.e., `!(err instanceof AppError)` or
     `!err.isOperational`), log it as an unhandled error and replace with
     `InternalError`.
  6. In production, never include `stack` in the response.
  7. Always log the error using `logger.error`.

  Response shape: `{ success: false, error: { code, message, requestId, fieldErrors? } }`.

  Files: `src/common/middleware/errorHandler.js`

  Verify: `npm test` — integration test in `server/tests/integration/errorHandler.test.js`
  creates a minimal Express app with the error handler and confirms that a thrown
  `NotFoundError` returns `{ success: false, error: { code: 'NOT_FOUND' } }` and status 404.

---

- [ ] 14. **Create `src/common/middleware/authenticate.js`**

  Export a single default middleware. Extract the Bearer token from
  `Authorization: Bearer <token>` (or from the `accessToken` cookie as fallback).
  Call `verifyAccessToken(token)` from `src/common/utils/token.js`.
  Set `req.user = { id, email, role }` from the decoded payload.
  Throw `AuthenticationError` if token is missing or invalid.

  Files: `src/common/middleware/authenticate.js`

  Verify: `npm test` — unit test in `server/tests/unit/authenticate.test.js` confirms
  that valid tokens set `req.user` and missing tokens call `next` with an
  `AuthenticationError`.

---

- [ ] 15. **Create `src/common/middleware/authorize.js`**

  Export a factory function `authorize(...roles)` that returns Express middleware.
  The middleware checks `req.user.role` against the allowed roles array. If
  `req.user` is missing, throw `AuthenticationError`. If the role is not in the
  allowed list, throw `ForbiddenError`.

  Files: `src/common/middleware/authorize.js`

  Verify: `npm test` — unit test in `server/tests/unit/authorize.test.js` covers the
  allow and deny paths.

---

- [ ] 16. **Create `src/common/middleware/validate.js`**

  Export `validate(schema, target = 'body')` factory. `target` can be `'body'`,
  `'query'`, or `'params'`. The middleware calls `schema.validate(req[target],
  { abortEarly: false, stripUnknown: true })`. On error, throw `ValidationError` with
  `fieldErrors` extracted from `err.details` as `[{ field, message }]`. On success,
  replace `req[target]` with the validated/cast Joi result.

  Use Joi (already in dependencies) — not express-validator — for consistency with the
  config validation approach.

  Files: `src/common/middleware/validate.js`

  Verify: `npm test` — unit test in `server/tests/unit/validate.test.js` confirms that
  a Joi schema violation returns `fieldErrors` and that a valid payload replaces
  `req.body`.

---

- [ ] 17. **Create `src/common/middleware/rateLimiter.js`**

  Import `rateLimit` from `'express-rate-limit'`. Export three named limiters:

  - `authLimiter` — 5 requests per 15 minutes, message:
    `'Too many authentication attempts, please try again later.'`
  - `apiLimiter` — 100 requests per 15 minutes, configured from
    `config.rateLimitWindowMs` and `config.rateLimitMax`
  - `aiLimiter` — 10 requests per 60 minutes, message:
    `'AI request quota exceeded, please try again later.'`

  All three must use `standardHeaders: true` and `legacyHeaders: false`.
  Set `handler` to create and pass a `RateLimitError` to `next()` so the global error
  handler formats the response consistently.

  Files: `src/common/middleware/rateLimiter.js`

  Verify: `npm test` — unit test in `server/tests/unit/rateLimiter.test.js` confirms
  that the exported values are Express middleware functions with a `resetTime` or
  `limit` property.

---

- [ ] 18. **Rewrite `src/database/connection.js`**

  Replace the stub with a full implementation:
  - Export `connect()` — reads `config.mongodbUri`, calls
    `mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })`. Register event
    handlers on the mongoose connection: `'connected'` → `logger.info`, `'error'` →
    `logger.error`, `'disconnected'` → `logger.warn`. Return the connection.
  - Export `disconnect()` — calls `mongoose.connection.close(false)` and logs.
  - Use `config` from `src/config/index.js` and `logger` from
    `src/common/utils/logger.js`.
  - Remove the old `connectDatabase` default export; keep named exports only.

  Files: `src/database/connection.js`

  Verify: `npm test` — existing and new integration tests that mock mongoose still pass.
  Confirm no reference to the old `connectDatabase` name exists after the rewrite (a
  `grep` for `connectDatabase` in `src/` should find zero results).

---

- [ ] 19. **Rewrite `src/database/indexes.js`**

  Replace the stub so `ensureIndexes()` imports all 11 models and calls
  `Model.createIndexes()` on each. Wrap in try/catch; log success or failure per model.
  Only proceed once the DB connection is established (callers are responsible for
  sequencing — this function does not connect).

  Models to call `.createIndexes()` on: User, RefreshSession, EmailToken, AuditLog,
  Startup, Investor, SavedInvestor, Match, Deal, Activity, PitchAnalysis.

  Files: `src/database/indexes.js`

  Verify: `npm test` — unit test in `server/tests/unit/indexes.test.js` stubs
  `Model.createIndexes` and confirms each model has it called exactly once.

---

- [ ] 20. **Create health module (`src/modules/health/`)**

  Create two files:

  **`src/modules/health/health.controller.js`**
  - `getLive(req, res)` — always responds 200 `{ success: true, data: { status: 'ok',
    uptime: process.uptime() } }` using `response.success()`.
  - `getReady(req, res)` — checks `mongoose.connection.readyState === 1`; if ready,
    responds 200 `{ status: 'ok', db: 'connected' }`; if not, throws `InternalError`
    with message `'Database not ready'`.

  **`src/modules/health/health.routes.js`**
  - Create an Express `Router`. Mount `GET /live → getLive` and
    `GET /ready → getReady`. Both wrapped in `asyncHandler`.
  - Export the router as default.

  Files: `src/modules/health/health.controller.js`,
  `src/modules/health/health.routes.js`

  Verify: `npm test` — integration test in `server/tests/integration/health.test.js`
  uses Supertest + a mocked Mongoose connection (readyState = 1) to assert 200 on
  `/health/live` and `/health/ready`.

---

- [ ] 21. **Rewrite `src/app.js`**

  Replace the minimal stub with the full Express application assembly:

  ```
  import 'dotenv/config';                  // must be first
  import express from 'express';
  import helmet from 'helmet';
  import cors from 'cors';
  import cookieParser from 'cookie-parser';
  import morgan from 'morgan';
  import { v4 as uuidv4 } from 'uuid';
  import config from './config/index.js';
  import logger from './common/utils/logger.js';
  import requestId from './common/middleware/requestId.js';
  import errorHandler from './common/middleware/errorHandler.js';
  import { apiLimiter } from './common/middleware/rateLimiter.js';
  import { NotFoundError } from './common/errors/index.js';
  import healthRoutes from './modules/health/health.routes.js';
  ```

  Middleware order (exactly this order matters):
  1. `requestId` — inject request ID before anything is logged
  2. `helmet()` — security headers
  3. `cors({ origin: config.corsOrigins, credentials: true })`
  4. `cookieParser()`
  5. `morgan('combined', { stream: { write: msg => logger.http(msg.trim()) } })`
  6. `express.json({ limit: '1mb' })`
  7. `express.urlencoded({ extended: true, limit: '1mb' })`
  8. `apiLimiter` scoped to `/api/`
  9. Mount `healthRoutes` at `/health`
  10. Mount future API routes at `/api/v1` (placeholder comment with `// TODO: mount auth, startups, investors, etc.`)
  11. 404 handler: `app.use((req, _res, next) => next(new NotFoundError(\`Route \${req.method} \${req.path} not found\`)))`
  12. `errorHandler` — last

  Export `app` as default.

  Files: `src/app.js`

  Verify: `npm test` — integration test in `server/tests/integration/app.test.js`
  confirms that `GET /health/live` returns 200, `GET /nonexistent` returns 404 with
  `{ success: false, error: { code: 'NOT_FOUND' } }`, and response includes
  `X-Request-ID` header.

---

- [ ] 22. **Rewrite `src/server.js`**

  Replace the minimal stub:

  ```js
  import 'dotenv/config';
  import app from './app.js';
  import { connect, disconnect } from './database/connection.js';
  import ensureIndexes from './database/indexes.js';
  import logger from './common/utils/logger.js';
  import config from './config/index.js';
  ```

  Boot sequence:
  1. `await connect()`
  2. `await ensureIndexes()`
  3. `const server = app.listen(config.port, ...)`

  Graceful shutdown handler for both `SIGTERM` and `SIGINT`:
  1. Log "shutting down"
  2. `server.close()` — stop accepting new connections
  3. `await disconnect()` — close Mongoose
  4. `process.exit(0)`

  On unhandled rejection or uncaught exception: log the error and `process.exit(1)`.

  Files: `src/server.js`

  Verify: `npm test` — the existing health integration test (item 20) implicitly
  validates that the app boots; confirm `npm test` exits 0.

---

- [ ] 23. **Rewrite `src/database/seed.js`**

  Replace the stub with a full seed script. Seed 30 fictional demo investors
  (all `isDemo: true`) using `Investor.bulkWrite` with `upsert: true` on
  `{ name: investor.name }` so the script is safe to rerun.

  Each investor record must have realistic values for:
  `name`, `firm`, `type` (from `INVESTOR_TYPES`), `bio`, `industries` (2–4 from
  `INDUSTRIES`), `stages` (1–3 from `STAGES`), `geographies` (1–3 strings),
  `minTicket`, `maxTicket`, `currency: 'USD'`, `website`, `isDemo: true`,
  `isDemoLabel: 'Demo Data — Not a Real Investor'`.

  Use a hardcoded array (no faker library) so the seed is deterministic and
  reviewable. At the end: call `disconnect()` and `process.exit(0)`.

  Files: `src/database/seed.js`

  Verify: With a running MongoDB (or MongoDB Memory Server in CI), run
  `npm run seed` and confirm it exits 0. Then run it again to confirm idempotence.
  In the unit test suite, add `server/tests/unit/seed.test.js` that imports the
  seed data array and confirms 30 records, each with required fields present.

---

- [ ] 24. **Add a `vitest.config.js` and verify the full test suite passes**

  Check whether `server/vitest.config.js` already exists. If not, create it:

  ```js
  import { defineConfig } from 'vitest/config';
  export default defineConfig({
    test: {
      environment: 'node',
      globals: true,
      coverage: { reporter: ['text', 'lcov'] },
    },
  });
  ```

  Ensure all test files created in items 4–23 are co-located under `server/tests/`
  and are named `*.test.js`. Run `npm test` from `server/` and confirm the suite
  exits with no failures. Fix any import path issues (`.js` extensions required for
  ES module resolution) without changing the logic.

  Files: `server/vitest.config.js` (create if missing)

  Verify: `npm test` from `server/` exits 0 with all test files discovered and
  passing. `npm run test:coverage` should report > 70% coverage across the files
  created in this phase.

---

## Implementation notes for the coding agent

1. **ES module imports:** Every relative import must use the `.js` extension,
   e.g., `import config from './config/index.js'`. Node will not resolve
   extensionless imports in ESM mode.

2. **No circular imports:** The dependency chain is strictly:
   `constants → config → logger → errors → utils → models → middleware → routes → app → server`.
   Never import `app` or `server` from a lower layer.

3. **Test doubles:** Unit tests must mock `mongoose` connections using Vitest's
   `vi.mock`. Do not start a real MongoDB in unit tests. Use MongoDB Memory Server
   only in integration tests that explicitly need a real Mongoose connection.

4. **Config loading in tests:** Tests that import modules depending on `config`
   must set the required env vars before the import. Use Vitest's `vi.stubEnv` or
   a `tests/setup.js` file.

5. **Seed data:** All 30 investor names must be fictional (do not use real investor
   names or firms). Vary industries and stages realistically.

6. **The `health` module directory** (`src/modules/health/`) does not exist yet —
   create it as part of item 20.

7. **Remove `.gitkeep` files** in directories that now have real content.
   (`src/common/constants/.gitkeep`, `src/common/errors/.gitkeep`, etc.)
