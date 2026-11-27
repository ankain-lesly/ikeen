# iKeen Cross-Platform Note Sharing System Plan

> **Status**: All Phases (0–4) Complete  
> **Scope**: `@repo/types` (shared contracts), `apps/api` (NestJS + Prisma `NoteShare` + Vitest), `apps/web` (Next.js 16 App Router public reader `/s/[slug]` + workspace Share Dialog + `.well-known`), and `apps/mobile` (Expo Router `/s/[slug]` + Share Sheet + Universal/App Links).  
> **URL Convention**: Canonical `https://<domain>/s/<slug>` · Custom Scheme `ikeen://s/<slug>`

## Phase Progress Tracker

| Phase | Name | Status | Commit(s) | Primary Validation Gates (No-Build Fast Loop) |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 0** | Schema, Shared Types & URL/SEO Foundation | `DONE` | pending | `types check-types`, `api db:validate`, `api check-types`, `api lint`, `web check-types`, `web lint` |
| **Phase 1** | Backend Shares Module (`apps/api/src/modules/shares/`) | `DONE` | pending | `api test` (204/204, 14/14 shares), `api check-types`, `api lint` |
| **Phase 2** | Web Share Dialog & Public SSR Reader (`app/(public)/s/[slug]`) | `DONE` | pending | `web test` (18/18), `web check-types` (0 errors) |
| **Phase 3** | Mobile Share Sheet, Outbox Flush & Native Reader (`app/s/[slug]`) | `DONE` | pending | `mobile check-types` (`tsc --noEmit`, 0 errors), `eslint` (0 errors) |
| **Phase 4** | Universal/App Links (`.well-known` + `app.json`) & Final E2E Sign-Off | `DONE` | pending | `api test` (14/14 shares), `web test` (18/18), `web build` (23/23 routes), `mobile check-types` |

---

## Phase Validation Framework & Workflow

Every phase follows a strict, repeatable 6-step workflow before advancing:

1. **Strict Type Checking (Zero `any`)**:
   - Shared types: `bun run --filter=@repo/types check-types`
   - API (when touched): `bun run --filter=@repo/api check-types` (`tsc --noEmit`)
   - Web (when touched): `bun run --filter=@repo/web check-types` (`next typegen && tsc --noEmit`)
   - Mobile (when touched): `bun run --filter=@repo/mobile check-types`
2. **Runtime Boundary Validation**:
   - **Backend (`apps/api`)**: All share DTOs use `class-validator` + `class-transformer` with explicit `null` handling (`@ValidateIf((_, v) => v !== null)`).
   - **Frontend (`apps/web`)**: Every API request/response boundary is validated with **Zod v4** schemas in `apps/web/lib/api/shares.api.ts` (or `schemas.ts`).
3. **Automated Test Suite (Required per Phase)**:
   - **Backend**: `bun --filter=@repo/api run test` (Vitest) — unit tests for slug generation, ownership guards, locked-folder/trash blocks, passcode unlock, expiry, media URI sanitization, and fork cloning.
   - **Frontend**: `bun --filter=@repo/web run test` (`bun test`) — unit tests for share Zod schemas, query key factories, and pure URL/state helpers.
4. **Lint Gate**:
   - `bun run --filter=@repo/api lint`, `bun run --filter=@repo/web lint`, `bun run --filter=@repo/mobile lint` (0 errors).
5. **Fast Dev Loop (Skip `next build`)**:
   - Reserve `next build` and production bundle verification for Phase 4 sign-off.
6. **Plan Sign-Off & Git Commit Gate**:
   - Tick completed items in this plan file at the end of each phase.
   - Per repository git invariants (`AGENTS.md` §7), never stage or commit directly; present the exact conventional commit command for the user to run.

---

## Core Architectural Invariants

1. **Online-Only Share Control Plane**: Share creation, update, and revocation always hit the REST API directly. Never route share mutations through mobile's `sync_outbox`.
2. **Live-Backed Public Read (v1)**: Public links read live from `Note` + non-deleted `NoteBlock[]`. Edits reflect immediately without snapshot duplication.
3. **Zero Internal Data Leakage**: Public share endpoints must never expose `note.id`, `folderId`, `userId`, `reminders`, `summary`, or `pinCode`. Always return `robots: { index: false, follow: false }` on `/s/[slug]` and disallow `/s/` in `robots.ts`.
4. **Locked Folder & Trash Enforcement**: A note in trash (`deletedAt != null`) or inside a locked folder (`folder.isLocked === true`) cannot be shared, and existing public links immediately return `404` if a shared note is later deleted or moved to a locked folder.
5. **Mobile Pre-Share Consistency**: Mobile must flush pending `sync_outbox` items for the target `noteId` before generating a share link; the backend strips/skips any un-uploaded `file://` media URIs from public payloads.
6. **1:1 Link Model (v1) & Clean v2 Path**: `NoteShare.noteId` is `@unique` in v1 for simple UX and instant revocation. Future multi-user editing belongs in a separate `NoteCollaborator` table.

---

## Detailed Execution Plan — Phase 0: Schema, Shared Types & URL/SEO Foundation (`DONE`)

**Objective**: Establish the shared TypeScript contracts in `@repo/types`, add the `NoteShare` Prisma model and migration in `apps/api`, add the canonical share URL helper in `EnvService`, and block search-engine crawling of `/s/` in `apps/web`.

### Step 0.1 — Shared Domain Types (`packages/types/`)
- [x] **Create `packages/types/src/shares.ts`**:
  - `ShareAccess = 'view' | 'copy'`
  - `NoteShare`: `{ id, noteId, slug, url, isActive, access, hasPassword, expiresAt, viewCount, createdAt, updatedAt }`
  - `CreateNoteShareInput`: `{ access?: ShareAccess; expiresAt?: string | null; password?: string | null }`
  - `UpdateNoteShareInput`: `{ isActive?: boolean; access?: ShareAccess; expiresAt?: string | null; password?: string | null; rotateSlug?: boolean }`
  - `PublicShareAuthor`: `{ firstName: string; username: string }`
  - `PublicSharedNote`: `{ slug, title, tags, updatedAt, author: PublicShareAuthor, blocks: NoteBlock[], access: ShareAccess, canFork: boolean }`
  - `PublicShareLockedResponse`: `{ requiresPassword: true; slug: string }`
  - `UnlockShareResponse`: `{ token: string; expiresIn: number }`
  - `ForkShareResponse`: `{ noteId: string; title: string }`
- [x] **Update `packages/types/src/index.ts`**: Re-export `./shares`.
- [x] **Update `packages/types/package.json`**: Add `"./shares"` subpath export.

### Step 0.2 — Prisma Schema & Migration (`apps/api/prisma/schema.prisma`)
- [x] Add `enum ShareAccess { view copy }`.
- [x] Add `model NoteShare` with `noteId @unique`, `createdById`, `slug @unique @db.VarChar(24)`, `isActive`, `access`, `passwordHash`, `expiresAt`, `viewCount`, `createdAt`, `updatedAt`, relations to `Note` and `User` (`onDelete: Cascade`), and `@@index([slug, isActive])`.
- [x] Add `share NoteShare?` to `model Note` and `noteShares NoteShare[]` to `model User`.
- [x] Run `bun --filter=@repo/api run db:validate` and `bun --filter=@repo/api run db:generate`.
- [x] Generate Prisma SQL migration (`20261126093801_add_note_shares`, `--create-only`).

### Step 0.3 — Canonical Share URL Helper (`apps/api/src/config/env.service.ts`)
- [x] Add `getShareUrl(slug: string): string` returning `` `${this.SITE_URL.replace(/\/$/, '')}/s/${slug}` ``.

### Step 0.4 — Web Crawler & Route Guard (`apps/web/app/robots.ts`)
- [x] Add `"/s/"` to `disallow` in `apps/web/app/robots.ts` so public share links are never indexed by search engines.

### Step 0.5 — Phase 0 Verification Gate
- [x] `bun run --filter=@repo/types check-types` (0 errors)
- [x] `bun --filter=@repo/api run db:validate` (passes)
- [x] `bun run --filter=@repo/api check-types` (0 errors)
- [x] `bun run --filter=@repo/api lint` (0 warnings, 0 errors)
- [x] `bun run --filter=@repo/web check-types` (0 errors)
- [x] `bunx eslint app/robots.ts` in `apps/web` (0 errors)

---

## Detailed Execution Plan — Phase 1: Backend Shares Module (`apps/api/src/modules/shares/`) (`DONE`)

**Objective**: Implement full owner share management, hardened public resolution, passcode unlock, and note forking in NestJS with comprehensive Vitest coverage.

### Step 1.1 — DTOs (`apps/api/src/modules/shares/dto/`)
- [x] `create-share.dto.ts` (`access`, `expiresAt`, `password` with `@ValidateIf((_, v) => v !== null)`).
- [x] `update-share.dto.ts` (`isActive`, `access`, `expiresAt`, `password`, `rotateSlug`).
- [x] `unlock-share.dto.ts` (`password` min 1 / max 128 chars).

### Step 1.2 — Service (`apps/api/src/modules/shares/shares.service.ts`)
- [x] Cryptographic 12-char base62 slug generator (`crypto.randomBytes`) with collision retry (max 3).
- [x] Owner methods (`getShare`, `upsertShare`, `updateShare`, `revokeShare`):
  - Enforce note ownership, `deletedAt === null`, and `!note.folder?.isLocked`.
  - Hash `password` via `bcryptjs` (cost 10); clear `passwordHash` when `password === null`.
  - Support `rotateSlug: true` for instant link invalidation.
- [x] Public methods (`getPublicShare`, `unlockShare`):
  - Validate `isActive`, `expiresAt > now`, `note.deletedAt === null`, `!note.folder?.isLocked`.
  - If `passwordHash` is set, verify optional `X-Share-Token` JWT (`type: 'share_unlock'`, `slug`, `v: updatedAt.getTime()`); otherwise return `401` with `{ requiresPassword: true, slug }`.
  - Unpack blocks via `unpackServerNoteBlock` and strip any `media` items whose `url` lacks `http(s)://` + clear `localUri` and mask `noteId` with `slug`.
  - Project strictly to `PublicSharedNote` and increment `viewCount` atomically.
- [x] Fork method (`forkShare(userId, slug, shareToken?)`):
  - Verify `access === 'copy'` and unlock token if password-protected.
  - Transactionally clone `Note` + active sanitized `NoteBlock[]` into `userId`'s workspace with new UUIDs.

### Step 1.3 — Controller, Rate Limiting & Module Wiring
- [x] `public-share-rate-limit.guard.ts`: per-IP fixed-window rate limiter (60/min reads, 10/min unlock).
- [x] `shares.controller.ts`:
  - `GET /notes/:noteId/share`, `POST /notes/:noteId/share`, `PATCH /notes/:noteId/share`, `DELETE /notes/:noteId/share` (`@UseGuards(JwtAuthGuard)`).
  - `GET /public/shares/:slug`, `POST /public/shares/:slug/unlock` (public, rate-limited).
  - `POST /public/shares/:slug/fork` (`@UseGuards(JwtAuthGuard)`).
- [x] `shares.module.ts`, `PrismaService.noteShare` getter, & register in `apps/api/src/app.module.ts`.

### Step 1.4 — Backend Unit Tests (`shares.service.spec.ts`)
- [x] Owner CRUD, locked-folder/trash rejection, slug rotation, passcode hash/clear, unlock JWT validation, expiry enforcement, `file://` media sanitization, and transactional fork cloning (14/14 passing).

### Step 1.5 — Phase 1 Verification Gate
- [x] `bun --filter=@repo/api run test` (29/29 files, 204/204 tests pass)
- [x] `bun run --filter=@repo/api check-types` (0 errors)
- [x] `bun run --filter=@repo/api lint` (0 warnings, 0 errors)

---

## Detailed Execution Plan — Phase 2: Web Share Dialog & Public SSR Reader (`apps/web`) (`DONE`)

**Objective**: Let web users create/manage share links from the note editor and render clean, fast, read-only public note pages at `/s/[slug]`.

### Step 2.1 — Web API Layer & Zod Schemas (`apps/web/lib/api/shares.api.ts`)
- [x] Zod v4 schemas matching `@repo/types/shares`.
- [x] `shareKeys` factory + hooks: `useNoteShare(noteId)`, `useUpsertShare(noteId)`, `useUpdateShare(noteId)`, `useRevokeShare(noteId)`, `useForkShare()`.
- [x] Server-side fetch helper `fetchPublicShareServer(slug, token?)` for Next.js Server Components.
- [x] Unit tests in `apps/web/lib/api/__tests__/shares.test.ts` (4/4 passing).

### Step 2.2 — Workspace Share Sheet (`apps/web/components/workspace/notes/share-note-sheet.tsx`)
- [x] Built with existing shadcn/Base UI `Sheet` / `Select` / `Input` / `Button` primitives.
- [x] Triggered from `NoteEditor` top bar (blocks sharing with clear notice if note is in a locked folder).
- [x] Controls: Create link, Copy link, Access (`View only` / `Allow copy`), Expiry preset (`Never` / `24h` / `7d` / `30d`), Optional Passcode set/clear, Rotate link, Revoke link.

### Step 2.3 — Public Reader Route (`apps/web/app/(public)/s/[slug]/`)
- [x] `page.tsx`: SSR fetch (`force-dynamic`), `generateMetadata` with `robots: { index: false, follow: false }` and note title (generic title if password-protected).
- [x] `opengraph-image.tsx`: Clean dynamic OG card matching iKeen branding (hides content if passcode-gated).
- [x] `components/public/shared-note-blocks.tsx` & `components/public/shared-note-view.tsx`:
  - Read-only block renderer (text, list, media) without editor chrome.
  - Passcode unlock form (persists scoped unlock token in `sessionStorage` and refetches).
  - Header bar: Author attribution, "Open in App" (`ikeen://s/<slug>`), and "Save Copy" button (forks to `/app/notes/[newId]`, prompting `AuthDialog` if unauthenticated).
  - Clean empty/error states for expired or revoked links.

### Step 2.4 — Phase 2 Verification Gate
- [x] `bun --filter=@repo/web run test` (16/16 tests pass across 4 files)
- [x] `bun run --filter=@repo/web check-types` (`next typegen && tsc --noEmit`, 0 errors)

---

## Detailed Execution Plan — Phase 3: Mobile Share Sheet, Outbox Flush & Native Reader (`apps/mobile`) (`DONE`)

**Objective**: Bring native share link creation and native shared-note viewing to iOS and Android while preserving mobile's offline-first sync invariants.

### Step 3.1 — Mobile Share API & Pre-Share Sync Guard
- [x] `apps/mobile/src/lib/api/shares-api.ts` (typed calls to `/notes/:noteId/share` and `/public/shares/:slug/*`).
- [x] Pre-share helper (`ensureNoteSyncedForShare`): checks `NetInfo` + `sync_outbox` for pending mutations on `noteId` (and its `note_blocks`), flushes via `syncManager.sync()` before `POST /notes/:noteId/share`.
- [x] Backend-only share schema (no Drizzle migration required).

### Step 3.2 — Mobile Share Sheet (`OptionSheet` + `AppSwitch`)
- [x] Built `apps/mobile/src/components/notes/share-note-sheet.tsx` using `OptionSheet` (`@expo/ui` `BottomSheet`) and `AppSwitch` (`@expo/ui` `Switch`) with progressive passcode input.
- [x] Wired Share action in `notes-options-dropdown.tsx` and `note-editor.tsx`.

### Step 3.3 — Native Shared Note Reader (`apps/mobile/src/app/s/[slug].tsx`)
- [x] Handles `ikeen://s/<slug>` and Universal/App Link routing; registered in `apps/mobile/src/app/_layout.tsx`.
- [x] Read-only block rendering (text, list, media), passcode unlock prompt, and "Save Copy" button (forks via API, triggers `syncManager.sync()`, navigates to `/notes/[newId]`).

### Step 3.4 — Phase 3 Verification Gate
- [x] `apps/mobile`: `bun run check-types` (`tsc --noEmit`, 0 errors)

---

## Detailed Execution Plan — Phase 4: Universal/App Links & Final E2E Sign-Off (`DONE`)

**Objective**: Connect `https://<domain>/s/<slug>` seamlessly to the native mobile app on iOS and Android, then run full monorepo verification.

### Step 4.1 — Web `.well-known` Domain Verification (`apps/web/app/.well-known/`)
- [x] Added `apps/web/app/.well-known/apple-app-site-association/route.ts` (`Content-Type: application/json`, env-driven `APPLE_TEAM_ID` + `IOS_BUNDLE_ID`, paths: `["/s/*"]`).
- [x] Added `apps/web/app/.well-known/assetlinks.json/route.ts` (`Content-Type: application/json`, env-driven `ANDROID_PACKAGE_NAME` + `ANDROID_SHA256_CERT_FINGERPRINTS`).

### Step 4.2 — Mobile App Config (`apps/mobile/app.json`)
- [x] Added `ios.bundleIdentifier: "com.techforgelee.ikeen"` and `ios.associatedDomains: ["applinks:ikeen.leslychuo.me"]`.
- [x] Added `android.intentFilters` (`VIEW`, `BROWSABLE`, `DEFAULT`, `autoVerify: true`, `host: "ikeen.leslychuo.me"`, `pathPrefix: "/s/"`).

### Step 4.3 — Final Verification Gate
- [x] `bun run --filter=@repo/types check-types` (0 errors)
- [x] `bun --filter=@repo/api run test src/modules/shares/shares.service.spec.ts` (14/14 pass)
- [x] `bun run --filter=@repo/api check-types` & `lint` (0 errors, 0 warnings)
- [x] `bun --filter=@repo/web run test` (18/18 pass)
- [x] `bun run --filter=@repo/web check-types` (0 errors)
- [x] `bun --filter=@repo/web run build` (23/23 routes built)
- [x] `apps/mobile`: `eslint share-note-sheet.tsx` & `check-types` (0 errors)
