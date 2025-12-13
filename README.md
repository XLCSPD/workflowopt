# Process Optimization Platform

A comprehensive platform for identifying and eliminating waste in digital workflows using Lean methodology. Built with Next.js 14, Supabase, React Flow, and Tailwind CSS.

## Features

- **Training Module**: Video, slides, articles, and quizzes for Lean waste education
- **Workflow Viewer**: Interactive process maps with swimlanes using React Flow
- **Waste Tagging**: Identify and score waste at each process step
- **Session Management**: Collaborative waste walk sessions with real-time updates
- **Analytics Dashboard**: Charts, heatmaps, and AI-generated insights
- **Admin Console**: Manage waste types, training content, and users
- **Export Reports**: PDF, CSV, and PPTX export options

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + Shadcn UI |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime |
| Workflow Viz | React Flow |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| State | Zustand |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
cd process-optimization-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

4. Set up the database:
   - Go to your Supabase project's SQL Editor
   - Run the SQL files in order:
     - `supabase/schema.sql` - Creates tables, RLS policies, and seed waste types
     - `supabase/seed-premier-health.sql` - Seeds the sample Premier Health workflow

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth pages (login, register)
│   ├── (dashboard)/              # Protected dashboard routes
│   │   ├── dashboard/            # Main dashboard
│   │   ├── training/             # Training module
│   │   ├── workflows/            # Workflow library & viewer
│   │   ├── sessions/             # Waste walk sessions
│   │   ├── analytics/            # Analytics dashboard
│   │   └── admin/                # Admin settings
│   └── api/                      # API routes
├── components/
│   ├── ui/                       # Shadcn UI components
│   ├── layout/                   # Layout components
│   ├── workflow/                 # React Flow components
│   ├── waste/                    # Waste tagging components
│   └── analytics/                # Charts & heatmaps
├── lib/
│   ├── supabase/                 # Supabase client & helpers
│   ├── stores/                   # Zustand stores
│   └── utils.ts                  # Utilities
└── types/                        # TypeScript types
```

## Key Features Explained

### Waste Types

The platform includes:
- **DOWNTIME** (Core Lean): Defects, Overproduction, Waiting, Non-utilized Talent, Transportation, Inventory, Motion, Extra Processing
- **Digital Wastes**: Integration Waste, Digital Overproduction, Unused Features, Excess Data, Fragmented Workflows, Digital Waiting

### Priority Scoring

Observations are scored using the formula:
```
Priority = Frequency × Impact × (6 - Ease)
```

Where:
- Frequency: How often the waste occurs (1-5)
- Impact: Severity of the waste (1-5)
- Ease: How easy it is to fix (1-5)

### Heatmap

The process map can display a heatmap overlay showing:
- **Green**: Low priority (1-4)
- **Yellow**: Medium priority (5-9)
- **Orange**: High priority (10-14)
- **Red**: Critical priority (15+)

## Branding

The platform uses Versatex branding colors:
- **Gold** (#FFC000): Primary brand color
- **Charcoal** (#545454): Text and structure
- **Navy** (#102A43): Accent and headers
- **Emerald** (#219653): Success states
- **Platinum** (#F0F4F8): Backgrounds

## License

Private - All rights reserved.
