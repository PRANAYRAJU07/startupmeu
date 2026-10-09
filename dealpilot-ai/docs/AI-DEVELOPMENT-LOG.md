# AI Development Log — DealPilot AI

## Process Overview
This repository was built using Antigravity, fulfilling the Master Build Specification for DealPilot AI. The development process was broken down into 12 discrete phases. 

- Phases 1-3 (Scaffolding, Database, Authentication) were already present.
- Phases 4-12 were systematically planned and implemented sequentially.

### Key Implementation Details
1. **Startup & Investor Modules (Phase 4):**
   - Implemented `Startup` and `Investor` services, models, and controllers.
   - Leveraged `Joi` validation and the existing API routing structure.
   - Wrote unit/integration tests with `vitest` and `mongodb-memory-server`.
   - Fixed timeout issues for downloading MongoDB memory binaries by increasing the Vitest timeout limits.

2. **Deterministic Matching Engine (Phase 5):**
   - Designed the scoring logic according to the explicit prompt weights (Industry 30%, Stage 25%, Ticket Size 20%, Geo 15%, Business Model 10%).
   - Stored calculated snapshot matches securely in the database.

3. **AI Copilot Abstraction (Phase 6):**
   - Created `aiProvider.js` as an abstraction over any underlying LLM provider, providing a deterministic mock for assessment purposes to avoid API billing setup.
   - Evaluated pitches for strengths, weaknesses, and generated mock outreach drafts.

4. **Fundraising Pipeline CRM (Phase 7):**
   - Developed Kanban-oriented deal stages and activities.
   - Added Funnel metrics (conversion rates between stages) and a CSV export endpoint leveraging `json2csv`.

5. **React Client Foundation (Phase 8-12):**
   - Setup global state using `AuthContext` with automatic Axios interceptors for JWT token rotation (refresh token flow).
   - Created UI atoms (Button, Input, Card) based on `tailwind-merge` and `lucide-react`.
   - Implemented an `AppLayout` with a sidebar for authorized users.
   - Connected React Query to `apiClient` to drive the Dashboard, Pitch Analysis Modal, Investor Directory, and Kanban pipeline board.

### Architectural Adherence
- Followed a **Modular Monolith** structure (Express backend, React + Vite frontend).
- Ensured no sensitive data (like password hashes or session metadata) leaks via API.
- Implemented soft/hard deletes appropriately with audit logs.
- Used pagination to prevent massive DB reads in memory.
- Ensured strong typed input via Joi (backend) and Zod (frontend).

*All tests passing. UI build successful.*
