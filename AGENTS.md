# Monorepo Architecture & Best Practices

This repository uses **Bun** (`1.3.6`) and **Turborepo v2** (`^2.10.12`) to efficiently orchestrate a multi-platform monorepo:

- **apps/mobile**: Expo SDK 57 / React Native 0.86 / Expo Router v57 (Metro bundler)
- **apps/web**: Next.js 16.3.4 (Turbopack, React 19.2, Tailwind CSS v4)
- **apps/backend**: Node or Bun backend (Express + Prisma 6+)
- **packages/**: All reusable internal packages (`@repo/*`)

---

## 1. Task Tracking Workflow

- **`TODO.md`**: Central, in-progress requirements and problems. Keep clean by removing completed items.
- **`FEATURE-CHECKLIST.md`**: Detailed checklists per feature or bug; update as you make progress.
- **Recommended workflow:**
  1. Review and triage `TODO.md`.
  2. Implement the feature or fix.
  3. Track granular progress in `FEATURE-CHECKLIST.md`.
  4. Remove resolved tasks from `TODO.md`.

---

## 2. Internal Package Standards

- Always use canonical scope: `@repo/<package-name>` for **every** local package.
- In `package.json`, reference local dependencies as: `"@repo/<package-name>": "workspace:*"` (or just `"*"`).
- All shared code (db, UI, utils, validation, types) **must live in `packages/*`**. Never put shared logic in `apps/*`. Application packages must never be imported by others.

---

## 3. Package Archetypes

**Choose one archetype for each new package:**

### A. JIT TypeScript (Default)
  - For: `@repo/utils`, `@repo/validation`, `@repo/types`, etc.
  - No local build; consumer handles TypeScript transpilation.
  - `package.json`:
    - `"main"` & `"types"`: `./src/index.ts`
    - `"exports"`: Point to `.ts` source files.
    - Scripts: `"check-types": "tsc --noEmit"`, `"lint": "eslint ."`
    - **No `"build"` script.**

### B. Universal UI & Theme
  - For: `@repo/ui`, `@repo/theme`, `@repo/assets`
  - Peer dependencies for: `react`, `react-dom`, `react-native` (never hard dependencies).
  - Use granular `exports` (expose via `@repo/ui/button`, etc.).
  - For platform divergence, use file extensions like `.web.tsx` / `.native.tsx` or universal primitives.
  - Avoid barrel exports to maintain tree-shaking.

### C. Compiled/Heavy (e.g., DB)
  - For: `@repo/db` (Prisma client), native libraries, etc.
  - Requires build output in `dist/` before consumption.
  - Scripts must include: `"build"`, `"dev": "... --watch"`
  - Main exports: `"./dist/index.js"` and `"./dist/index.d.ts"`
  - Register build outputs in `turbo.json` (`"outputs": ["dist/**"]`).

### D. Tooling & Config
  - For: `@repo/typescript-config`, `@repo/eslint-config`, `@repo/tailwind-config`
  - Static config files only; no build step.

---

## 4. Creating a New Internal Package

1. Create `packages/<name>/src/`.
2. Add `package.json`:
   - `"name": "@repo/<name>"`
   - `"type": "module"`, `"private": true`
   - Proper `"exports"`
   - Essential scripts: at least `"check-types": "tsc --noEmit"`
   - `devDependencies`: `@repo/typescript-config: "*"` and `typescript: "^5"` (or current)
3. Add `tsconfig.json`:
   - Extend shared config: `"extends": "@repo/typescript-config/base.json"` (or `react-library.json` for UI)
   - `"include": ["src"]`, `"exclude": ["node_modules", "dist"]`
   - **Never use `compilerOptions.paths`**; leverage Node subpath imports and exports.
4. Write code in `src/`, with clear, uncircular exports.
5. Add to each consuming app’s `package.json`: `"@repo/<name>": "workspace:*"`
6. From monorepo root:
   - `bun install`
   - `bun run check-types`
   - `bun run lint`

---

## 5. Cross-Platform Safety

- **Node APIs**: Never use (`fs`, `path`, `process.env`, etc.) in shared packages meant for mobile/web.
- **Web/DOM APIs**: Never use (`window`, `document`, `localStorage`) on mobile code without safe feature checks.
- **Metro Config**: Ensure `packages/` structure is clean; watch settings in `apps/mobile/metro.config.js` shouldn’t bloat node_modules traversal.

---

## 6. Essential Commands

```bash
# Dependency management
bun install                           # Install and link all workspaces
bun add <pkg> --filter=@repo/<name>   # Add dependency to a specific package

# Turborepo scripts (from root)
bun run check-types                   # Typecheck all apps and packages
bun run lint                          # Lint all apps and packages
bun run build                         # Build everything with caching
bun run dev                           # Run all dev servers
bun run dev:web                       # Web only
bun run dev:mobile                    # Mobile only
```
> **Always run type checks and lints before marking a task complete.**

---

# CLAUDE.md Overview

- **Structure**: See above; `apps/*`, `packages/*`, `plans/`
- **Development**: Use only permitted APIs in universal packages; enforce all package and archetype guidelines.
- **Tracking**: Use `TODO.md` for active items, `FEATURE-CHECKLIST.md` for checklists.
- **PRs/Commits by Claude**: Must follow repository’s attribution rules.
- **Architecture**:
  - Mobile component sources: `apps/mobile/src/components/notes/`
  - Changes to DB schema require updates in both Drizzle (mobile) and Prisma (backend).
  - For major features, consult relevant specifications in `plans/` before coding.
