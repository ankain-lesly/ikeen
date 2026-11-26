# iKeen Web Workspace Redesign & Architecture Plan

> **Status**: All Phases (0–5) Complete  
> **Scope**: `apps/web` (Next.js 16.3.4 App Router, React 19, Tailwind CSS v4, shadcn `base-nova`, TanStack Query v5, Zustand v5) + structured REST block/notes endpoints in `apps/api` (NestJS + Prisma + Vitest).  
> **Dedicated App Checklist**: [apps/web/CHECKLIST.md](../../apps/web/CHECKLIST.md)

## Phase Progress Tracker

| Phase | Name | Status | Commit(s) | Primary Validation Gates (No-Build Fast Loop) |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 0** | Architecture Foundation, Route Groups & Legacy Quarantine | `DONE` | `fcb6baf` | `web check-types`, `web lint`, `web build` (baseline), commit |
| **Phase 1** | Backend REST Block Endpoints & Web API Layer (`lib/api/*.api.ts`) | `DONE` | `8fc183b` | `api test` (Vitest), `web test` (Bun), `api/web check-types`, `api/web lint`, commit |
| **Phase 2** | Public Platform & Marketing Landing Page (`sir.studio/capture` flow) | `DONE` | `796b32f`, `9627182` | `web check-types`, `web lint`, `web test`, responsive visual audit, commit |
| **Phase 3** | Core `/app` Workspace Shell, Notes & Folders | `DONE` | `e6fba68`, `a55cebd` | `web check-types`, `web lint`, `web test`, E2E CRUD + reload check, commit |
| **Phase 4** | Scratchpad (`/app/scratchpad`), Media Blocks & Workspace Polish | `DONE` | `4e92a84`, `bd717cd` | `web check-types`, `web lint`, `web test`, cross-device scratchpad + media check, commit |
| **Phase 5** | Trash/Restore & Future Integration Readiness (Post-MVP) | `DONE` | `f75d155`, `ed632c6` | `api test` (20/20), `web test` (12/12), `api/web check-types`, `api/web lint`, `web build` |
| **Deploy** | Vercel Monorepo Bun Config & Live Preview Verification | `DONE` | `ae47ad9` | Vercel `dpl_3MZsVKZMpeWtFKUE6nsri9VWhQ5E` (`READY`, 25/25 routes) |

---

## Phase Validation Framework & Workflow

Every phase follows a strict, repeatable 6-step workflow before moving forward:

1. **Strict Type Checking (Zero `any`)**:
   - Web: `bun run --filter=@repo/web check-types` (`next typegen && tsc --noEmit`)
   - API (when touched): `bun run --filter=@repo/api check-types` (`tsc --noEmit`)
2. **Runtime Boundary Validation**:
   - **Backend (`apps/api`)**: Every REST query/body uses `class-validator` + `class-transformer` DTOs with explicit `null` handling (`@ValidateIf((_, v) => v !== null)`).
   - **Frontend (`apps/web`)**: Every API request/response boundary is validated with **Zod v4** schemas in `apps/web/lib/api/schemas.ts`, guaranteeing runtime safety against API drift.
3. **Automated Test Suite (Required per Phase)**:
   - **Backend**: `bun --filter=@repo/api run test` (Vitest) — unit tests for every new service method, DTO transformation, ownership guard, and codec round-trip.
   - **Frontend**: `bun --filter=@repo/web run test` (`bun test`) — unit tests for Zod schemas, Axios API wrappers (mocked client), TanStack Query key factories, and pure workspace/block state helpers.
4. **Lint Gate**:
   - `bun run --filter=@repo/web lint` (0 errors) and `bun run --filter=@repo/api lint` (when API is touched).
5. **Fast Dev Loop (Skip `next build`)**:
   - Do **not** run `next build` at the end of intermediate phases (1–4) to keep iteration fast and avoid font/network stalls. Reserve `next build` for final Phase 5 / release sign-off.
6. **Checklist Sign-Off & Git Commit Gate**:
   - Tick all completed items in both `apps/web/CHECKLIST.md` and this plan file.
   - Conclude each phase with a dedicated conventional commit (e.g., `feat(api,web): phase 1 - ...`). Per repository git invariants (`AGENTS.md` §7), present the exact commit command or confirm before staging/committing.

---

## Core Architectural Invariants

1. **No Web Local-First**: Every workspace read/write goes through `apps/web/lib/api/<entity>.api.ts` (typed Axios client + Zod validation + TanStack Query v5 hooks). No IndexedDB, SQLite, or sync outbox on web.
2. **Next.js Route Groups**:
   - `app/(public)/` — Public marketing & legal routes (`/`, `/download`, `/privacy`, `/delete-account`).
   - `app/(workspace)/app/` — Official authenticated notes workspace (`/app/*`). **Zero Developer Dashboard or MCP integration in `/app` yet.**
   - `app/(legacy)/legacy/` — Quarantined legacy Developer Dashboard & MCP showcase (`/legacy/dashboard/*`, `/legacy/mcp`).
3. **Auth Entry**: Retain the `AuthDialog` Sheet via `lib/stores/auth-ui-store.ts`.
4. **Cross-Device Parity**: Web edits `NoteBlock` records (text, list, media) via REST endpoints backed by `block-content.codec.ts` and soft-delete tombstones.

---

## Phase 0 — Architecture Foundation, Route Groups & Legacy Quarantine (`DONE`)

- [x] **0.1** Wired `@repo/types` and `@repo/utils` into `apps/web/package.json` & `apps/web/next.config.ts` (`transpilePackages` + `/dashboard*` and `/mcp` redirects).
- [x] **0.2** Created `lib/stores/auth-ui-store.ts`, moved `keys-store.ts` → `lib/stores/legacy/keys-store.ts`, renamed `auth-api.ts` → `auth.api.ts`, updated `auth-dialog.tsx` & `user-menu.tsx`.
- [x] **0.3** Quarantined legacy API modules (`lib/api/legacy/`), components (`components/legacy/dashboard/`), and routes (`app/(legacy)/legacy/{dashboard,mcp}/`); added `app/(legacy)/legacy/layout.tsx`; rewrote all internal links to `/legacy/*`.
- [x] **0.4** Stripped `<header>`/`<footer>` from root `app/layout.tsx`; established `app/(public)/` and `app/(workspace)/app/` route groups.
- [x] **0.5** Deleted `app/api/users/route.ts` and old empty directories; updated `sitemap.ts` & `robots.ts`.
- [x] **0.6** Verification passed: `check-types` (0 errors), `lint` (0 errors, fixed 3 pre-existing `any` types in `audit-api.ts`), and baseline `build` (19/19 routes).

---

## Detailed Execution Plan — Phase 1: Backend REST Block Endpoints & Web API Layer

**Objective**: Deliver strictly validated, unit-tested REST endpoints for Notes + NoteBlocks in `apps/api`, and build the complete server-first TanStack Query v5 + Zod v4 API layer in `apps/web/lib/api/`.

### Step 1.1 — Backend DTOs (`apps/api/src/modules/notes/dto/`)
- [ ] **Create `list-notes-query.dto.ts`**:
  ```ts
  export class ListNotesQueryDto {
    @IsString() @IsOptional()
    folderId?: string;

    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean() @IsOptional()
    pinnedOnly?: boolean;

    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean() @IsOptional()
    archivedOnly?: boolean;

    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean() @IsOptional()
    includeArchived?: boolean;
  }
  ```
- [ ] **Create `upsert-block.dto.ts`**:
  ```ts
  export class UpsertBlockDto {
    @IsIn(['text', 'list', 'media'])
    type: 'text' | 'list' | 'media';

    @IsNumber() @Min(0) @IsOptional()
    position?: number;

    @IsOptional()
    content?: unknown;

    @IsIn(['checkbox', 'bullet', 'ordered'])
    @IsOptional()
    listType?: 'checkbox' | 'bullet' | 'ordered';

    @ValidateIf((_, v) => v !== null)
    @IsString() @IsOptional()
    header?: string | null;

    @ValidateIf((_, v) => v !== null)
    @IsString() @IsOptional()
    footer?: string | null;
  }
  ```
- [ ] **Create `reorder-blocks.dto.ts`**:
  ```ts
  export class ReorderBlocksDto {
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    blockIds: string[];
  }
  ```

### Step 1.2 — Backend Service & Controller (`apps/api/src/modules/notes/`)
- [ ] **Update `notes.service.ts`**:
  - `findAll(userId, query?: ListNotesQueryDto)`:
    - Always filters `{ userId, deletedAt: null }`.
    - Applies `folderId` if provided.
    - If `archivedOnly` → `isArchived: true`. Else if `!includeArchived` → `isArchived: false`.
    - If `pinnedOnly` → `isPinned: true`.
    - Orders by `[{ isPinned: 'desc' }, { updatedAt: 'desc' }]`.
  - `findOne(userId, id)`:
    - Includes `blocks: { where: { deletedAt: null }, orderBy: { position: 'asc' } }`.
    - Maps each block through `unpackServerNoteBlock` and returns `{ ...note, blocks }`.
  - `create(userId, dto)`: returns `{ ...created, blocks: [] }` for consistent `NoteDetail` shape.
  - `upsertBlock(userId, noteId, blockId, dto)`:
    - Verifies parent note ownership (`findOne` or `findFirst({ id: noteId, userId, deletedAt: null })` → `NotFoundException`).
    - Looks up existing block by `id: blockId`. If existing belongs to another note → `NotFoundException`.
    - Packs content via `packServerBlockContent(dto.type, dto, existing?.content)`.
    - Creates or updates `noteBlock` (clearing `deletedAt: null`, incrementing `version`, assigning `position` = `dto.position ?? existing?.position ?? count`).
    - Bumps parent `note.updatedAt` in the same transaction.
    - Returns `unpackServerNoteBlock(saved)`.
  - `softDeleteBlock(userId, noteId, blockId)`:
    - Verifies parent note ownership + block belongs to `noteId` (`NotFoundException` otherwise).
    - Stamps `deletedAt: now`, `version: { increment: 1 }`, bumps parent `note.updatedAt`.
    - Returns `{ id: blockId, noteId, deletedAt: now.toISOString() }`.
  - `reorderBlocks(userId, noteId, blockIds)`:
    - Verifies parent note ownership.
    - Updates each matching active block's `position` and increments `version` inside `prisma.$transaction`, bumps parent `note.updatedAt`, and returns active ordered unpacked `NoteBlock[]`.
- [ ] **Update `notes.controller.ts`**:
  - Wire `@Query() query: ListNotesQueryDto` on `GET /notes`.
  - Add `PUT /notes/:id/blocks/:blockId` (`upsertBlock`).
  - Add `DELETE /notes/:id/blocks/:blockId` (`softDeleteBlock`).
  - Add `PATCH /notes/:id/blocks/reorder` (`reorderBlocks`).

### Step 1.3 — Backend Vitest Unit Tests (`apps/api/src/modules/notes/notes.service.spec.ts`)
- [ ] Add unit tests for:
  - `findAll` filtering (`archivedOnly`, `pinnedOnly`, `includeArchived`, default excludes archived).
  - `findOne` returning unpacked active `blocks` in ascending `position` order.
  - `upsertBlock` (creating text block, updating list block with `header: null` clearing, rejecting cross-note/non-existent note with `NotFoundException`).
  - `softDeleteBlock` (tombstone `deletedAt` + version increment + ownership rejection).
  - `reorderBlocks` (transactional position updates + unpacked return).

### Step 1.4 — Web Test Harness & Zod Validation Schemas (`apps/web/`)
- [ ] **Modify `apps/web/package.json`**: Add `"test": "bun test"` script.
- [ ] **Create `apps/web/lib/api/schemas.ts`**:
  - Strict Zod v4 schemas matching `@repo/types` and `apps/api` responses:
    - `listItemSchema`, `mediaItemSchema`, `textBlockSchema`, `listBlockSchema`, `mediaBlockSchema`, `noteBlockSchema` (discriminated union on `type`)
    - `noteSchema`, `noteDetailSchema` (`noteSchema.extend({ blocks: z.array(noteBlockSchema) })`)
    - `folderSchema`
    - `authUserSchema`, `authResponseSchema`
    - Request input schemas: `createNoteInputSchema`, `updateNoteInputSchema`, `upsertBlockInputSchema`, `createFolderInputSchema`, `updateFolderInputSchema`

### Step 1.5 — Web Server-First API & TanStack Query Hooks (`apps/web/lib/api/`)
- [ ] **Upgrade `apps/web/lib/api/auth.api.ts`**:
  - Parse responses via `authResponseSchema` / `authUserSchema`.
  - Export `authKeys`, `useProfile()`, `useLogin()`, `useRegister()`.
  - Update `components/auth/auth-dialog.tsx` to use `useLogin()` & `useRegister()` hooks directly.
- [ ] **Create `apps/web/lib/api/notes.api.ts`**:
  - Export `noteKeys` (`all`, `lists`, `list(filters)`, `details`, `detail(id)`).
  - Export typed + Zod-validated Axios functions (`fetchNotesApi`, `fetchNoteApi`, `createNoteApi`, `updateNoteApi`, `deleteNoteApi`).
  - Export hooks: `useNotes(filters?)`, `useNote(id)`, `useCreateNote()`, `useUpdateNote()`, `useDeleteNote()` with proper cache invalidation & optimistic pin/archive support.
- [ ] **Create `apps/web/lib/api/blocks.api.ts`**:
  - Export typed + Zod-validated Axios functions (`upsertBlockApi`, `deleteBlockApi`, `reorderBlocksApi`).
  - Export hooks: `useUpsertBlock(noteId)`, `useDeleteBlock(noteId)`, `useReorderBlocks(noteId)` updating `noteKeys.detail(noteId)` cleanly.
- [ ] **Create `apps/web/lib/api/folders.api.ts`**:
  - Export `folderKeys` (`all`, `details`, `detail(id)`).
  - Export typed + Zod-validated Axios functions (`fetchFoldersApi`, `fetchFolderApi`, `createFolderApi`, `updateFolderApi`, `deleteFolderApi`).
  - Export hooks: `useFolders()`, `useFolder(id)`, `useCreateFolder()`, `useUpdateFolder()`, `useDeleteFolder()`.

### Step 1.6 — Web Unit Tests (`apps/web/lib/api/__tests__/`)
- [ ] `schemas.test.ts`: Validates all 3 block variants (text/list/media), `NoteDetail`, `Folder`, `null` header/footer clearing, and rejects malformed payloads.
- [ ] `query-keys.test.ts`: Verifies deterministic key hierarchy (`noteKeys`, `folderKeys`, `authKeys`) for cache invalidation.

### Step 1.7 — Phase 1 Verification Gate (No-Build Fast Loop)
- [x] `bun --filter=@repo/api run test` (17/17 notes tests pass)
- [x] `bun --filter=@repo/web run test` (8/8 schema & query-key tests pass)
- [x] `bun run --filter=@repo/api check-types` (0 errors)
- [x] `bun run --filter=@repo/web check-types` (0 errors)
- [x] `bun run --filter=@repo/api lint` (0 errors, 0 warnings)
- [x] `bun run --filter=@repo/web lint` (0 errors)
- [x] Updated `apps/web/CHECKLIST.md` & `.agents/plans/web-workspace-redesign.md` → Phase 1 `DONE`.

---

## Detailed Execution Plan — Phase 2: Public Platform & Marketing Landing Page (`app/(public)/*`)

**Objective**: Redesign the public web experience (`/` and `/download`, `/privacy`, `/delete-account`) following the `https://sir.studio/capture` layout flow, typographic scale, and visual rhythm—adapted cleanly to iKeen's brand, palette, and real multi-platform product (Web Workspace, Android/iOS, Desktop, AI/MCP).

### Step 2.1 — Public Shell (`app/(public)/layout.tsx` & `components/public/`)
- [ ] **Create `components/public/public-header.tsx`**:
  - Static top bar (`max-w-[1120px]`, `py-5 px-6 sm:px-10`, flex row).
  - Left: iKeen mark + bold `Space Grotesk` wordmark (`iKeen`).
  - Center (hidden `< md`): 5 crisp links (`Why iKeen` `#why`, `Platforms` `#platforms`, `How it works` `#how-it-works`, `FAQ` `#faq`, `Download` `/download`).
  - Right: `<UserMenu />` + primary pill CTA (`Open Workspace` → `/app`).
- [ ] **Create `components/public/public-footer.tsx`**:
  - Top hairline rule + 4-column desktop / 2-column mobile grid (`Product`, `Platforms`, `Developers`, `Legal`):
    - **Product**: `Web Workspace` (`/app`), `Why iKeen` (`/#why`), `How it works` (`/#how-it-works`), `FAQ` (`/#faq`)
    - **Platforms**: `Download Apps` (`/download`), `Android & iOS` (`/download#mobile`), `Desktop` (`/download#desktop`)
    - **Developers**: `MCP Showcase` (`/legacy/mcp`), `Developer Dashboard` (`/legacy/dashboard`)
    - **Legal**: `Privacy Policy` (`/privacy`), `Delete Account` (`/delete-account`)
  - Bottom copyright row (`© 2026 iKeen · Built by TechForge`).
- [ ] **Update `app/(public)/layout.tsx`**: Compose `PublicHeader` + `{children}` + `PublicFooter`.

### Step 2.2 — Landing Page Sections (`components/public/landing/` & `app/(public)/page.tsx`)
Structured in the exact `sir.studio/capture` 9-section cadence (omitting fabricated testimonials/blog):
- [ ] **`hero-section.tsx`**:
  - Announcement pill (`New` accent badge + `iKeen Web Workspace is live →` linking to `/app`).
  - Two-tone stacked display H1 (`Write everything.` in primary ink / `Keep it yours.` in muted ink, `clamp(48px, 8.5vw, 96px)`, `font-heading font-bold tracking-tight leading-[0.95]`).
  - Bold sub-headline with accent lead phrase + concise paragraph (`max-w-xl`).
  - Dual pill CTAs: `Open Web Workspace` (`/app`) + `Download Apps` (`/download`).
  - Composite interactive-looking 3-surface workspace preview frame (Desktop Editor, Mobile Scratchpad, Web Notes Index — built with crisp CSS/UI components, zero placeholder stock photos).
- [ ] **`friction-section.tsx`** (`#why`):
  - Full-bleed inverted high-contrast band (`bg-card` / dark contrast surface).
  - Left-aligned two-tone H2 (`The thought is fast.` / `Your tools are slow.`) + intro copy.
  - 3 equal rounded workflow cards: (1) *Without iKeen* (dashed muted border), (2) *Capture in iKeen* (solid primary accent focal card), (3) *Organize when ready* (subtle translucent surface).
- [ ] **`platforms-bento.tsx`** (`#platforms`):
  - Reusable split `.section-head` (two-tone H2 left, concise context right).
  - Asymmetric `1.5fr / 1fr` bento grid (`rounded-3xl` cards): **Web Workspace** (`1.5fr`), **Mobile (Android & iOS)** (`1fr`), **Desktop (Windows / Tauri)** (`1.5fr`), **Cross-Device Sync** (`1fr`).
- [ ] **`ways-in-grid.tsx`** (`#how-it-works`):
  - Split header + clean `3×2` borderless text-first card grid: *Block-Based Editor*, *Checklists & Lists*, *Instant Scratchpad*, *Folders & Pins*, *Media Attachments*, *Fast Search & Keyboard*.
- [ ] **`ecosystem-panel.tsx`**:
  - Rounded full-width panel highlighting real-time multi-device sync across Mobile, Desktop, Web, and AI Agents.
- [ ] **`trust-pillars.tsx`**:
  - Unboxed 3-column text grid directly on canvas (*Your notes, your ownership*, *Native on mobile & desktop, instant on web*, *Zero clutter, built for focus*).
- [ ] **`faq-section.tsx`** (`#faq`):
  - Two-tone H2 (`Questions, answered.`) + native HTML `<details>` / `<summary>` accordion separated by hairlines with rotating `+` icon.
- [ ] **`agents-callout.tsx`** (`#agents`):
  - Distinctive dark monospace/terminal callout panel (`iKeen for agents`) with crisp sharp-cornered console box, copyable MCP config snippet, and link to `/legacy/mcp`.
- [ ] **`closing-cta.tsx`**:
  - Centered brand mark, two-tone H2 (`Think clearly.` / `Keep it yours.`), and `Open Web Workspace` / `Download` pills.

### Step 2.3 — Align Public Utility Pages
- [ ] Polish `app/(public)/download/page.tsx` (`components/public/download-view.tsx`), `app/(public)/privacy/page.tsx`, and `app/(public)/delete-account/page.tsx` with unified container width, typography scale, and back-to-home navigation.

### Step 2.4 — Phase 2 Verification Gate (No-Build Fast Loop)
- [x] `bun run --filter=@repo/web check-types` (0 errors)
- [x] `bun run --filter=@repo/web lint` (0 errors)
- [x] `bun --filter=@repo/web run test` (8/8 pass)
- [x] Updated `apps/web/CHECKLIST.md` & `.agents/plans/web-workspace-redesign.md` → Phase 2 `DONE`.

---

## Detailed Execution Plan — Phase 3: Core `/app` Workspace Shell, Notes & Folders (`app/(workspace)/app/*`)

**Objective**: Build the official authenticated `/app` workspace strictly focused on note & folder operations (zero Dashboard/MCP chrome), backed 100% by `lib/api/{notes,blocks,folders}.api.ts`.

### Step 3.1 — Workspace Store & Shell
- [ ] `lib/stores/workspace-store.ts` (Zustand ephemeral UI state: `searchQuery`, `sortBy`, `sortDirection`, `isMobileNavOpen`).
- [ ] `components/workspace/workspace-sidebar.tsx` & `workspace-shell.tsx`.
- [ ] Wire `app/(workspace)/app/layout.tsx` to `<WorkspaceShell>` and redirect `app/(workspace)/app/page.tsx` → `/app/notes`.

### Step 3.2 — Notes Listing & Filtering
- [ ] `lib/workspace/note-filters.ts` + `__tests__/note-filters.test.ts` (Bun unit tests).
- [ ] `components/workspace/notes/note-card.tsx` & `notes-list-view.tsx`.
- [ ] Routes: `/app/notes`, `/app/pinned`, `/app/archive`.

### Step 3.3 — Folders Management
- [ ] `components/workspace/folders/folder-dialog.tsx`.
- [ ] Routes: `/app/folders` & `/app/folders/[id]`.

### Step 3.4 — Note Editor & Block Canvas
- [ ] `components/workspace/notes/blocks/{text-block,list-block,block-canvas}.tsx`.
- [ ] `components/workspace/notes/note-editor.tsx` & `app/(workspace)/app/notes/[id]/page.tsx`.

### Step 3.5 — Phase 3 Verification Gate (No-Build Fast Loop)
- [ ] `bun --filter=@repo/web run test`
- [ ] `bun run --filter=@repo/web check-types`
- [ ] `bun run --filter=@repo/web lint`
- [ ] Update `apps/web/CHECKLIST.md` & `.agents/plans/web-workspace-redesign.md` → Phase 3 `DONE`.

---

## Upcoming Phases Overview

- **Phase 2**: Public Platform & Marketing Landing Page (`app/(public)/*`) — `sir.studio/capture` structural flow.
- **Phase 3**: Core `/app` Workspace Shell, Notes & Folders (`app/(workspace)/app/*`).
- **Phase 4**: Scratchpad (`/app/scratchpad`), Media Blocks (`lib/api/media.api.ts`) & Workspace Polish.
- **Phase 5**: Trash/Restore & Final Release Build Sign-Off.
