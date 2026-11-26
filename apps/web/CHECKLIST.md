# iKeen Web Workspace — Phase Verification Checklist

This checklist is the canonical per-phase sign-off ledger for `apps/web`. Every phase must pass its **Validation Framework Gates** before advancing to the next phase.

> **Fast Dev Policy**: `next build` is intentionally **skipped** during active phase development to keep iteration fast. Full production builds run only at milestone/release sign-off.

---

## Standard Validation Framework (Applied to Every Phase)

1. **Strict Type Safety**: `bun run --filter=@repo/web check-types` (+ `bun run --filter=@repo/api check-types` when API is touched) — **0 errors**, no `any` escapes.
2. **Runtime Schema & DTO Validation**:
   - **Backend (`apps/api`)**: `class-validator` + `class-transformer` DTOs with explicit `null` handling (`@ValidateIf((_, v) => v !== null)`).
   - **Frontend (`apps/web`)**: Zod v4 response/input schemas in `lib/api/schemas.ts` validating API payloads & form inputs at boundaries.
3. **Automated Tests**:
   - **Backend (`apps/api`)**: `bun --filter=@repo/api run test` (Vitest) covering new endpoints, ownership checks, edge cases, and codecs.
   - **Frontend (`apps/web`)**: `bun --filter=@repo/web run test` (`bun test`) covering Zod schemas, API module contracts, query key factories, and pure domain helpers.
4. **Lint Hygiene**: `bun run --filter=@repo/web lint` (and `bun run --filter=@repo/api lint` when API is touched) — **0 errors**.
5. **UI Hygiene & Cleanliness** (UI phases): Zero engine trivia, zero dummy/unwired toggles, existing shadcn/Base UI primitives reused.
6. **Phase Commit Gate**: Update this checklist + `.agents/plans/web-workspace-redesign.md`, then conclude the phase with a dedicated conventional git commit (`feat(web): phase <N> - <summary>`).

---

## Phase 0 — Architecture Foundation, Route Groups & Legacy Quarantine

- [x] Wired `@repo/types` and `@repo/utils` into `apps/web/package.json` & `next.config.ts` (`transpilePackages`)
- [x] Added redirects in `next.config.ts` (`/dashboard`, `/dashboard/:path*`, `/mcp` → `/legacy/*`)
- [x] Decoupled `AuthDialog` & `UserMenu` into `lib/stores/auth-ui-store.ts` (removed auth state from legacy `keys-store.ts`)
- [x] Renamed `lib/api/auth-api.ts` → `lib/api/auth.api.ts`
- [x] Quarantined legacy API modules (`lib/api/legacy/*`), components (`components/legacy/dashboard/*`), and routes (`app/(legacy)/legacy/{dashboard,mcp}/*`)
- [x] Created `app/(legacy)/legacy/layout.tsx` and rewrote all internal legacy links to `/legacy/*`
- [x] Stripped global header/footer from root `app/layout.tsx`
- [x] Established `app/(public)/` and `app/(workspace)/app/` route groups
- [x] Removed unused `app/api/users/route.ts` and updated `sitemap.ts` & `robots.ts`
- [x] **Gate — Types**: `bun run --filter=@repo/web check-types` (0 errors)
- [x] **Gate — Lint**: `bun run --filter=@repo/web lint` (0 errors)
- [x] **Gate — Build** *(baseline verification)*: `bun run --filter=@repo/web build` (19/19 routes generated)
- [ ] **Gate — Git Commit**: `feat(web): phase 0 - route groups, legacy quarantine, and auth ui decoupling`

---

## Phase 1 — Backend REST Block Endpoints (`apps/api`) & Web API Layer (`lib/api/*.api.ts`)

- [ ] **API DTOs & Validation**: `ListNotesQueryDto`, `UpsertBlockDto`, `ReorderBlocksDto` with strict `class-validator` rules
- [ ] **API Endpoints**:
  - [ ] `GET /api/v1/notes` supports `folderId`, `pinnedOnly`, `archivedOnly`, `includeArchived`
  - [ ] `GET /api/v1/notes/:id` returns `NoteDetail` with active ordered unpacked `blocks: NoteBlock[]`
  - [ ] `PUT /api/v1/notes/:id/blocks/:blockId` upserts block via `packServerBlockContent` + ownership check + bumps `note.updatedAt`
  - [ ] `DELETE /api/v1/notes/:id/blocks/:blockId` soft-deletes block (`deletedAt`, `version++`) + bumps `note.updatedAt`
  - [ ] `PATCH /api/v1/notes/:id/blocks/reorder` updates positions transactionally + bumps `note.updatedAt`
- [ ] **Web Validation & API Layer**:
  - [ ] Add `"test": "bun test"` script to `apps/web/package.json`
  - [ ] `apps/web/lib/api/schemas.ts` (Zod v4 schemas for `Note`, `NoteDetail`, `NoteBlock`, `Folder`, `AuthResponse`, request inputs)
  - [ ] `apps/web/lib/api/auth.api.ts` (`authKeys`, `useProfile`, `useLogin`, `useRegister`)
  - [ ] `apps/web/lib/api/notes.api.ts` (`noteKeys`, `useNotes`, `useNote`, `useCreateNote`, `useUpdateNote`, `useDeleteNote`)
  - [ ] `apps/web/lib/api/blocks.api.ts` (`useUpsertBlock`, `useDeleteBlock`, `useReorderBlocks`)
  - [ ] `apps/web/lib/api/folders.api.ts` (`folderKeys`, `useFolders`, `useFolder`, `useCreateFolder`, `useUpdateFolder`, `useDeleteFolder`)
- [ ] **Gate — API Tests**: `bun --filter=@repo/api run test` (all notes/blocks unit tests pass)
- [ ] **Gate — Web Tests**: `bun --filter=@repo/web run test` (Zod schema + API contract + query key tests pass)
- [ ] **Gate — Types**: `bun run --filter=@repo/api check-types` & `bun run --filter=@repo/web check-types` (0 errors)
- [ ] **Gate — Lint**: `bun run --filter=@repo/api lint` & `bun run --filter=@repo/web lint` (0 errors)
- [ ] **Gate — Git Commit**: `feat(api,web): phase 1 - rest block endpoints and server-first tanstack api layer`

---

## Phase 2 — Public Platform & Marketing Landing Page (`app/(public)/*`)

- [ ] `PublicHeader` (static) & `PublicFooter` (4-column) in `app/(public)/layout.tsx`
- [ ] Landing page sections following `sir.studio/capture` flow (`Hero`, `Friction`, `Platforms Bento`, `Ways In`, `Ecosystem Sync`, `Trust Pillars`, `FAQ`, `Agents/MCP Callout`, `Closing CTA`)
- [ ] Consistent public styling on `/download`, `/privacy`, `/delete-account`
- [ ] **Gate — Types, Lint & Tests**: `check-types`, `lint`, `test` (0 errors)
- [ ] **Gate — Visual Check**: Desktop (`1440px`) & Mobile (`390px`) responsive verification
- [ ] **Gate — Git Commit**: `feat(web): phase 2 - redesign public marketing platform and landing page`

---

## Phase 3 — Core `/app` Workspace Shell, Notes & Folders (`app/(workspace)/app/*`)

- [ ] `WorkspaceShell`, `WorkspaceSidebar`, `WorkspaceAuthGate`, `lib/stores/workspace-store.ts`
- [ ] Routes: `/app` → `/app/notes`, `/app/notes/[id]`, `/app/pinned`, `/app/archive`, `/app/folders`, `/app/folders/[id]`
- [ ] `NoteEditor` + `BlockCanvas` (`TextBlock` Markdown edit/preview commit-on-blur, `ListBlock` checkbox/bullet/ordered, reorder, delete)
- [ ] **Gate — Types, Lint & Tests**: `check-types`, `lint`, `test` (0 errors)
- [ ] **Gate — Manual E2E**: Sign in → Folder CRUD → Note + Block CRUD → Reload persistence
- [ ] **Gate — Git Commit**: `feat(web): phase 3 - core /app notes and folders workspace`

---

## Phase 4 — Scratchpad, Media Blocks & Workspace Polish

- [ ] `/app/scratchpad` cross-device scratchpad (`SCRATCHPAD_TAG` from `@repo/utils`)
- [ ] `lib/api/media.api.ts` + `MediaBlock` renderer & upload (`POST /api/v1/media/upload`)
- [ ] Keyboard ergonomics (`⌘K` quick switcher, `⌘N` new note) & optimistic pin/checkbox toggles
- [ ] **Gate — Types, Lint & Tests**: `check-types`, `lint`, `test` (0 errors)
- [ ] **Gate — Git Commit**: `feat(web): phase 4 - scratchpad, media blocks, and workspace polish`

---

## Phase 5 — Trash/Restore & Future Integration Readiness (Post-MVP)

- [ ] `apps/api`: `GET /notes/trash`, `POST /notes/:id/restore`, `DELETE /notes/:id/permanent`
- [ ] `apps/web`: `/app/trash` route + hooks
- [ ] **Gate — API & Web Tests, Types, Lint**: 0 errors
- [ ] **Gate — Final Release Build**: `bun run --filter=@repo/web build`
- [ ] **Gate — Git Commit**: `feat(api,web): phase 5 - trash recovery and workspace finalization`
