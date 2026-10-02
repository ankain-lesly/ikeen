# Full-Stack Monorepo Starter Template

A production-grade, full-stack TypeScript monorepo combining **Expo (React Native)**, **Next.js 16**, and an **Express Backend**, orchestrated by **Turborepo v2** and powered by **Bun**.

---

## Tech Stack Overview

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Package Manager** | [Bun](https://bun.sh/) `1.3.x` | Blazingly fast package manager, test runner, and runtime |
| **Monorepo Engine** | [Turborepo v2](https://turbo.build/repo) | High-performance build system with remote caching and task orchestration |
| **Mobile** | [Expo SDK 57](https://expo.dev/) | React Native `0.86`, Expo Router v57, React 19, New Architecture |
| **Web** | [Next.js 16.3](https://nextjs.org/) | App Router, Turbopack, React 19, Tailwind CSS v4 |
| **Backend** | [Express 5](https://expressjs.com/) | REST API & serverless handlers, Prisma 7, PostgreSQL |
| **Database** | [Prisma 7](https://www.prisma.io/) | Type-safe ORM with PostgreSQL adapter |
| **Tooling** | TypeScript 5, ESLint 9, Prettier | Unified typing, linting, and formatting rules |

---

## Monorepo Layout

```text
├── apps/
│   ├── mobile/             # Expo SDK 57 / React Native 0.86 / Expo Router
│   ├── web/                # Next.js 16 (App Router + Turbopack + Tailwind v4)
│   └── backend/            # Express 5 API server with Prisma client
│
├── packages/
│   ├── database/           # @repo/db: Prisma schema, migrations, generated client
│   ├── ui/                 # @repo/ui: Shared universal UI components
│   ├── eslint-config/      # @repo/eslint-config: Shared ESLint configurations
│   └── typescript-config/  # @repo/typescript-config: Shared tsconfig base files
│
├── package.json            # Root workspace configuration
├── turbo.json              # Turborepo task pipeline definitions
└── LOCAL_FIRST_GUIDE.md    # Local-first mobile architecture & sync specification
```

---

## Prerequisites

- **[Bun](https://bun.sh/)** `^1.3.0` (required)
- **Node.js** `^20.18.0` or `^22.0.0`
- **PostgreSQL** database (local or cloud instance like Supabase / Neon)
- **Expo CLI / EAS CLI** (optional for mobile builds)

---

## Getting Started

### 1. Clone & Install Dependencies

```bash
git clone <your-repo-url> my-monorepo
cd my-monorepo

# Install all workspace dependencies
bun install
```

### 2. Configure Environment Variables

Create `.env` files in the respective application directories:

```bash
# Backend (apps/backend/.env)
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"
PORT=5000
JWT_SECRET="replace-with-a-long-random-secret"

# Mobile (apps/mobile/.env)
EXPO_PUBLIC_API_URL="http://localhost:5000"

# Web (apps/web/.env.local)
NEXT_PUBLIC_API_URL="http://localhost:5000"
```

### 3. Initialize the Database

Generate Prisma client and run migrations from the root:

```bash
# Push schema changes or run migrations
bun run --filter=@repo/db db:migrate

# Generate Prisma client
bun run --filter=@repo/db db:generate
```

---

## Available Scripts

Run commands from the root using Bun and Turborepo:

### Development

```bash
# Start all applications concurrently
bun run dev

# Start specific applications
bun run dev:mobile          # Starts Expo Metro bundler
bun run dev:web             # Starts Next.js dev server with Turbopack
bun run --filter=ikeen-backend dev # Starts Express backend
```

### Quality & Type Checking

```bash
# Typecheck all apps and packages in parallel
bun run check-types

# Lint all code across the monorepo
bun run lint
```

### Building

```bash
# Build all apps and packages
bun run build

# Build a single target
bun run --filter=web build
bun run --filter=@repo/mobile build
bun run --filter=ikeen-backend build
```

---

## Workspace Package Guidelines

All shared internal packages are scoped under `@repo/*` and live inside `packages/`:

- **Consuming Packages**: Add to `dependencies` using the workspace protocol:
  ```json
  "@repo/db": "workspace:*",
  "@repo/ui": "workspace:*"
  ```
- **Just-In-Time (JIT) Transpilation**: Shared logic packages export raw TypeScript from `src/index.ts`. No internal `dist/` compilation is needed—bundlers (Next.js, Metro, Bun) transpile on the fly.
- **Universal UI Rules**: Shared UI components must keep `react` and `react-native` as `peerDependencies` to avoid duplicate runtime instances.
- **Cross-Platform Isolation**: Never import Node.js APIs (`fs`, `path`) or DOM globals (`window`, `document`) directly into shared packages consumed by mobile.

---

## Adding New Packages or Dependencies

```bash
# Add a third-party package to a specific workspace
bun add <package-name> --filter=@repo/mobile
bun add <package-name> --filter=web
bun add <package-name> --filter=ikeen-backend

# Add an internal workspace package
bun add @repo/ui --filter=@repo/mobile
```

---

## License

MIT
