---
name: package-standards
description: Enforces standards and guidelines for creating internal packages in the Turborepo monorepo.
---

# Turborepo Internal Package Standards

When creating or modifying packages in `packages/*`:

## Architecture & Naming
1. Always prefix packages with `@repo/` (e.g. `@repo/utils`, `@repo/validation`).
2. Internal workspace dependencies must specify `"workspace:*"`.
3. Choose the appropriate archetype:
   - **Just-in-Time (JIT) TypeScript**: For pure logic, types, validation, and shared utilities. Exposes source TS files directly (`main: "./src/index.ts"`, `types: "./src/index.ts"`, `exports` mapping to `.ts` files). No `build` script.
   - **Universal UI**: Component libraries (`@repo/ui`). React and React Native MUST be `peerDependencies` (with `devDependencies` for local typings). Expose granular subpath exports (`./button`, `./card`).
   - **Compiled**: Pre-compiled packages (`@repo/db` with Prisma). Emits to `dist/`, defines `"build": "..."` and `"dev": "... --watch"`. Build outputs must match `turbo.json` (`outputs: ["dist/**"]`).
   - **Tooling**: `@repo/typescript-config`, `@repo/eslint-config`. Static configuration.

## File Anatomy Requirements
- `package.json`: Must have `"type": "module"`, `"private": true`, clean `"exports"`, and `"scripts": { "check-types": "tsc --noEmit" }`.
- `tsconfig.json`: Must extend `@repo/typescript-config/base.json` (or `react-library.json` for React/UI). Must specify `"include": ["src"]` and `"exclude": ["node_modules", "dist"]`.
- `src/index.ts`: Primary entrypoint.
- `README.md`: Short description of purpose.

## Prohibited Patterns
- Never use TypeScript `compilerOptions.paths` inside internal packages. Use relative imports or Node.js subpath imports (`imports: { "#*": "./src/*" }`).
- Never introduce circular dependencies between packages.
- Never add React or React Native as hard `dependencies` in universal libraries.
- Never import application packages (`apps/*`) into internal packages.
- Never declare redundant `build` tasks for JIT packages.

## Verification Checklist
- Run `bun install` after creating or editing package manifests.
- Run `bun run check-types` (`turbo run check-types`) to verify type safety.
- Run `bun run lint` (`turbo run lint`) to ensure lint clean.
