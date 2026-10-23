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

---

## 🔄 Note Block Sync Optimization, Integrity & Wrapper Action Injection (Phase 1) — 2026-10-22
* **Status**: Completed
* **Scope**: Zero per-keystroke SQLite/outbox writes (commit on blur & done via `useStagedBlockUpdates`), full parent note & block sync pipeline integrity (parent existence in `createBlock`, server-side block delete, list metadata codecs, strict outbox status failure classification), contextual block action injection into `BlockWrapper` via `useRegisterBlockActions`, and modular editor refactor.

- [x] Commit-on-Blur & Commit-on-Done State Management:
  - [x] Extract `useStagedBlockUpdates` hook (`apps/mobile/src/components/notes/blocks/use-staged-block-updates.ts`) with synchronous `dirtyBlocksRef` and in-memory `dirtyOverlay`
  - [x] Stage typing updates in memory across `TextBlock`, `ListBlock`, and `MediaBlock` captions without per-keystroke SQLite or outbox writes
  - [x] Commit individual block edits on input `onBlur` (`commitBlock`)
  - [x] Immediately persist discrete structural updates (`handleImmediateUpdate`) merging any active staged edits
  - [x] Expose `flushBlocks()` via `BlockContainerHandle` (`BlockContainer`) and await it in `NoteEditor.saveNote()` before switching to view mode, on navigation back (`beforeRemove`), and on app backgrounding (`AppState`)
- [x] Block Sync Pipeline Integrity:
  - [x] Enforce parent note existence directly inside `createBlock(noteId, input)` in `apps/mobile/src/lib/queries/note-blocks.ts`
  - [x] Handle `b.action === 'delete'` in backend `upsertBlockWithLww` (`apps/api/src/modules/notes/notes.service.ts`) with note ownership validation
  - [x] Implement app-local server block content codec (`packServerBlockContent`, `unpackServerNoteBlock`) in `apps/api/src/modules/notes/block-content.codec.ts` with explicit `null` removal semantics
  - [x] Implement mobile block content codec (`unpackNoteBlock`, `serializeBlockContent`, `toBlockOutboxPayload`, `formatNoteWithBlocks`) in `apps/mobile/src/lib/queries/block-content.codec.ts`
  - [x] Add list validation on `BlockChangesDto` in `apps/api/src/modules/sync/dto/sync-push.dto.ts`
  - [x] Two-phase SQLite position re-indexing and outbox enqueueing in `deleteBlock` and `reorderBlocks` to eliminate mid-loop sync race conditions
  - [x] Implement `classifySyncPushFailure(status)` in `outbox.ts`: reset transient / offline (status 0, 401, 403, 408, 429) to `pending` without penalty; increment retry count on 5xx and client rejections
  - [x] Restored `lt(syncOutbox.retryCount, SYNC_CONSTANTS.MAX_RETRIES)` in `getPendingOutbox` to halt poison pills
- [x] Contextual Block Actions in `BlockWrapper`:
  - [x] Create `BlockWrapperContext` and idempotent `useRegisterBlockActions` hook with structural signature check (`block-wrapper.tsx`)
  - [x] Register list-type switching and header/footer actions from `ListBlock` into `BlockWrapper`'s `OptionSheet`
  - [x] Display dynamic block type badge (`LIST • CHECKBOX`, `LIST • BULLET`, `LIST • ORDERED`) when editing
- [x] Clean Architecture & Monorepo Refactor:
  - [x] Centralize `createDefault*BlockInput` and `cloneBlockInput` in `block-factories.ts`
  - [x] Unify block creation boilerplate in `NoteEditor` (`handleAddBlock`)
  - [x] Unify block position shifting in `BlockContainer` (`handleMoveBlock`)
  - [x] Reusable agent skill created in `.agents/skills/ikeen-mobile-patterns/SKILL.md`
  - [x] Verified full monorepo typechecks pass cleanly (`bun run check-types`)

---

## ✅ Interactive List Block Experience (Phase 2) — 2026-10-22
* **Status**: Completed
* **Scope**: Enter-key item creation, Backspace deletion on empty items, multi-line paste parsing & splitting, collapsible Checked Items section with Reanimated transitions, and intra-list item drag-and-drop reordering.

- [x] Enter Key Newline Creation, Backspace Deletion & Multi-Line Paste Splitting:
  - [x] Extend `MarkdownEditor` (`apps/mobile/src/components/markdown/markdown.tsx`) with `singleLine` and `onKeyPress` support while preserving `\n` detection before resetting `internalValue`
  - [x] Implement pure list manipulation helpers (`parsePastedListLine`, `applyItemTextOrSplit`, `removeEmptyItemOnBackspace`, `reorderListGroup`) in `apps/mobile/src/components/notes/blocks/list-block.utils.ts`
  - [x] Support `Enter` newline splitting and multi-line paste into discrete `ListItem`s with automatic prefix stripping (`- [ ]`, `- [x]`, `* `, `• `, `1. `) and focus propagation
  - [x] Support `Backspace` on empty items to remove the item and focus the previous item within the same group
- [x] Checked Items Section & Slide Animation:
  - [x] Partition `checkbox` list items into `activeItems` and `checkedItems` while keeping `bullet` and `number` list items in a single list
  - [x] Add collapsible `Checked (N)` section in `ListBlock` (`apps/mobile/src/components/notes/blocks/list-block.tsx`) with animated chevron and Reanimated `LinearTransition`, `FadeInDown`, and `FadeOutUp`
- [x] Intra-List Item Reordering:
  - [x] Extract memoized `ListItemRow` (`apps/mobile/src/components/notes/blocks/list-item-row.tsx`) with `GripVertical` drag handle and `Gesture.Pan()` via `scheduleOnRN` (`react-native-worklets`)
  - [x] Persist structural item mutations (`Enter` split, multi-line paste, `Backspace` delete, checkbox toggle, and drag reorder) via `onImmediateUpdate`, while keeping regular typing on `onStageUpdate` + `onBlur` (`onCommit`)
- [x] Verified full monorepo typechecks pass cleanly (`bun run check-types`)
