# DealPilot AI — Architecture

## System Overview

DealPilot AI is a modular monolith MERN application. The client and server are separate workspaces in a single repository, communicating over a REST API. A single MongoDB Atlas or self-hosted MongoDB instance stores all data. AI features call an external LLM provider (OpenAI or compatible) via a server-side integration, so the API key is never exposed to the browser.

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                         │
│                                                                 │
│  React 18 + React Router 6 + TanStack Query + React Hook Form  │
│  Tailwind CSS + Zod validation + Axios HTTP client             │
└───────────────────────────┬─────────────────────────────────────┘
                            │  HTTPS / REST API (/api/v1)
┌───────────────────────────▼─────────────────────────────────────┐
│                      Express Server                             │
│                                                                 │
│  Auth middleware → Route modules → Service layer → Mongoose    │
│  Helmet + CORS + Rate limiting + JWT + Cookie rotation         │
│  Winston logging + Morgan HTTP logs + Health endpoint          │
└──────────────┬─────────────────────────┬────────────────────────┘
               │                         │
┌──────────────▼──────┐       ┌──────────▼───────────┐
│     MongoDB         │       │   External Services   │
│                     │       │                       │
│  Users              │       │  OpenAI / LLM API     │
│  Startups           │       │  SMTP (Nodemailer)    │
│  Investors          │       │                       │
│  Matches            │       └───────────────────────┘
│  PipelineItems      │
│  Activities         │
│  AuditLogs          │
└─────────────────────┘
```

## Data Flow

### Authentication flow
1. User registers → server hashes password with bcryptjs → stores User document → sends email verification token.
2. User logs in → server verifies password → issues short-lived JWT access token (15 min) + HttpOnly refresh token cookie (7 days).
3. Client stores access token in memory (not localStorage). On 401 responses, client calls `/auth/refresh` → server rotates refresh token → returns new access token.
4. Logout invalidates refresh token in database.

### Investor matching flow
1. Founder completes startup profile → server computes match scores against investor directory.
2. Match score = weighted sum of: industry overlap, stage alignment, geography match, ticket size fit, thesis keyword overlap.
3. Each criterion score is stored alongside the total, enabling explainable breakdown in the UI.
4. Matches are cached in a Matches collection; re-computed on profile update.

### AI copilot flow
1. Founder requests pitch analysis → server bundles startup profile as structured context → calls LLM API with JSON-mode system prompt.
2. Server validates response structure (Zod/Joi) before saving → stores analysis version in database.
3. On provider failure, timeout, or malformed response → server returns graceful error; client shows specific error state.
4. All AI requests are logged with latency, model, token counts, and error codes for audit.

## Database Schema Summary

| Collection      | Key Fields                                                                 |
|-----------------|----------------------------------------------------------------------------|
| users           | email, passwordHash, role, emailVerified, refreshTokens[], deletedAt      |
| startups        | owner (ref User), name, industry, stage, location, fundingGoal, traction  |
| investors       | name, firm, industries[], stages[], geography[], ticketMin, ticketMax     |
| matches         | startup (ref), investor (ref), score, breakdown{}, computedAt             |
| pipelineItems   | startup (ref), investor (ref), stage, notes, nextAction, followUpDate     |
| activities      | startup (ref), investor (ref), type, notes, outcome, occurredAt           |
| copilotAnalyses | startup (ref), version, strengths[], weaknesses[], suggestions[], model   |
| auditLogs       | actor (ref), action, resource, resourceId, metadata{}, timestamp          |

## Security Model

- **Authentication:** JWT access tokens (short-lived, in-memory) + HttpOnly secure refresh token cookies with rotation.
- **Authorization:** Role-based (founder / admin) enforced in middleware. Owners can only access their own resources; middleware checks `req.user._id === resource.owner`.
- **Input validation:** express-validator on all mutating endpoints. Zod schemas on client before submission.
- **Rate limiting:** Global rate limiter (express-rate-limit) + stricter limiter on auth endpoints.
- **Headers:** Helmet sets CSP, HSTS, X-Frame-Options, X-Content-Type-Options.
- **CORS:** Explicit allowlist of origins from `CORS_ORIGINS` env var.
- **Secrets:** All secrets in environment variables; never committed; validated at startup via Joi.
- **AI API key:** Server-side only; never sent to client.
- **Password hashing:** bcryptjs with cost factor 12.
- **Audit log:** Every mutating action on user-owned data creates an auditLog entry.

## Technology Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Frontend framework | React 18 | Mature, wide adoption, large ecosystem |
| Routing | React Router 6 | Standard React routing |
| Server state | TanStack Query v5 | Caching, background refetch, loading/error states |
| Forms | React Hook Form + Zod | Performance, type-safe validation |
| Styling | Tailwind CSS | Utility-first, consistent design system |
| HTTP client | Axios | Interceptors for auth token refresh |
| Backend framework | Express 4 | Minimal, well-understood, easy to test |
| ODM | Mongoose 8 | Schema enforcement, middleware hooks, indexes |
| Auth tokens | JWT + HttpOnly cookies | Industry standard; XSS-resistant refresh token storage |
| Password hashing | bcryptjs | Pure JS, no native bindings, cost factor configurable |
| Logging | Winston + Morgan | Structured logs for production observability |
| AI integration | OpenAI-compatible | Swappable provider; isolated in integrations/ai/ |
| Testing | Vitest + Supertest | Fast, ESM-native, same config for client and server |
| Containerization | Docker + Compose | Reproducible local and deployment environments |
