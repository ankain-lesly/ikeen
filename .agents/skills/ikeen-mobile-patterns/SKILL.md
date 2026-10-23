---
name: ikeen-mobile-patterns
description: Architectural patterns, sync invariants, and React Native / NestJS implementation patterns for the iKeen monorepo. Use whenever building note/block components, Drizzle live queries, sync outbox mutations, or NestJS sync endpoints.
---

# iKeen Mobile & Sync Architecture Patterns

Use this skill when implementing features across `apps/mobile`, `apps/api`, and `packages/*`. Every rule below prevents a real production defect encountered in the codebase.

---

## 1. Drizzle `useLiveQuery` Reference Stability & Derived State

### ❌ Avoid: Unmemoized `.map()` on `useLiveQuery` + `useEffect` State Mirroring
Returning `result.data.map(...)` directly from a custom live query hook creates a brand-new array reference on every render. Combining that with `useEffect(() => setState(liveData), [liveData])` causes an **infinite render loop**.

### ✅ Prefer: `useMemo` in Live Hooks + Derived Overlay State
Always memoize transformed arrays in `useLive*` hooks, and derive UI state via `useMemo` over `liveData` and a lightweight local overlay (`useStagedBlockUpdates`) instead of copying `liveData` into `useState` via `useEffect`.

```ts
export function useLiveNoteBlocks(noteId: string) {
  const result = useLiveQuery(query, [noteId]);
  const blocks = useMemo(
    () => (result.data ?? []).map(rowToNoteBlock),
    [result.data],
  );
  return { ...result, data: blocks };
}
```

---

## 2. Commit-on-Blur / Commit-on-Done Editing (No Keystroke SQLite Writes)

### ❌ Avoid: Per-Keystroke SQLite Writes, Debounce Timers, or `shouldSync` Flags
- Writing to SQLite and `sync_outbox` on every `onChangeText` keystroke causes UI frame drops and fragments outbox mutations into `in_flight` batches.
- Passing `shouldSync` flags through query and outbox functions leaks sync orchestration into the data layer.

### ✅ Prefer: Synchronous Dirty Map + Commit on `onBlur` & Editor Exit (`flushBlocks`)
1. **While typing (`onChangeText`)**: Update `dirtyOverlay` state and a synchronous `dirtyBlocksRef` (`Map<string, UpdateBlockInput>`) in memory only (`useStagedBlockUpdates`).
2. **On input blur (`onBlur`)**: Call `commitBlock(blockId)` to pop the dirty entry and run `updateBlock()` once.
3. **On editor exit (`Done`, `Back` navigation, `AppState === 'background'`)**: Call `await blockContainerRef.current?.flushBlocks()` **before** `setIsEditing(false)` so focused inputs that haven't blurred are persisted to SQLite before view mode renders.
4. **On discrete actions (checkbox toggle, list type change, item add/delete, Enter split, paste, drag reorder)**: Merge any staged `dirtyBlocksRef` entry for that block and call `updateBlock()` immediately (`handleImmediateUpdate`).

---

## 3. Zero-State Contextual Action Registration (`BlockWrapper`)

### ❌ Avoid: `useState` + `useEffect` in Child Registration Hooks
Because `BlockWrapper` only mounts `<OptionSheet>` when `isOptionsOpen === true`, storing child contextual actions in `useState` via `useEffect` adds unnecessary state updates, unmount effects, and signature checks.

### ✅ Prefer: Synchronous `useRef` Registration (`contextualActionsRef`)
Provide a `React.MutableRefObject<SheetAction[]>` via `BlockWrapperContext` and assign `actionsRef.current = actions` synchronously during render in `useRegisterBlockActions(actions)`. When the user taps `MoreVertical` (`setIsOptionsOpen(true)`), `BlockWrapper` reads `contextualActionsRef.current` with zero extra renders.

---

## 4. Production Module Resolution in `apps/api` (`@repo/*` Imports)

### ❌ Avoid: Runtime Value Imports from `@repo/*` in `apps/api`
`apps/api` builds with Rspack (`nest-cli.json` `"builder": "rspack"`) and `webpack-node-externals`. Any **runtime value import** from a workspace package (`import { foo } from '@repo/...'`) is left external in `dist/main.js` and fails in production (`bun dist/main.js`).
Also, never add `"type": "module"` to `packages/types/package.json` while it exports extensionless `.ts` files, as `apps/api` (`"moduleResolution": "nodenext"`) will fail with `TS2835`.

### ✅ Prefer: Compile-Time `import type` from `@repo/types` + App-Local Runtime Codecs
- In `apps/api`, **only** use `import type { ... } from '@repo/types'`.
- For runtime validation and serialization in `apps/api`, use direct dependencies (`zod`, `class-validator`) and local codecs (`apps/api/src/modules/notes/block-content.codec.ts`).

---

## 5. Wire Semantics & DTO Field Presence (`null` vs `undefined`)

### ❌ Avoid: Using `undefined` to Clear Optional Fields or `'key' in dto` on NestJS DTOs
1. `JSON.stringify({ header: undefined })` strips the key before reaching the server.
2. With `target: "ES2023"` in `apps/api/tsconfig.json`, class fields on `BlockChangesDto` are initialized to `undefined` on every instance, meaning `'header' in b.changes` is **always `true`**.

### ✅ Prefer: Explicit `null` for Field Removal + Canonical Codec
- Pass `null` (`{ header: null }`) when explicitly removing an optional field (`header` or `footer`), and allow `null` on the DTO with `@ValidateIf((_, v) => v !== null) @IsString() @IsOptional()`.
- Route all block serialization/deserialization through `block-content.codec.ts` (`packServerBlockContent` / `unpackServerNoteBlock` on API; `serializeBlockContent` / `unpackNoteBlock` / `toBlockOutboxPayload` / `formatNoteWithBlocks` on mobile).

---

## 6. Data Layer Invariants & Strict Outbox Failure Classification

### Parent Existence & Two-Phase Position Updates
- Enforce parent `notes` existence directly inside `createBlock(noteId, input)` in `note-blocks.ts` (`if (!(await getNoteById(noteId))) await createNote({ id: noteId })`).
- In `NoteEditor.saveNote()`, check `const existingNote = isNewDraft ? await getNoteById(data.id) : null;` so if `createBlock()` already inserted the parent note row, `saveNote()` routes to `updateNote(data.id, ...)` to persist note metadata (`title`, `folderId`, `tags`, `isPinned`).
- In `deleteBlock` and `reorderBlocks`, update only blocks whose `position` changed in SQLite first, then enqueue `sync_outbox` mutations after all local SQLite writes complete.
- In `upsertBlockWithLww` (`notes.service.ts`), explicitly handle `b.action === 'delete'` with note-ownership verification.

### Strict Outbox Failure Classification (`outbox.ts`)
1. **`transient_no_penalty` (`status === 0` offline, `401`, `403`, `408`, `429`)**: Reset `status` from `in_flight` to `pending` **without incrementing `retryCount`**.
2. **`server_error` (`500–599`)**: Reset `status` to `pending` and increment `retryCount`.
3. **`client_rejected` (`400`, `404`, `409`, `422`)**: Increment `retryCount` and transition to `failed` only when `retryCount >= SYNC_CONSTANTS.MAX_RETRIES`.
4. Keep `lt(syncOutbox.retryCount, SYNC_CONSTANTS.MAX_RETRIES)` active in `getPendingOutbox`.

---

## 7. Draft vs. Persisted Entity Lifecycle & Block Cloning

- Pass `isNewDraft: isNewDraft && liveBlocks.length === 0` to `useNoteActions` and `NotesOptionsDropdown` so pin/archive/delete on an unpersisted draft update local state instead of querying SQLite for a non-existent row.
- Include `liveBlocks.length === 0` when checking if a draft is empty in `saveNote()`.
- When duplicating a block (`cloneBlockInput` in `block-factories.ts`), regenerate fresh `Crypto.randomUUID()` IDs for all child `ListItem` / `MediaItem` entries and splice the duplicated block at `currentIndex + 1` via `reorderBlocks`.

---

## 8. $O(1)$ Keystroke Render Isolation & Reanimated v4 Worklets

### ❌ Avoid: Inline Closures or `[items]` Callback Dependencies in `.map()` Loops
Passing inline arrows (`onChange={(v) => fn(id, v)}`) or `useCallback(..., [items])` to `React.memo` row components (`BlockRow`, `ListItemRow`) defeats `React.memo` and forces all $N$ sibling blocks/items (and their native `Gesture.Pan()` handlers) to re-render on every keystroke.

### ✅ Prefer: `BlockRow` Memoization + `stateRef`-Backed Stable Callbacks
1. Wrap each block in a memoized `BlockRow` (`block-container.tsx`) receiving stable callbacks from `BlockContainer`.
2. In `ListBlock`, store `{ items, activeItems, checkedItems, isCheckboxList, onStageUpdate, onImmediateUpdate }` in a `stateRef` and define row callbacks (`handleToggleCheck`, `handleItemTextChange`, `handleBackspaceEmpty`, `handleMoveItem`, `handleDeleteItem`) with `useCallback(..., [])` so only the **1 edited `ListItemRow`** re-renders per keystroke ($O(1)$).
3. Use `scheduleOnRN` from `react-native-worklets` (not deprecated `runOnJS`) inside `Gesture.Pan()` worklets, hoist `LinearTransition` constants to module scope, and never nest `VirtualizedList`/`FlatList` inside `NoteEditor`'s `<ScrollView>`.

---

## 9. Imperative Handle Wiring & Clean UI Policy

1. **Wire All Imperative Refs**: Ensure `BlockContainerHandle`, `MarkdownEditorHandle`, and list item `inputRefs` are passed as `ref={...}` to their target components.
2. **Controlled `internalValue`**: Bind `value={internalValue}` on `<TextInput>` inside `MarkdownEditor` so programmatic `.format()` and `singleLine` newline clamping update the native input.
3. **Zero Placeholders**: Never commit `picsum.photos` URLs, dummy `toast.info(...)` handlers, or underscore-prefixed Tailwind classes (`_rounded-full`).
