# DealPilot AI — Implementation Checklist

Track progress through all 12 development phases. Check each item as it is completed and verified.

---

## Phase 1 — Repository scaffolding and project initialization

- [ ] Inspect existing repository state
- [ ] Create full directory structure (client, server, e2e, docs, scripts, .github)
- [ ] Root package.json with npm workspaces and root scripts
- [ ] client/package.json with all dependencies
- [ ] server/package.json with all dependencies
- [ ] client/vite.config.js with React plugin, test config, and server proxy
- [ ] client/tailwind.config.js with content paths
- [ ] client/postcss.config.js
- [ ] client/eslint.config.js (flat config)
- [ ] client/.env.example
- [ ] server/eslint.config.js
- [ ] server/.env.example with all required variables
- [ ] Root .gitignore
- [ ] Root .dockerignore
- [ ] docs/AI-DEVELOPMENT-LOG.md with template entries
- [ ] docs/ARCHITECTURE.md
- [ ] scripts/check-env.js
- [ ] .github/workflows/ci.yml
- [ ] CHECKLIST.md (this file)
- [ ] README.md
- [ ] Verify structure by listing created directories

---

## Phase 2 — Database models and server configuration

- [ ] server/src/config/index.js — Joi-validated config loader
- [ ] server/src/config/database.js — Mongoose connection with retry logic
- [ ] server/src/common/errors/ — AppError, NotFoundError, ValidationError, UnauthorizedError
- [ ] server/src/common/middleware/errorHandler.js
- [ ] server/src/common/middleware/notFound.js
- [ ] server/src/common/middleware/authenticate.js
- [ ] server/src/common/middleware/authorize.js
- [ ] server/src/common/utils/logger.js (Winston)
- [ ] server/src/common/utils/asyncHandler.js
- [ ] server/src/common/constants/roles.js, stages.js, industries.js
- [ ] Mongoose models: User, Startup, Investor, Match, PipelineItem, Activity, CopilotAnalysis, AuditLog
- [ ] server/src/app.js — Express app with all middleware
- [ ] server/src/server.js — graceful startup and shutdown
- [ ] server/src/database/indexes.js — all compound indexes
- [ ] server/src/database/seed.js — realistic demo data
- [ ] Health check endpoint GET /health
- [ ] Unit tests for models and config

---

## Phase 3 — Authentication system

- [ ] POST /api/v1/auth/register
- [ ] POST /api/v1/auth/login
- [ ] POST /api/v1/auth/logout
- [ ] POST /api/v1/auth/refresh
- [ ] GET /api/v1/auth/verify-email/:token
- [ ] POST /api/v1/auth/forgot-password
- [ ] POST /api/v1/auth/reset-password/:token
- [ ] GET /api/v1/users/me
- [ ] PATCH /api/v1/users/me
- [ ] DELETE /api/v1/users/me
- [ ] Short-lived access token + HttpOnly refresh token rotation
- [ ] Password hashing with bcryptjs (cost factor 12)
- [ ] Rate limiting on auth endpoints
- [ ] Email verification and password reset emails
- [ ] Auth integration tests
- [ ] Authorization middleware tests

---

## Phase 4 — Startup profile module

- [ ] POST /api/v1/startups
- [ ] GET /api/v1/startups/:id
- [ ] PATCH /api/v1/startups/:id
- [ ] DELETE /api/v1/startups/:id
- [ ] Profile completeness calculation
- [ ] Draft save support
- [ ] Input validation
- [ ] Owner-only authorization
- [ ] Startup module tests

---

## Phase 5 — Investor directory and matching engine

- [ ] GET /api/v1/investors — search, filter, sort, paginate
- [ ] GET /api/v1/investors/:id
- [ ] POST /api/v1/matches/compute — trigger match computation
- [ ] GET /api/v1/matches — paginated match list with scores
- [ ] GET /api/v1/matches/:id — match detail with breakdown
- [ ] POST /api/v1/investors/:id/save — save investor
- [ ] DELETE /api/v1/investors/:id/save — unsave investor
- [ ] GET /api/v1/investors/saved — list saved investors
- [ ] Weighted scoring algorithm with per-criterion breakdown
- [ ] Database indexes for investor search queries
- [ ] Matching engine unit tests
- [ ] Investor route integration tests

---

## Phase 6 — AI fundraising copilot

- [ ] POST /api/v1/copilot/analyze — trigger pitch analysis
- [ ] GET /api/v1/copilot/analyses — list analysis versions
- [ ] GET /api/v1/copilot/analyses/:id — analysis detail
- [ ] PATCH /api/v1/copilot/analyses/:id — edit AI output
- [ ] Structured output parsing and validation
- [ ] Provider failure, timeout, and quota handling
- [ ] Analysis versioning
- [ ] AI request audit logging
- [ ] Copilot service unit tests
- [ ] Copilot route integration tests

---

## Phase 7 — Fundraising CRM / Pipeline

- [ ] POST /api/v1/pipeline
- [ ] GET /api/v1/pipeline
- [ ] PATCH /api/v1/pipeline/:id
- [ ] DELETE /api/v1/pipeline/:id
- [ ] POST /api/v1/activities
- [ ] GET /api/v1/activities
- [ ] PATCH /api/v1/activities/:id
- [ ] DELETE /api/v1/activities/:id
- [ ] Duplicate investor prevention in pipeline
- [ ] CSV export endpoint
- [ ] Pipeline stage transitions
- [ ] Pipeline and activities tests

---

## Phase 8 — Analytics and dashboard data

- [ ] GET /api/v1/analytics/overview
- [ ] GET /api/v1/analytics/pipeline
- [ ] GET /api/v1/analytics/activity
- [ ] Aggregation pipelines for dashboard metrics
- [ ] Analytics tests

---

## Phase 9 — React client: auth, onboarding, layout

- [ ] Auth feature: Register, Login, ForgotPassword, ResetPassword, VerifyEmail pages
- [ ] Auth context and protected route component
- [ ] Axios interceptors for token refresh
- [ ] Onboarding multi-step form
- [ ] App layout: sidebar, header, navigation
- [ ] Loading, error, and empty state components
- [ ] Form components with validation
- [ ] Component tests

---

## Phase 10 — React client: core features

- [ ] Startup profile page with edit form
- [ ] Investor directory with search, filter, sort, pagination
- [ ] Match list and match detail with score breakdown
- [ ] Saved investors page
- [ ] CRM pipeline Kanban board
- [ ] Activity log
- [ ] AI copilot page: trigger analysis, view results, edit output
- [ ] Analytics dashboard with charts
- [ ] All loading/error/empty states
- [ ] Accessible keyboard navigation
- [ ] Responsive layouts

---

## Phase 11 — End-to-end tests and integration verification

- [ ] E2E: register → verify email → login
- [ ] E2E: complete startup profile
- [ ] E2E: discover and save investors
- [ ] E2E: run AI copilot analysis
- [ ] E2E: add investor to pipeline, log activity
- [ ] E2E: view dashboard analytics
- [ ] E2E: export CSV
- [ ] All E2E tests passing

---

## Phase 12 — Production readiness and deployment

- [ ] client/Dockerfile and server/Dockerfile verified
- [ ] compose.yaml tested locally (docker compose up)
- [ ] client/nginx.conf serving SPA with correct headers
- [ ] Health check endpoint verified in container
- [ ] Graceful shutdown tested
- [ ] Environment variable validation at startup
- [ ] CI pipeline passing on GitHub Actions
- [ ] README quick start verified on clean machine
- [ ] Security headers verified with curl
- [ ] Rate limiting verified
- [ ] All Phase 1–11 checklist items checked
