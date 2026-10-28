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

---

## 📦 Media Pickers, FileSystem & Audio Streaming (Phase 2.0-beta) — 2026-10-23
* **Status**: Completed
* **Scope**: Native device integration for picking, saving, streaming, and manipulating all supported media block types (`image`, `audio`, `file`).

- [x] Native Pickers & Permissions:
  - [x] Implement `ImagePicker` integration (`apps/mobile/src/lib/media/pickers.ts`) for camera capture and gallery multi-selection
  - [x] Implement `FilePicker` / document picker integration (`expo-document-picker`) for general attachments with metadata extraction (`mimeType`, `size`, `name`)
  - [x] Implement permissions management with OS settings prompt (`apps/mobile/src/lib/media/permissions.ts`)
- [x] Local FileSystem Storage & Sandboxing:
  - [x] Copy picked media to app-sandboxed permanent storage (`FileSystem.documentDirectory + "media/"`) to prevent cache purging and invalid local URIs (`apps/mobile/src/lib/media/file-system.ts`)
  - [x] Implement safe asset deletion on item/block removal and human-readable `formatFileSize`
- [x] Audio Streaming & Media Player Engine:
  - [x] Integrate hardware-accelerated audio streaming/playback handler (`expo-audio`) with `useAudioPlayerState` (`apps/mobile/src/lib/media/use-audio-player.ts`)
  - [x] Implement playback state machine (loading, playing, paused, scrubbing, duration tracking, auto-pause on unmount)
  - [x] Implement `AudioRecordingSheet` with real-time second counter, cancel/save controls, and sandboxed audio persistence
- [x] Block Integration & Purposeful UI/UX:
  - [x] Refactor `MediaBlock` (`apps/mobile/src/components/notes/blocks/media-block.tsx`) to partition visual images, audio cards (`MediaAudioCard`), and document attachments (`MediaFileCard`)
  - [x] Wire contextual block actions (`BlockWrapper`) and bottom toolbar actions for Take Photo, Add Photos, Attach File, and Record Audio
  - [x] Configure production iOS `infoPlist` usage descriptions and Android permissions in `app.json`
- [x] Verified full monorepo typechecks pass cleanly (`bun run check-types`)

---

---

## 🎨 Unified Media Experience & Layout Overhaul (Phase 3) — 2026-10-24
* **Status**: Completed
* **Scope**: Unified single-scroll horizontal media carousel across all media types, swipeable full-screen preview modal with left/right paging, "See All" 2-column grid modal, animated color-changing sync border, circular 3-dot menu button, 2-line bottom metadata scrim, and expandable single-line caption sheet.

- [x] Unified Media Block Carousel:
  - [x] Consolidate images, audio recordings, and files into a single horizontal scroll carousel with uniform `aspect-[4/5]`, `w-44 h-56`, `rounded-3xl` cards
  - [x] Implement section header with dynamic attachment count (`Attachments (N)`) and `See all` action button
- [x] Unified Media Card (`media-card.tsx`):
  - [x] Full-bleed image preview with gradient scrim for photos
  - [x] Centered SVG rhythmic soundwave and play pill for audio recordings
  - [x] Colored file-type glyph cards (PDF crimson, Sheet emerald, Code cyan, Archive amber) for documents
  - [x] Top-right circular translucent `⋮` (`MoreVertical`) menu button
  - [x] Bottom dark gradient scrim with 2 lines: bold truncated filename and category/source subtitle (`Camera`, `Audio • 02:45`, `PDF • 3.4 MB`)
- [x] Animated Sync Border (`animated-sync-border.tsx`):
  - [x] Reactive `react-native-reanimated` color-cycling border during active upload (`cyan` -> `indigo` -> `emerald`)
  - [x] Crimson border for failed uploads, amber for pending, and settled subtle border for cloud-synced items
- [x] Swipeable Full-Screen Preview Modal (`media-preview-modal.tsx`):
  - [x] Horizontal paging `FlatList` (`pagingEnabled`) supporting left/right swipe navigation across all media items
  - [x] Fullscreen contain view for images
  - [x] Immersive audio player with interactive SVG waveform scrubber (`audio-waveform.tsx`), circular play/pause, and tabular time readout
  - [x] Document preview card with native file sharing/opening CTA
  - [x] Bottom expandable caption: truncated to 1 line by default, smoothly expands on tap to show full markdown details with inline editing
- [x] "See All" 2-Column Grid Modal (`media-grid-modal.tsx`):
  - [x] Full-page modal with 2-column grid (`numColumns={2}`) rendering unified media cards
  - [x] Direct transition to full-screen preview modal upon card selection
- [x] Contextual Action Menu (`media-options-dropdown.tsx` & `media-file-info-sheet.tsx`):
  - [x] Consolidated options menu into unified `MediaOptionsDropdown` supporting `variant="sheet" | "dropdown"` (matching `NotesOptionsDropdown`)
  - [x] Native `@expo/ui/jetpack-compose` anchored dropdown menu support
  - [x] Lifted `infoItem` state to parent (`MediaPreviewModal`), removing File Info from card menu and making it exclusively accessible via preview modal
  - [x] Integrated `OptionSheet` for `Edit Caption`, `File Info`, `Share / Open File`, `Retry Upload`, and `Delete Attachment`
  - [x] Safely eliminated redundant `media-menu-sheet.tsx` component


---

## 🎨 Mobile Media Polish & Architectural Refinements — 2026-10-25
* **Status**: Completed
* **Scope**: Distraction-free preview modal with chrome toggling, image pinch-to-zoom, polished inline caption editing, caption in file info modal with direct edit trigger, native linear gradient for card labels, stackable media blocks, prepend new media items to index 0, glowing sprint border animation, and permanent original filename preservation with timestamps.

- [x] Distraction-Free Media Preview:
  - [x] Tap on preview body toggles visibility of header and bottom caption bar simultaneously (`isChromeVisible`).
  - [x] Implemented multi-touch pinch-to-zoom (up to 4x) and pan on preview images via `<ScrollView maximumZoomScale={4}>`.
- [x] Polished Caption Editing Flow:
  - [x] Removed test/debug styling (`bg-green-500/50`).
  - [x] Collapsed state: clean translucent card displaying caption up to 3 lines or subtle "Add a caption..." pill.
  - [x] Expanded state: inline multiline `TextInput` with auto-focus, checkmark save button, and auto-save on blur / submit.
  - [x] Integrated caption editing into `MediaFileInfoSheet` with dedicated `MessageSquare` metadata row and `Edit3` button that dismisses sheet and launches inline caption editor.
- [x] Visual Styling & Animations:
  - [x] Native `LinearGradient` from `expo-linear-gradient` for media card labels (`["transparent", "rgba(0, 0, 0, 0.45)", "rgba(0, 0, 0, 0.88)"]`) blending seamlessly into photos.
  - [x] Glowing sprint border animation (`animated-sync-border.tsx`): 1000ms loop with accelerated color cycle and pulsing outer shadow glow (`shadowColor`, `shadowRadius: 10`, `shadowOpacity: 0.85`, `elevation: 6`).
- [x] Media Item Ordering & Block Stacking:
  - [x] Media item insertion order: prepends new media items to `index: 0` (`[...newItems, ...itemsRef.current]`) inside `media-block.tsx` so newest additions appear first in carousels and grids.
  - [x] Stackable media blocks: adding media from the bottom accessory bar always creates a new discrete media block (`createBlock(note.id, createDefaultMediaBlockInput(newItems))`) following natural block flow, while block contextual actions append to that specific block.
- [x] Filename Preservation & Cloud Caching:
  - [x] Permanent preservation of original filenames when importing local assets via `${sanitizedBase}_${Date.now()}.${ext}` in `saveAssetToSandbox` while keeping human-readable `name`.
  - [x] Preserved `original_filename` from Mediadock responses during cloud upload reconciliation and cloud download caching (`${baseName}_${Date.now()}.${ext}`).
- [x] Verification:
  - [x] Verified zero TypeScript compilation errors (`tsc -p apps/mobile/tsconfig.json --noEmit`).

* **Status**: Completed
* **Scope**: Background media asset uploads directly to `mediadock.leslychuo.me`, dedicated `media_sync_outbox` table, reactive Zustand progress store, startup resume scanning, queue drain loop, and outbox reconciliation.

- [x] Schema & Outbox Alignment:
  - [x] Dropped redundant `synced` property from `MediaItem` in `@repo/types`, API codecs, and mobile codecs (presence of `url` indicates cloud availability)
  - [x] Added `media_sync_outbox` table in mobile Drizzle schema with status enum (`pending`, `uploading`, `failed`), retry counters, indices, and generated migration `0006_safe_nova.sql`
- [x] Direct Mobile Upload & Queue Worker:
  - [x] Created `useMediaUploadStore` Zustand store for reactive in-flight upload progress tracking (`0–100%`) without thrashing SQLite
  - [x] Implemented `upload-service.ts` with `FileSystem.createUploadTask` targeting `https://mediadock.leslychuo.me/api/v1/upload` with `folder: "notes-media"` parameter
  - [x] Implemented queue worker drain loop (`while (true)`) with bounded concurrency (2 uploads in parallel)
  - [x] Automatic block reconciliation on upload completion: patches `note_blocks.content` with the remote URL and enqueues note block sync into `sync_outbox`
  - [x] Wired `enqueueMediaUpload` into media ingestion (`handleAppendMediaItems` in `NoteEditor` and `appendMediaItems` in `MediaBlock`)
  - [x] Connected cancellation and cleanup of pending/failed media jobs on block/item deletion
- [x] Startup & Cross-Device Sync Caching:
  - [x] Implemented indexed `reconcileUnsyncedMedia()` wired into `syncManager.init()` on app launch and network changes
  - [x] Hardened `upsertBlockFromSync` to preserve local sandbox `localUri` across cross-device pulls and trigger background `cacheRemoteMediaLocally` for incoming cloud media
- [x] UI/UX & Performance:
  - [x] Isolated caption keystroke updates to preserve `React.memo` boundaries ($O(1)$ render isolation)
  - [x] Wired `useMediaUploadProgress` into `VisualImageCard`, `MediaAudioCard`, and `MediaFileCard` with progress %, error state, and retry action
- [x] Verification:
  - [x] Verified targeted mobile typecheck passes cleanly (`bun run --cwd apps/mobile check-types` -> 0 errors)

---

## 🃏 Phase 4: NoteCard Structured Block & Media Previews — 2026-10-26
* **Status**: Completed
* **Scope**: Prominent media cover previews on NoteCards, structured content previews (first 3 list items with checkboxes/bullets/numbers + "+N more", markdown-stripped text snippets), and optimized Drizzle relational queries with `withBlocks` filtering.

- [x] Schema & Relational Query Infrastructure:
  - [x] Added `withBlocks?: boolean` to `ListNotesOptions` in `@repo/types`.
  - [x] Defined Drizzle `notesRelations` and `noteBlocksRelations` in `apps/mobile/src/db/schema.ts` to link notes to their ordered blocks.
  - [x] Implemented `buildNotesRelationalQuery` with `with: { blocks: true }` in `apps/mobile/src/lib/queries/notes.ts`.
  - [x] Updated `useLiveNotes` and `listNotes` to fetch and unpack structured blocks by default (`withBlocks !== false`).
  - [x] Optimized metric-only query in `ProfileScreen` with `withBlocks: false` to eliminate join overhead.
- [x] Structured Preview Components (`note-card-preview.tsx`):
  - [x] `MediaCoverPreview`: Prominent thumbnail cover using `expo-image` (`contentFit="cover"`) for photos, and audio/file banners for voice recordings and documents, with `+N` badge for multi-item media.
  - [x] `ListBlockPreview`: First 3 items with exact list-type markers (square checkboxes with checked status, bullet dots, or ordered numbers) and a `+N more` counter.
  - [x] `stripMarkdown`: Fast regex-based markdown token stripper for clean plain text display.
- [x] NoteCard Integration (`note-card.tsx`):
  - [x] Flush media cover thumbnail mounted at the top of the card container.
  - [x] First block content preview: renders `ListBlockPreview` for list blocks, stripped text for text blocks, and falls back to `note.summary` / `note.content`.
  - [x] Updated memo equality `areNoteCardPropsEqual` to compare `prev.note.blocks === next.note.blocks` ($O(1)$ identity check).
  - [x] Updated `NoteGridContainer` and `search.tsx` to handle `NoteWithBlocks[]`.
- [x] Verification:
  - [x] Verified zero TypeScript compilation errors (`tsc -p apps/mobile/tsconfig.json --noEmit` and `tsc -p apps/api/tsconfig.json --noEmit`).

---

## 📜 Infinite Drawer Setup & Recent Notes Feed — 2026-10-27
* **Status**: Completed
* **Scope**: Progressive infinite rendering for the Recent Notes feed in the root drawer using `onScrollEndDrag` + `onMomentumScrollEnd` gesture detection, dynamic SQLite limit expansion via `useInfiniteRecentNotes`, reactive Drizzle live updates, and ActivityIndicator loading state.

- [x] Task 1: Progressive query hook `useInfiniteRecentNotes` in `apps/mobile/src/lib/queries/notes.ts`
- [x] Task 2: Gesture detection (`onScrollEndDrag` & `onMomentumScrollEnd`) and coordinated pagination state in `apps/mobile/src/components/root-custom-drawer-content.tsx`
- [x] Task 3: Infinite rendering & loading footer in `apps/mobile/src/components/recent-notes.tsx`
- [x] Task 4: Verification via TypeScript compilation and manual checking

