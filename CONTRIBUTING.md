# Contributing to Process Optimization Tool

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- Node.js 18+ (20 recommended)
- npm 9+
- Git
- A Supabase account for development

### Getting Started

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/YOUR_USERNAME/process-optimization-app.git
   cd process-optimization-app
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment**

   ```bash
   cp env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

4. **Start development server**

   ```bash
   npm run dev
   ```

## Code Style

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Prefer interfaces over type aliases for object shapes
- Use explicit return types for functions

### React

- Use functional components with hooks
- Use the `"use client"` directive for client components
- Follow the Next.js App Router conventions
- Keep components small and focused

### Styling

- Use Tailwind CSS for styling
- Follow the existing color scheme (brand-navy, brand-gold, etc.)
- Use Shadcn/UI components when available
- Ensure responsive design (mobile-first)

### File Organization

```
src/
├── app/                    # Pages and API routes
├── components/
│   ├── ui/                # Shadcn components (don't modify)
│   ├── layout/            # Layout components
│   └── [feature]/         # Feature-specific components
├── lib/
│   ├── services/          # Supabase service functions
│   ├── stores/            # Zustand stores
│   └── utils/             # Utility functions
└── types/                 # TypeScript types
```

## Testing

### Running Tests

```bash
# Unit tests
npm run test

# Watch mode
npm run test -- --watch

# Coverage
npm run test:coverage

# E2E tests
npm run test:e2e
```

### Writing Tests

- Write unit tests for service functions
- Write E2E tests for critical user flows
- Use meaningful test descriptions
- Mock external dependencies

## Git Workflow

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/updates

### Commit Messages

Follow conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
- `feat(sessions): add real-time participant updates`
- `fix(auth): resolve login redirect issue`
- `docs(readme): update deployment instructions`

### Pull Requests

1. Create a feature branch from `main`
2. Make your changes
3. Write/update tests
4. Run linting: `npm run lint`
5. Run tests: `npm run test`
6. Submit PR with clear description

## Database Changes

When modifying the database schema:

1. Update `supabase/schema.sql` with your changes
2. Include both the table creation and RLS policies
3. Document any new indexes
4. Update the seed data if needed

## API Development

### Adding New Endpoints

1. Create route in `src/app/api/[endpoint]/route.ts`
2. Add authentication check
3. Consider rate limiting for expensive operations
4. Document in README.md

### Rate Limiting

For resource-intensive endpoints, use the rate limiter:

```typescript
import { rateLimit, generalRateLimit } from "@/lib/rate-limit";

// In your route handler
const result = rateLimit(userId, generalRateLimit);
if (!result.success) {
  return NextResponse.json({ error: "Rate limited" }, { status: 429 });
}
```

## Need Help?

- Check existing issues for similar problems
- Open a new issue with detailed description
- Include steps to reproduce for bugs
- Provide context for feature requests

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Follow project conventions

