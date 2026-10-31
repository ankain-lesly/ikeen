# Monorepo Architecture & Best Practices

This repository uses **Bun** (`1.3.6`) and **Turborepo v2** (`^2.10.12`) to efficiently orchestrate a multi-platform monorepo:

- **apps/mobile**: Expo SDK 57 / React Native 0.86 / Expo Router v57 (Metro bundler)
- **apps/web**: Next.js 16.3.4 (Turbopack, React 19.2, Tailwind CSS v4)
- **apps/desktop**: Tauri v2 / React 19.2 / Vite / Tailwind CSS v4
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

## 7. Strict Git & Staging Invariants

- **NEVER STAGE OR COMMIT CODE**: Never run `git add`, `git commit`, `git reset`, `git restore --staged`, or any command that modifies the git index (staging area) or commit history unless explicitly and unambiguously requested by the user.
- **PRESERVE USER STAGING STATE**: The user stages changes to track progress. Wiping, resetting, or adding files to the staging area destroys the user's change tracking and is strictly prohibited.
- All agent modifications must remain as unstaged working tree edits for the user to inspect, review, and stage themselves.

---

## 8. Release Requirements & Versioning Standards

All app and package releases must strictly follow [docs/releases/RELEASE_PROCESS.md](docs/releases/RELEASE_PROCESS.md):

- **SemVer Policy**: `MAJOR` (generational/paradigm leap or breaking changes), `MINOR` (new features/backward-compatible tools), `PATCH` (fixes, sync hardening, performance).
- **Synchronized Metadata**: When cutting a release, atomically bump:
  1. `apps/<app>/package.json` (`version`)
  2. `apps/mobile/app.json` (for mobile)
  3. `apps/api/src/modules/sync/app-updates.registry.ts` (`APP_RELEASES[0]`)
  4. `docs/APP_STORE_LISTING.md` (What's New copy)
- **Documentation Gate**: Every release requires a dedicated markdown document under `docs/releases/<app>/v<version>.md` detailing functional highlights, schema diffs, API contracts, and QA verification steps, plus an entry in `docs/releases/<app>/README.md`.
- **Pre-flight Quality Gates**: Release candidates must pass `bun run check-types`, `bun --filter=@repo/api run test`, and production bundle export (`expo export` for mobile) with 0 errors before tagging.
- **Git Tag Convention**: Follow annotated platform tagging (e.g., `git tag -a v2.0.0-mobile -m "..."`). Remember: coding agents NEVER stage, commit, or tag code directly; provide the commands for the user to run.

---

## 9. Feature Discipline & Anti-Bloat Invariants (No Speculative Features)

- **Zero Speculative Features**: Agents must **NEVER** introduce unplanned "nice-to-have" sub-features, speculative toggles, or secondary modes (e.g., unrequested pinning/docking modes, extra view switches, superfluous settings, or speculative UI animations) that are not explicitly documented in `TODO.md`, `FEATURE-CHECKLIST.md`, or requested in the user prompt.
- **Maintain Low Complexity & LoC**: Every extra line of code introduces maintenance debt, cognitive load, and potential regression vectors. Strive for the leanest, most direct implementation that satisfies requirements.
- **Avoid Over-Engineering**: If the specification or user prompt asks for a drawer, build a drawer. Do not build a hybrid dockable/floating/collapsible multi-state system unless explicitly tasked.
- **Feature Triage**: If a potential enhancement or edge-case feature is identified during implementation, document it as a proposed item in `TODO.md` or present it for user approval—never implement it preemptively.

---

## 10. UI & Frontend Architecture: Component-Based Modularization & Existing Primitives

- **Use Existing Primitives & Design Systems**:
  - **Never create UI components or primitives from scratch** when pre-installed design system libraries (e.g. **shadcn UI**, Base UI primitives, Lucide / Phosphor icons, Tailwind CSS v4, React Native core primitives) already provide them.
  - Check `components/ui/` or `@repo/ui` before writing custom modals, buttons, inputs, dropdowns, tooltips, or drawers.
- **Component Self-Encapsulation**:
  - Components must encapsulate and manage their own local UI states (e.g., a Sidebar component manages its own Sheet drawer, trigger button, and open/close state rather than leaking state management into parent layout orchestrators).
  - Parent layouts (e.g., `App.tsx`) should act as high-level orchestrators, composing domain components rather than holding scattered UI flags and low-level DOM logic.
- **State Management Standards (Zustand & Providers)**:
  - For cross-component state that needs to be accessed globally or across non-adjacent panes (e.g. sidebar toggle, search query, modal open states), use **Zustand stores** (`src/stores/` or `src/hooks/use-<domain>.ts`) rather than ad-hoc prop-drilling or giant monolithic React Context trees.
  - When React Context is appropriate (e.g. scoping theme, local forms, or library configurations), keep providers small, focused, and close to their consuming tree.
- **Clean UI Hygiene & Anti-Clutter Invariants**:
  - **Zero "Garbage Badges"**: Never pollute primary layouts, headers, or cards with framework/engine trivia (`v2`, `SQLite indexed`, `Tauri IPC Active`), fake sync pills, or loud status chips.
  - **Single-Responsibility Focus**: Every component must be dedicated solely to its target user feature (e.g., the editor canvas is strictly for writing and previewing notes; developer diagnostics belong in dedicated Settings modals or debug logs).
  - **Typography Over Chrome**: Prefer subtle muted typography, font weights, and spacing over nested borders, boxes, and badge chips.
- **Modular Directory Organization**:
  - Organize app code into clean, domain-driven directories:
    ```
    src/
    ├── components/
    │   ├── layout/       # App-level layout shells (Sidebar, TopBar, Header)
    │   ├── <domain>/     # Domain-specific components (notes, editor, folders)
    │   ├── modals/       # Dialogs, command palettes, settings sheets
    │   └── ui/           # Pre-built design system primitives (shadcn / Base UI)
    ├── hooks/            # Custom hooks and zustand stores
    ├── stores/           # Dedicated domain stores (when separated from hooks)
    └── lib/              # Shared utilities and helpers
    ```

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
