# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Run unit tests (Vitest)
npm run test

# Run single test file
npm run test -- src/lib/services/__tests__/workflows.test.ts

# Run tests in watch mode
npm run test -- --watch

# Run E2E tests (Playwright)
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Test coverage
npm run test:coverage
```

## Architecture

### Tech Stack
- **Framework**: Next.js 14 with App Router, React 18, TypeScript
- **Styling**: Tailwind CSS with Shadcn/UI components
- **Backend**: Supabase (Auth, PostgreSQL, Realtime)
- **State**: Zustand stores for client-side state
- **Visualization**: React Flow for workflow diagrams, Recharts for analytics
- **Forms**: React Hook Form with Zod validation

### Directory Structure

```
src/
├── app/
│   ├── (auth)/           # Authentication pages (login, register, etc.)
│   ├── (dashboard)/      # Protected pages requiring authentication
│   └── api/              # API route handlers
├── components/
│   ├── ui/               # Shadcn/UI components (don't modify directly)
│   ├── workflow/         # Workflow editor components
│   └── waste/            # Waste tagging components
├── lib/
│   ├── services/         # Supabase data access functions
│   ├── stores/           # Zustand state stores
│   ├── supabase/         # Supabase client configuration
│   └── pwa/              # PWA offline support utilities
└── types/                # TypeScript type definitions
```

### Key Patterns

**Service Layer**: All database operations go through service functions in `lib/services/`. These wrap Supabase client calls and handle error throwing.

**State Management**: Zustand stores in `lib/stores/` manage client-side state:
- `authStore` - User authentication state
- `sessionStore` - Active waste walk session
- `workflowStore` - Workflow editor state
- `trainingStore` - Training progress

**Route Groups**: The App Router uses groups to apply different layouts:
- `(auth)` - Minimal layout for authentication flows
- `(dashboard)` - Full layout with sidebar navigation

**Supabase Clients**:
- `lib/supabase/client.ts` - Browser client for client components
- `lib/supabase/server.ts` - Server client for server components/API routes
- `lib/supabase/admin.ts` - Admin client with service role key

### Database

Schema defined in `supabase/schema.sql`. Key tables:
- `processes` - Workflow definitions
- `process_steps` - Individual workflow steps with positions
- `sessions` - Waste walk sessions
- `observations` - Tagged waste observations with scoring
- `waste_types` - DOWNTIME + digital waste definitions

Uses Row Level Security (RLS) for multi-tenant data isolation. Helper functions `get_user_org_id()` and `get_user_role()` determine access.

### Styling

Brand colors in `tailwind.config.ts`:
- `brand-gold` (#FFC000) - Primary accent
- `brand-navy` (#102A43) - Primary dark
- `brand-emerald` (#219653) - Success states
- `brand-charcoal` (#545454) - Text
- `brand-platinum` (#F0F4F8) - Backgrounds

### User Roles

- **admin** - Full access, user management, organization settings
- **facilitator** - Create/manage sessions and workflows, view analytics
- **participant** - Join sessions, tag waste, complete training

## Testing

Unit tests are in `src/lib/services/__tests__/` using Vitest with jsdom.
E2E tests are in `e2e/` using Playwright.

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
```

Optional for AI features:
```
OPENAI_API_KEY
ANTHROPIC_API_KEY
```
