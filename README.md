# Process Optimization Tool

A comprehensive Lean process improvement and waste walk facilitation platform built with Next.js, Supabase, and React Flow.

## Features

- **Training Modules** - Interactive Lean methodology training with progress tracking
- **Workflow Management** - Visual process mapping with drag-and-drop workflow editor
- **Waste Walk Sessions** - Real-time collaborative waste identification sessions
- **Analytics Dashboard** - Comprehensive waste distribution charts and insights
- **AI-Powered Insights** - Optional OpenAI/Anthropic integration for recommendations
- **Export Reports** - Generate PDF and PowerPoint reports
- **PWA Support** - Offline-capable progressive web app with data sync
- **Role-Based Access** - Admin, Facilitator, and Participant roles
- **Multi-tenant** - Organization-based data isolation

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **UI**: Tailwind CSS, Shadcn/UI, Radix UI
- **Backend**: Supabase (Auth, Database, Realtime)
- **Visualization**: React Flow, Recharts
- **State Management**: Zustand
- **Forms**: React Hook Form, Zod validation

## Quick Start

### Prerequisites

- Node.js 18+ (20 recommended)
- npm or yarn
- Supabase account

### 1. Clone and Install

```bash
git clone <repository-url>
cd process-optimization-app
npm install
```

### 2. Configure Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API
3. Copy your project URL and anon key

### 3. Set Environment Variables

```bash
cp env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Initialize Database

Run the SQL schema in your Supabase SQL Editor:

```bash
# Copy the contents of supabase/schema.sql
# Paste into Supabase SQL Editor and run
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key for admin operations |
| `NEXT_PUBLIC_APP_URL` | Yes | Public URL (for redirects) |
| `OPENAI_API_KEY` | No | OpenAI key for AI insights |
| `ANTHROPIC_API_KEY` | No | Anthropic key for AI insights |

## Database Setup

### Schema

The database schema is defined in `supabase/schema.sql` and includes:

- **organizations** - Multi-tenant organization support
- **users** - User profiles with roles
- **processes** - Workflow definitions
- **process_steps** - Individual workflow steps
- **step_connections** - Flow connections between steps
- **sessions** - Waste walk sessions
- **observations** - Tagged waste observations
- **waste_types** - DOWNTIME + Digital waste definitions
- **training_content** - Training module definitions
- **training_progress** - User training completion
- **notifications** - User notifications
- **session_insights** - AI-generated insights cache

### Seed Data

Sample data including waste types and training content is included in the schema. For additional test data:

```sql
-- Run in Supabase SQL Editor
\i supabase/seed-premier-health.sql
```

## Docker Deployment

### Build and Run

```bash
# Copy production environment
cp env.production.example .env.production
# Edit .env.production with your values

# Build and start
docker-compose up -d --build
```

### Using Pre-built Image

```bash
docker-compose up -d
```

### Health Check

The app exposes a health endpoint at `/api/health`:

```bash
curl http://localhost:3000/api/health
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Protected dashboard pages
│   └── api/               # API routes
├── components/            # React components
│   ├── layout/           # Layout components
│   ├── ui/               # Shadcn UI components
│   └── workflow/         # Workflow editor components
├── lib/                   # Utilities and services
│   ├── services/         # Supabase service functions
│   ├── stores/           # Zustand stores
│   ├── supabase/         # Supabase client configuration
│   └── pwa/              # PWA utilities
└── types/                # TypeScript type definitions
```

## API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/users/invite` | POST | Invite user to organization |
| `/api/insights/generate` | POST | Generate AI insights |
| `/api/export/pptx` | POST | Export session to PowerPoint |
| `/api/observations/sync` | POST | Sync offline observations |

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:coverage
```

## PWA Icons

Generate PWA icons from the base SVG:

```bash
# Install sharp for image generation
npm install sharp --save-dev

# Generate icons
node scripts/generate-icons.js
```

Or use an online tool like [PWA Builder](https://www.pwabuilder.com/imageGenerator).

## Rate Limiting

API routes are rate-limited:

| Endpoint | Limit | Window |
|----------|-------|--------|
| User Invite | 10 | 1 hour |
| AI Insights | 20 | 1 hour |
| PPTX Export | 30 | 1 hour |
| Observation Sync | 60 | 1 hour |

## User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access, user management, settings |
| **Facilitator** | Create/manage sessions, workflows, view analytics |
| **Participant** | Join sessions, tag waste, view training |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

## Support

For support, please contact the development team or open an issue.
