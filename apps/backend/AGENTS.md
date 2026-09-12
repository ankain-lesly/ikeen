# Backend Application Guidelines (`apps/backend`)

This is the Express backend service for iKeen running on Node/Bun.

## Architecture
- Framework: Express 4.x + TypeScript
- Runtime: Node >=20 / Bun
- Realtime: Socket.io
- Validation: Zod

## Internal Packages & Sharing
- Consume shared validation schemas from `@repo/validation` once extracted.
- Consume database models and client from `@repo/db` once modularized.
- Pure utilities should be consumed from `@repo/utils`.

## Commands
```bash
bun run dev:ts    # Start backend in watch mode via tsx
bun run build     # Build backend (rimraf dist && tsc)
bun run lint      # Run eslint
```

Run lint and typecheck before declaring any task done.
