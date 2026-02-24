# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

All commands run from the `process-optimization-app/` directory.

```bash
npm run dev              # Start dev server (port 3000)
npm run build            # Production build (standalone output)
npm run lint             # ESLint on src/
npm run test             # Vitest unit tests
npm run test -- src/lib/services/__tests__/workflows.test.ts  # Single test file
npm run test -- --watch  # Watch mode
npm run test:coverage    # Coverage report
npm run test:e2e         # Playwright E2E tests
npm run test:e2e:ui      # Playwright with UI
```

## Architecture

### Tech Stack
- **Framework**: Next.js 14 (App Router), React 18, TypeScript (strict mode)
- **Styling**: Tailwind CSS + Shadcn/UI (Radix UI primitives)
- **Backend**: Supabase (Auth, PostgreSQL with RLS, Realtime, Storage)
- **State**: Zustand stores (`lib/stores/`) for client-side state
- **Visualization**: React Flow for workflow diagrams, Recharts for analytics
- **Forms**: React Hook Form + Zod validation
- **Exports**: pptxgenjs (PowerPoint), jsPDF (PDF)

### Path Alias
`@/*` maps to `./src/*` (configured in tsconfig.json and vitest.config.ts).

### Route Groups
- `(auth)` — Minimal layout for login/register/password-reset pages
- `(dashboard)` — Full layout with sidebar, requires authentication

### Service Layer
All database operations go through `lib/services/` functions. These wrap Supabase client calls and throw on errors. API routes and components consume these services — never call Supabase directly from components.

### Supabase Clients
- `lib/supabase/client.ts` — Browser client (client components)
- `lib/supabase/server.ts` — Server client (server components, API routes)
- `lib/supabase/admin.ts` — Service role client (admin operations only)
- `lib/supabase/middleware.ts` — Session refresh middleware

### Zustand Stores
- `authStore` — User auth state (persisted to localStorage)
- `sessionStore` — Active waste walk session
- `workflowStore` — Workflow editor state
- `trainingStore` — Training progress

### Components
- `components/ui/` — Shadcn/UI primitives. **Do not modify directly**; regenerate via Shadcn CLI.
- `components/workflow/` — React Flow-based workflow editor (ProcessMap, FlowNode, SwimlaneManager, etc.)
- `components/future-state/` — Future State Design Studio components (25+ files)
- `components/waste/` — Waste tagging, observation forms, cheat sheet
- `components/layout/` — Sidebar, header, navigation

### API Routes (23 endpoints)
Major groups:
- `/api/workflows/[id]/context/` — Workflow context CRUD and AI generation
- `/api/future-state/` — Studio agents: synthesis, solutions, sequencing, design, step-design, nodes/edges/lanes/versions/annotations
- `/api/export/pptx` — PowerPoint report export
- `/api/observations/sync` — Offline observation sync
- `/api/insights/generate` — AI-powered insights
- `/api/users/invite` — User invitation flow
- `/api/admin/` — Admin user/org management
- `/api/health` — Health check

Rate limiting (`lib/rate-limit.ts`) is applied to expensive endpoints (invites, AI, exports, sync).

### Database

Schema in `supabase/schema.sql`, migrations in `supabase/migrations/`.

**Core tables**: `organizations`, `users`, `processes` (workflows), `process_steps`, `step_connections`, `sessions`, `observations`, `observation_waste_links`, `waste_types`, `training_content`, `training_progress`, `notifications`, `session_insights`

**Workflow context tables**: `workflow_contexts`, `workflow_stakeholders`, `workflow_systems`, `workflow_metrics`

**Future State Studio tables**: `insight_themes`, `solution_cards`, `implementation_waves`, `future_states`, `future_state_nodes`, `future_state_edges`, `step_contexts`, `step_design_versions`, `step_design_options`, `design_assumptions`, `information_flows`, `step_attachments`

RLS enforces multi-tenant isolation via `get_user_org_id()` and `get_user_role()` helper functions. When adding tables, always include RLS policies.

### User Roles
- **admin** — Full access, user management, org settings
- **facilitator** — Create/manage sessions and workflows, view analytics
- **participant** — Join sessions, tag waste, complete training

### Brand Colors (tailwind.config.ts)
- `brand-navy` (#102A43) — Primary dark
- `brand-gold` (#FFC000) — Primary accent
- `brand-emerald` (#219653) — Success
- `brand-charcoal` (#545454) — Text
- `brand-platinum` (#F0F4F8) — Backgrounds

## Conventions

- Use `"use client"` directive for client components
- Follow conventional commits: `feat(scope):`, `fix(scope):`, `docs(scope):`, etc.
- Branch naming: `feature/`, `fix/`, `docs/`, `refactor/`, `test/`
- Prefer interfaces over type aliases for object shapes
- Types live in `src/types/` (main definitions in `index.ts`, ~1200 lines)
- Database schema changes: update `supabase/schema.sql` and add a migration file in `supabase/migrations/`

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
```

Optional (AI features):
```
OPENAI_API_KEY
ANTHROPIC_API_KEY
```

## Testing

- Unit tests: `src/lib/services/__tests__/` using Vitest with jsdom
- E2E tests: `e2e/` using Playwright
- Test setup: `src/test/setup.ts`
- Coverage excludes: `node_modules/`, `src/test/`, `*.d.ts`, `*.config.*`, `types/`
