# DealPilot AI — Phase 2 Backend Foundation

The Phase 2 delivery lays down the complete server infrastructure layer: configuration validation, structured logging, a typed error hierarchy, six middleware pieces, eleven Mongoose models, database wiring, graceful startup/shutdown, and a seed script of 30 demo investors. The approach is a clean Express modular monolith with ESM throughout. Every required file is present and structurally sound. The foundation is ready for feature modules to be mounted on top.

**Watch for:** `smtpPass` and `aiApiKey` live in the frozen config object in plain text — they need to be excluded from any logging of the config object (confirmed). The `getReady` health endpoint throws synchronously inside an `asyncHandler`-wrapped route; the throw will be caught and converted to a 500, but the intent reads as if the error should be a structured `ServiceUnavailableError`, not an `InternalError` (confirmed). The seed script's upsert counter logic is inverted — it always increments `upserted` and never `modified`, so the progress summary is meaningless, though the actual upsert behavior is correct (confirmed).

**Verdict**: APPROVED

---

## High-level view

Config validation runs at module load time via Joi, freezes the result, and exits the process on failure — correct fail-fast behavior. All expected environment variables are covered. `smtpPass` and `aiApiKey` are present as plain string fields on the frozen object; no code currently logs the whole config, but any future `logger.info('config', config)` call would leak them.

The Winston logger applies a `redactSensitive` transform that covers the important credential keys. The redaction only walks `info` properties beyond `message/level/timestamp`, so a top-level string log (`logger.info(config.smtpPass)`) would print raw — this is a usage constraint worth noting in onboarding docs, not a code defect.

All eleven models are present: `User`, `Startup`, `Investor`, `SavedInvestor`, `Match`, `Deal`, `PitchAnalysis`, `Activity`, `RefreshSession`, `EmailToken`, `AuditLog`. Every model uses `strict: true` and `timestamps: true`. Security-critical fields — `passwordHash` on User and `tokenHash` on RefreshSession and EmailToken — all carry `select: false`. Indexes are correctly defined in the schemas and materialized at startup via `ensureIndexes`.

The six middleware pieces (requestId, errorHandler, authenticate, authorize, validate, rateLimiter) are all present, correctly wired in `app.js`, and handle their respective concerns. The validate middleware stages values before committing them to `req`, which prevents partial mutation on validation failure.

The `app.js` wiring order is correct: requestId → helmet → CORS → cookieParser → morgan → body parsers → rate limiter → routes → 404 → errorHandler. The one gap is that `express-async-errors` is imported at the top of `app.js`, which patches Express's router — this is compatible with the explicit `asyncHandler` wrapper used in health routes, but it means future routes that omit `asyncHandler` will still have async errors caught. That's a safety net, not a problem.

The seed script correctly upserts 30 demographically and geographically diverse investors with `isDemoData: true`. The upsert uses `name + organization` as the natural key, which is appropriate for demo data. The progress-tracking counter (`upserted`/`modified`) is broken by logic inversion but does not affect data correctness.

---

<details>
<summary>Issues (3)</summary>

1. **Config object contains credential fields** — `smtpPass` and `aiApiKey` are plain string fields on the exported frozen config object. Any code that logs or serializes the full config object will leak these values. Remove them from the config export and access them only via `process.env` or via a separate secrets accessor that is never serialized.

2. **Health `/ready` uses `InternalError` for a transient condition** — When the database is not connected, `getReady` throws `new InternalError('Database not ready')`, which maps to HTTP 500 and `isOperational: false`. A DB-not-ready state is a transient, expected condition during startup or a brief disconnect; it should return HTTP 503 with `isOperational: true`. Add a `ServiceUnavailableError` (503) to the error hierarchy and use it here.

3. **Seed upsert counter is always wrong** — `findOneAndUpdate` with `upsert: true` returns the document on both insert and update, so `result` is always truthy. `upserted` always increments; `modified` never does. The log line `${DEMO_INVESTORS.length} demo investors upserted` is correct by coincidence; the fine-grained counter is not. Fix by using `updateOne` with `upsert: true` and reading `result.upsertedCount` / `result.modifiedCount`.

</details>

---

<details>
<summary>Details</summary>

### Credential fields on the config object

`config.smtpPass` and `config.aiApiKey` are exported as ordinary string properties. The logger's `redactSensitive` transform only fires when these keys appear as named properties of an object passed to a logger call — it does not prevent them from being printed if the entire config object is logged directly. The token secrets (`accessTokenSecret`, `refreshTokenSecret`) are in the same situation but are arguably higher risk. No current code logs the config object, but this is the kind of mistake that gets made once in a debug session and committed accidentally. The safer pattern is to keep `smtpPass`, `smtpUser`, `aiApiKey`, `accessTokenSecret`, and `refreshTokenSecret` out of the exported config object entirely, reading them from `process.env` directly in the modules that need them (token.js, hash.js, integrations). Alternatively, wrap them in a getter that always returns `[REDACTED]` when serialized via `toJSON`.

### Health endpoint failure classification

`getReady` in `health.controller.js`:

```js
if (!isConnected) {
  throw new InternalError('Database not ready');
}
```

`InternalError` sets `isOperational = false` and `statusCode = 500`. The errorHandler will log it at `error` severity and strip the message in production. A database readiness check failing is a 503 Service Unavailable — it is expected during rolling deployments and monitored by load balancers and orchestrators looking for that specific status code. Sending 500 will cause unnecessary alerting noise and incorrect behavior in Kubernetes liveness/readiness probes. Adding `ServiceUnavailableError` to the hierarchy is a one-liner.

### `findOneAndUpdate` upsert counter

```js
const result = await Investor.findOneAndUpdate(
  { name: investor.name, organization: investor.organization },
  { $set: investor },
  { upsert: true, new: true },
);

if (result) {
  upserted++;   // always true — findOneAndUpdate always returns the document
} else {
  modified++;   // unreachable
}
```

The upsert itself works correctly; the document is created or updated as intended. Only the telemetry is wrong. The fix is to switch to `updateOne` (which returns `{ upsertedCount, modifiedCount, matchedCount }`) or to check `result._id` against a pre-fetch to distinguish inserts from updates.

### `express-async-errors` and `asyncHandler` coexistence

`app.js` imports `express-async-errors` which monkey-patches Express's `Layer.prototype.handle`. `health.routes.js` also wraps handlers in `asyncHandler`. The explicit wrapper is redundant when the patch is active. This won't cause bugs, but future developers adding routes will have an inconsistent model to copy from — some routes wrapped, some not. A codebase comment or a single documented convention would prevent that drift.

### Morgan → Winston log stream

```js
app.use(morgan(morganFormat, { stream: { write: (msg) => logger.http(msg.trim()) } }));
```

This routes HTTP access logs through Winston so they inherit the production JSON format and redaction pipeline. `logger.http` requires the transport level to be set at or below `http`. The current logger uses `info` in production and `debug` in development. In production, `http` (level 3) is below `info` (level 2 in Winston's npm levels), meaning HTTP access logs are suppressed in production. This is likely intentional — production access logging is often handled by a reverse proxy — but it should be a documented decision rather than an accidental omission.

</details>

---

<details>
<summary>File map</summary>

| File | Change |
|---|---|
| `src/config/index.js` | Joi schema validation, frozen config export |
| `src/common/utils/logger.js` | Winston with sensitive-field redaction |
| `src/common/errors/index.js` | AppError base + 8 subclasses |
| `src/common/middleware/requestId.js` | UUID per-request injection |
| `src/common/middleware/errorHandler.js` | Mongoose/JWT normalization + structured error response |
| `src/common/middleware/authenticate.js` | Bearer + cookie JWT verification |
| `src/common/middleware/authorize.js` | Role-based access gate |
| `src/common/middleware/validate.js` | Staged multi-target Joi validation |
| `src/common/middleware/rateLimiter.js` | Auth (5/15m), API (100/15m), AI (10/1h) limiters |
| `src/common/utils/asyncHandler.js` | Promise catch → next() wrapper |
| `src/common/utils/hash.js` | bcrypt password hash/compare + SHA-256 token hash |
| `src/common/utils/token.js` | JWT sign/verify + opaque refresh token generation |
| `src/common/utils/pagination.js` | parse + buildMeta helpers with MAX_PAGE_SIZE cap |
| `src/common/utils/response.js` | success / created / paginated response helpers |
| `src/common/utils/sanitize.js` | MongoDB operator injection strip + CSV injection prefix |
| `src/common/constants/index.js` | INDUSTRIES, STAGES, PIPELINE_STAGES, ACTIVITY_TYPES, BUSINESS_MODELS, INVESTOR_TYPES, limits |
| `src/database/connection.js` | Mongoose connect/disconnect with event handlers |
| `src/database/indexes.js` | ensureIndexes over all 11 models at startup |
| `src/database/seed.js` | 30 demo investors upserted by name+org natural key |
| `src/modules/users/user.model.js` | User schema; passwordHash select:false; toSafeObject |
| `src/modules/auth/refreshSession.model.js` | Hashed token sessions; TTL index; isActive virtual |
| `src/modules/auth/emailToken.model.js` | Email verify / password-reset tokens; tokenHash select:false; TTL index |
| `src/modules/auth/auditLog.model.js` | Security audit events with severity |
| `src/modules/startups/startup.model.js` | Full startup profile; profileCompleteness pre-save hook |
| `src/modules/investors/investor.model.js` | Investor directory with text + field indexes |
| `src/modules/investors/savedInvestor.model.js` | User bookmarks; unique userId+investorId index |
| `src/modules/matching/match.model.js` | Scored match records with criterion breakdown |
| `src/modules/pipeline/deal.model.js` | CRM deal with contact history and meeting log |
| `src/modules/activities/activity.model.js` | User activity feed |
| `src/modules/copilot/pitchAnalysis.model.js` | AI analysis result with structured output schema |
| `src/modules/health/health.controller.js` | /live and /ready handlers |
| `src/modules/health/health.routes.js` | Health router wired to controller |
| `src/app.js` | Express app wiring: middleware stack + health routes |
| `src/server.js` | Process entry: connect → listen → graceful SIGTERM/SIGINT |

</details>
