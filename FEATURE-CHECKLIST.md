# Implementation Checklists

Grouped by todo topic / issue for clearer tracking and context.

> **Date rules (strict):**
> - Every feature / checklist starts on its own dated section. The date in the section header is the day it was **created**.
> - A section may only be updated when continuing the **same** checklist progress.
> - If work resumes on a **different day**, the section header date is updated to that day (the in-progress date) — never silently edited.
> - A brand-new feature always opens a new section with today's date, even if an older section exists.

---

## 📱 Custom Option Sheet Refactor — 2026-10-18
* **Status**: Completed
* **Scope**: Centralize manual bottom sheets and standardize component wrappers across the mobile app.

- [x] Create core `OptionSheet` component (`apps/mobile/src/components/ui/option-sheet.tsx`)
- [x] Refactor `OpenURLSheet` to use `OptionSheet`
- [x] Refactor `NotesEditorToolbarBlocks` to use `OptionSheet`
- [x] Refactor `NotesOptionsDropdown` (Sheet variant) to use `OptionSheet`
- [x] Refactor `MoveToFolderSheet` to use `OptionSheet`
- [x] Run Monorepo Typecheck & Lint verification (`bun run check-types`, `bun run lint`)

---

## 📝 Block-Based Note Editor Experience — 2026-10-18
* **Status**: Completed
* **Scope**: Discrete block entities (`note_blocks`), reactive live queries, outbox synchronization, modular UI components (`TextBlock`, `ListBlock`, `MediaBlock`), drag handles, and mutual exclusivity with deterministic prepend conversion.

- [x] Phase 1: Shared TypeScript interfaces in `@repo/types` (`BlockType`, `ListType`, `ListItem`, `MediaItem`, `NoteBlock`, etc.)
- [x] Phase 1: Drizzle SQLite table `note_blocks` with cascade foreign keys, indices, and updated `sync_outbox` entity enum
- [x] Phase 1: Backend Prisma schema updated with `NoteBlock` model and relations
- [x] Phase 2: Dedicated query module `apps/mobile/src/lib/queries/note-blocks.ts` with `useLiveNoteBlocks`, CRUD operations, atomic `reorderBlocks`, and idempotent `convertNoteContentToBlock`
- [x] Phase 3: Core block UI components:
  - [x] `BlockWrapper` (`block-wrapper.tsx`): GripVertical drag handle, type badge, and block options sheet (move up/down, duplicate, delete)
  - [x] `TextBlock` (`text-block.tsx`): Markdown text input (edit) and `MarkdownBody` (view)
  - [x] `ListBlock` (`list-block.tsx`): Interactive checkboxes, bullets, numbers, enter/backspace item operations, and optional header/footer
  - [x] `MediaBlock` (`media-block.tsx`): `expo-image` rendering, local/sync badge indicators, and fullscreen lightbox preview
- [x] Phase 4: Container & Coordination:
  - [x] `BlockContainer` (`block-container.tsx`): Reactive state via `useLiveNoteBlocks`, automatic conversion of legacy content, reordering handlers
- [x] Phase 5: Editor Wiring:
  - [x] Update `NoteEditor` to mount `BlockContainer`
  - [x] Guarantee note persistence before block instantiation (foreign key integrity)
  - [x] Wire `NoteBottomToolBar` block action sheet to add text, checklist, and media blocks
  - [x] Update `NoteCard` snippet fallback for block-based notes (`note.summary` or "Structured note")
- [x] Phase 6: Sync Pipeline & Schema Alignment — `2026-10-18`:
  - [x] Full-stack `note_blocks` sync pipeline (push mutations & pull deltas)
  - [x] Backend Prisma schema: `NoteBlock` model, `BlockType` enum, and `note_blocks` in `SyncEntity`
  - [x] API DTOs & Service: `BlockChangesDto`, `BlockMutationDto`, and LWW conflict resolution (`upsertBlockWithLww`)
  - [x] Shared Types: Extended `SyncPullResponse` with `note_blocks?: NoteBlock[]`
  - [x] Mobile Sync Manager: Integrated `upsertBlockFromSync` into `pull()` handler
  - [x] Strict Schema Alignment: Purged non-schema `items` property in favor of unified `content`
  - [x] Update checklists and architectural docs

---

## 🛡️ Audit Logging System — 2026-10-18
* **Status**: Completed
* **Scope**: API audit logging, gated mobile/web screens, and admin filtering.

- [x] Backend: Update `JwtStrategy` to include `type` in user selection
- [x] Backend: Create `AdminGuard` for administrative route protection
- [x] Backend: Implement `AuditController` and register in `AuditModule`
- [x] Backend: Implement `AuditService.getLogs` with filtering
- [x] Mobile: Create `AuditScreen` (`apps/mobile/src/app/(tabs)/profile/audit.tsx`)
- [x] Mobile: Update `ProfileScreen` to gate audit log link by `admin` role
- [x] Web: Create `AuditPage` (`apps/web/app/dashboard/audit/page.tsx`)
- [x] Web: Update `dashboard-sidebar.tsx` to gate audit log link by `admin` role
- [x] Run Monorepo Typecheck & Lint verification