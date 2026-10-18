# Monorepo Architecture & Agent Guidelines

This is a multi-application Turborepo powered by **Bun** (`1.3.6`) and **Turborepo v2** (`^2.10.12`). It orchestrates a multi-platform ecosystem:
- `apps/mobile`: Expo SDK 57 / React Native 0.86 / Expo Router v57 (Metro bundler with watchFolders)
- `apps/web`: Next.js 16.3.4 (Turbopack + React 19.2 + Tailwind CSS v4)
- `apps/backend`: Node / Bun backend (Express + Prisma 6+)
- `packages/*`: Shared internal packages (`@repo/*`)

---

## 1. Task & Progress Tracking Standard (IMPORTANT)

- **`TODO.md`**: Contains current issues, high-level requirements, and unorganized ideas. Clean this up by removing implemented features.
- **`TODO.CHECKLIST.md`**: For every feature implemented or in-progress, maintain a detailed checklist here. This ensures `TODO.md` stays clean and focuses on active problems.
- **Workflow**: 
  1. Analyze task from `TODO.md`.
  2. Implement feature.
  3. Update `TODO.CHECKLIST.md` with completion status.
  4. Remove the completed task from `TODO.md`.

---

## 2. Package Naming & Scoping Standard

- **Canonical Scope**: Always use `@repo/<package-name>` for internal packages (e.g. `@repo/ui`, `@repo/validation`, `@repo/db`, `@repo/utils`, `@repo/types`).
- **Workspace Protocol**: In `package.json` files, reference internal dependencies using `"@repo/<package-name>": "workspace:*"` (or `"*"`).
- **Package Placement**: All shared code, utilities, database layers, validation schemas, and reusable UI components **must live in `packages/*`**, never in an application package. Application packages (`apps/*`) must never be imported by other packages.

---

## 3. Package Archetypes & Compilation Strategies

When creating or modifying an internal package, select the exact archetype that fits its purpose:

### Archetype A: Just-in-Time (JIT) TypeScript Packages (Default for logic & data)
- **Target packages**: `@repo/utils`, `@repo/validation`, `@repo/types`, `@repo/auth-shared`, `@repo/api-client`
- **Strategy**: Direct TypeScript source exports (`src/index.ts`). No internal build step or `dist/` folder. Transpilation is handled on-the-fly by consumer bundlers (Turbopack, Next.js, Metro, or native Bun runtime).
- **`package.json` requirements**:
  - `"main": "./src/index.ts"`
  - `"types": "./src/index.ts"`
  - `"exports"` maps directly to `.ts` source files.
  - Scripts: `"check-types": "tsc --noEmit"`, `"lint": "eslint ."`
  - **No `build` script**: Do not add a fake or empty `build` script, as it creates unnecessary overhead in the Turborepo task graph.

### Archetype B: Universal UI & Theme Packages
- **Target packages**: `@repo/ui`, `@repo/theme`, `@repo/assets`
- **Strategy**: Component primitives and styling tokens.
- **Rules**:
  - **Peer Dependencies**: `react`, `react-dom`, and `react-native` (optional) **must always be `peerDependencies`** (paired with `devDependencies` for typing/testing). **Never** declare React or React Native as hard `dependencies`; doing so bundles multiple React runtime instances and breaks React hooks.
  - **Granular Entrypoints**: Expose discrete component entrypoints (`@repo/ui/button`, `@repo/ui/card`, `@repo/theme/colors`) in `exports`. Avoid massive barrel exports (`export * from '...'`) that ruin tree-shaking and bloat mobile/web bundles.
  - **Platform Isolation**: If a component needs platform-specific implementations, use standard file extensions (`.web.tsx` vs `.native.tsx`) or universal primitives (e.g. NativeWind v4 / React Native Web). Never let mobile-only native modules leak into web imports.

### Archetype C: Compiled / Heavy Runtime Packages
- **Target packages**: `@repo/db` (Prisma client & migrations), native or standalone Node-only compiled libraries.
- **Strategy**: Packages that must emit compiled artifacts (`dist/`) before applications can consume them.
- **Requirements**:
  - Scripts must include `"build": "..."` and `"dev": "... --watch"`.
  - `"main": "./dist/index.js"`, `"types": "./dist/index.d.ts"`.
  - In `turbo.json`, the `build` task must capture `"outputs": ["dist/**"]`.

### Archetype D: Tooling & Config Packages
- **Target packages**: `@repo/typescript-config`, `@repo/eslint-config`, `@repo/tailwind-config`
- **Strategy**: Static configuration files (`base.json`, `nextjs.json`, `base.js`). No build steps.

---

## 3. Package Creation Workflow (Step-by-Step)

When instructed to create a new package `packages/<name>`:

1. **Create Directory**: `packages/<name>/src`
2. **Create `package.json`**:
   - Set `"name": "@repo/<name>"`
   - Set `"type": "module"` and `"private": true`
   - Configure `"exports"` for granular entrypoints
   - Add `"scripts"`: at minimum `"check-types": "tsc --noEmit"`
   - Add `"devDependencies"`: `@repo/typescript-config: "*"` and `typescript: "^5"` or `"7.0.2"`
3. **Create `tsconfig.json`**:
   - Extend the shared configuration: `"extends": "@repo/typescript-config/base.json"` (or `react-library.json` for UI)
   - Set `"include": ["src"]` and `"exclude": ["node_modules", "dist"]`
   - **Never add TypeScript `compilerOptions.paths`**; use Node.js subpath imports (`#*`) or clean package exports instead.
4. **Implement Source Code**:
   - Write source code inside `packages/<name>/src/`
   - Ensure clean exports without circular dependencies
5. **Connect Consumers**:
   - In consuming app(s) `apps/<app>/package.json`, add `"@repo/<name>": "workspace:*"`
6. **Register & Verify**:
   - Run `bun install` from the root to refresh the workspace graph and lockfile.
   - Run `bun run check-types` (`turbo run check-types`) to ensure type safety.
   - Run `bun run lint` (`turbo run lint`) to ensure lint clean.

---

## 4. Cross-Platform Guardrails (Expo + Next.js + Server)

1. **No Node APIs in Shared Universal Code**: `node:fs`, `node:path`, `process.env` access should never exist in universal packages consumed by mobile.
2. **No Web DOM Globals in Mobile**: Never reference `window`, `document`, or `localStorage` without feature-detection (`typeof window !== 'undefined'`) or platform file extensions.
3. **Metro Watcher Constraints**: In `apps/mobile/metro.config.js`, Metro watches `packages/` directly. Ensure package directory layouts are clean and free from unnecessary root node_modules traversal.

---

## 5. Essential Commands

```bash
# Package management & setup
bun install                         # Install dependencies and link workspaces
bun add <pkg> --filter=@repo/<name> # Add a dependency to a specific package

# Turborepo tasks (run from root)
bun run check-types                 # Typecheck all packages and apps in parallel
bun run lint                        # Lint all packages and apps
bun run build                       # Build all packages and apps with caching
bun run dev                         # Run dev tasks in parallel
bun run dev:web                     # Run web dev only
bun run dev:mobile                  # Run mobile dev only
```
Always run `check-types` and `lint` before declaring any task complete.
