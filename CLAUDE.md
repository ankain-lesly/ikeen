# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure
- `apps/mobile`: Expo SDK 57 / React Native 0.86 / Expo Router v57 (Metro bundler).
- `apps/web`: Next.js 16.3.4 (Turbopack + React 19.2 + Tailwind CSS v4).
- `apps/backend`: Node / Bun (Express + Prisma 6+).
- `packages/*`: Shared internal packages (`@repo/ui`, `@repo/validation`, `@repo/db`, `@repo/utils`, `@repo/types`).
- `plans/`: Implementation plans (e.g., `audit-logging-implementation.md`, `block-editor-integration.md`).

## Development Commands
- `bun install`: Install dependencies and link workspaces.
- `bun run check-types`: Typecheck all packages and apps in parallel.
- `bun run lint`: Lint all packages and apps.
- `bun run build`: Build all packages and apps.
- `bun run dev`: Run all dev tasks.
- `bun run dev:web`: Run web dev only.
- `bun run dev:mobile`: Run mobile dev only.

## Key Standards
- **Task Tracking**:
  - `TODO.md` for active issues/requirements.
  - `TODO.CHECKLIST.md` for detailed progress tracking per feature.
- **Packages**: 
  - Internal packages must live in `packages/*` and follow the `@repo/` canonical scope.
  - Applications (`apps/*`) must never be imported by other packages.
  - Archetypes (JIT/Universal UI/Compiled/Tooling) must be followed for `package.json` and `tsconfig.json` configurations.
- **Cross-Platform**: Avoid Node APIs (fs, path) in universal packages. Use platform extensions (.web/.native) for UI components.
- **Attribution**: Commits and PRs created by Claude must follow the attribution instructions provided in the system reminders.

## Architectural Notes
- The codebase uses a mono-repo approach with Bun/Turborepo.
- Mobile components live in `apps/mobile/src/components/notes/`.
- Database schema changes require updates across mobile (Drizzle) and backend (Prisma).
- `plans/` contains architectural specifications for significant features; please check them before beginning major implementations.
