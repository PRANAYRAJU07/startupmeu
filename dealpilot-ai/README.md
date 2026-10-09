# DealPilot AI

> Investor intelligence, startup readiness, and fundraising workflow management.

**Status: In Development** — Phase 1 scaffolding complete.

DealPilot AI helps founders identify relevant investors, understand why they match, improve their fundraising pitch, and manage investor relationships in one place.

---

## Features

### Authentication and security
- Secure registration, login, email verification, and password reset
- Short-lived JWT access tokens + HttpOnly refresh token rotation
- bcryptjs password hashing (cost factor 12), rate limiting, role-based authorization

### Startup workspace
- Full startup profile: industry, stage, location, funding target, traction
- Profile completeness tracking, draft saves, edit history
- Clear distinction between user-provided facts and AI suggestions

### Investor intelligence
- Investor directory with search, filters, sorting, and pagination
- Explainable match scores with per-criterion breakdown
- Save investors, view match history, transparent source attribution

### AI fundraising copilot
- Analyze startup pitch: strengths, weaknesses, risks, missing information
- Prioritized improvement suggestions and investor-specific pitch drafts
- Versioned analysis history, editable AI output
- Graceful handling of provider failures, timeouts, and quotas

### Fundraising CRM
- Kanban pipeline with configurable stages
- Contact log, meeting notes, next actions, follow-up dates
- Activity tracking and outcome recording
- Duplicate prevention, CSV export

### Analytics dashboard
- Pipeline funnel metrics, activity timeline
- Investor reach and match quality trends
- Audit history

---

## Architecture

Modular monolith — React client + Express API server + MongoDB.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full architecture document.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router 6, TanStack Query v5 |
| Forms | React Hook Form, Zod |
| Styling | Tailwind CSS |
| HTTP client | Axios |
| Backend | Express 4 (Node.js 20) |
| Database | MongoDB + Mongoose 8 |
| Authentication | JWT + HttpOnly cookies |
| AI integration | OpenAI API (server-side) |
| Logging | Winston + Morgan |
| Testing | Vitest + Supertest + Testing Library |
| Containerization | Docker + Docker Compose |
| CI | GitHub Actions |
| AI dev tool | Kiro (Kiro IDE) |

---

## Prerequisites

- **Node.js 20+** — [nodejs.org](https://nodejs.org)
- **MongoDB** — local install or [MongoDB Atlas](https://www.mongodb.com/atlas)
- **npm 10+** (included with Node 20)
- **Docker** (optional, for containerized setup)
- **OpenAI API key** (for AI copilot features)

---

## Quick Start

### 1. Clone and install

```bash
git clone <repo-url>
cd dealpilot-ai
npm install
```

### 2. Configure environment variables

```bash
cp server/.env.example server/.env
# Edit server/.env and fill in all required values

cp client/.env.example client/.env
# Edit client/.env if you need a custom API URL
```

### 3. Validate environment

```bash
node scripts/check-env.js
```

### 4. Seed demo data (optional)

```bash
npm run seed
```

### 5. Start development servers

```bash
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:5000
- API health: http://localhost:5000/health

---

## Docker Setup

```bash
# Copy and configure environment
cp server/.env.example server/.env
# Edit server/.env

# Build and start all services
docker compose up --build
```

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start client and server in development mode |
| `npm run build` | Build both client and server |
| `npm run lint` | Lint both workspaces |
| `npm run test` | Run server test suite |
| `npm run seed` | Seed the database with demo data |
| `npm run check` | Run lint + test + build (full CI check) |
| `node scripts/check-env.js` | Validate required environment variables |

---

## Environment Variables

See [server/.env.example](server/.env.example) for all required server variables.
See [client/.env.example](client/.env.example) for client variables.

---

## AI Development

This project uses **Kiro (Kiro IDE)** as the AI development tool. All significant AI-assisted changes are documented in [docs/AI-DEVELOPMENT-LOG.md](docs/AI-DEVELOPMENT-LOG.md).

---

## Project Status

- [x] Phase 1 — Repository scaffolding and project initialization
- [x] Phase 2 — Database models and server configuration
- [x] Phase 3 — Authentication system
- [x] Phase 4 — Startup profile module
- [x] Phase 5 — Investor directory and matching engine
- [x] Phase 6 — AI fundraising copilot
- [x] Phase 7 — Fundraising CRM / Pipeline
- [x] Phase 8 — Analytics and dashboard data
- [x] Phase 9 — React client: auth, onboarding, layout
- [x] Phase 10 — React client: core features
- [x] Phase 11 — End-to-end tests (Backend Integration Tests)
- [x] Phase 12 — Production readiness and deployment

See [CHECKLIST.md](CHECKLIST.md) for the full item-by-item checklist.

## Running Tests

To run the full backend test suite with security and integration checks:
```bash
cd server
npm run test
```

To build the client:
```bash
cd client
npm run build
```
