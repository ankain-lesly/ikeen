---
name: ikeen-mobile-patterns
description: Architectural patterns, sync invariants, and React Native / NestJS anti-patterns for the iKeen monorepo. Use whenever building or reviewing note/block components, Drizzle live queries, sync outbox mutations, or NestJS sync endpoints.
---

# iKeen Mobile & Sync Architecture Patterns

Use this skill when implementing or reviewing features across `apps/mobile`, `apps/api`, and `packages/*`. Every rule below prevents a real production defect encountered in the codebase.

---

## 1. Drizzle `useLiveQuery` Reference Stability & Derived State

### ❌ Avoid: Unmemoized `.map()` on `useLiveQuery` + `useEffect` State Mirroring
Returning `result.data.map(...)` directly from a custom live query hook creates a brand-new array reference on every render. Combining that with `useEffect(() => setState(liveData), [liveData])` causes an **infinite render loop**.

```ts
// ❌ BAD: New array reference every render + state mirror loop
export function useLiveNoteBlocks(noteId: string) {
  const result = useLiveQuery(query, [noteId]);
  return { ...result, data: (result.data ?? []).map(rowToNoteBlock) };
}

// Inside component:
const { data: liveBlocks } = useLiveNoteBlocks(note.id);
const [blocks, setBlocks] = useState(liveBlocks);
useEffect(() => {
  setBlocks(liveBlocks); // Infinite re-render loop!
}, [liveBlocks]);
```

### ✅ Prefer: `useMemo` in Live Hooks + Derived Overlay State
Always memoize transformed arrays in `useLive*` hooks, and derive UI state via `useMemo` over `liveData` and a lightweight local overlay instead of copying `liveData` into `useState` via `useEffect`.

```ts
// ✅ GOOD: Stable array reference from hook
export function useLiveNoteBlocks(noteId: string) {
  const result = useLiveQuery(query, [noteId]);
  const blocks = useMemo(
    () => (result.data ?? []).map(rowToNoteBlock),
    [result.data],
  );
  return { ...result, data: blocks };
}

// Inside component:
const { data: liveBlocks } = useLiveNoteBlocks(note.id);
const [dirtyOverlay, setDirtyOverlay] = useState<Record<string, UpdateBlockInput>>({});
const blocks = useMemo(
  () => liveBlocks.map((b) => (dirtyOverlay[b.id] ? { ...b, ...dirtyOverlay[b.id] } : b)),
  [liveBlocks, dirtyOverlay],
);
```

---

## 2. Commit-on-Blur / Commit-on-Done Editing (No Keystroke SQLite Writes)

### ❌ Avoid: Per-Keystroke SQLite Writes, Debounce Timers, or `shouldSync` Flags
- Writing to SQLite and `sync_outbox` on every `onChangeText` keystroke causes UI frame drops and fragments outbox mutations into `in_flight` batches.
- Passing `shouldSync` flags through query and outbox functions leaks sync orchestration into the data layer.

### ✅ Prefer: Synchronous Dirty Map + Commit on `onBlur` & Editor Exit (`flushBlocks`)
1. **While typing (`onChangeText`)**: Update `dirtyOverlay` state and a synchronous `dirtyBlocksRef` (`Map<string, UpdateBlockInput>`) in memory only.
2. **On input blur (`onBlur`)**: Call `commitBlock(blockId)` to pop the dirty entry and run `updateBlock()` once.
3. **On editor exit (`Done`, `Back` navigation, `AppState === 'background'`)**: Call `await blockContainerRef.current?.flushBlocks()` **before** `setIsEditing(false)` so focused inputs that haven't blurred are persisted to SQLite before view mode renders.
4. **On discrete actions (checkbox toggle, list type change, item add/delete)**: Merge any staged `dirtyBlocksRef` entry for that block and call `updateBlock()` immediately.

---

## 3. Idempotent Contextual Action Registration (`BlockWrapper`)

### ❌ Avoid: Unconditional Parent `setState` in Child Registration Hooks
When a child block registers actions into a parent wrapper via `useEffect`, calling `setContextualActions(actions)` unconditionally will re-render the parent on every child render if the `actions` array or callbacks are recreated.

### ✅ Prefer: Signature Comparison + Latest Callback Ref
In `BlockWrapper`, store the latest `SheetAction[]` in a `useRef` (so `onPress` always invokes the freshest closure) and only call `setContextualActions` when the structural signature (`label:visible`) changes.

---

## 4. Production Module Resolution in `apps/api` (`@repo/*` Imports)

### ❌ Avoid: Runtime Value Imports from `@repo/*` in `apps/api`
`apps/api` builds with Rspack (`nest-cli.json` `"builder": "rspack"`) and `webpack-node-externals`. Any **runtime value import** from a workspace package (`import { foo } from '@repo/...'`) is left external in `dist/main.js` and fails in production (`bun dist/main.js`) due to CJS/ESM and unbundled workspace resolution issues.

```ts
// ❌ BAD in apps/api: Runtime import from workspace package breaks in production
import { log } from '@repo/utils';
```

### ✅ Prefer: Compile-Time `import type` from `@repo/types` + App-Local Runtime Codecs
- In `apps/api`, **only** use `import type { ... } from '@repo/types'` (which TypeScript erases completely at compile time).
- For runtime validation and serialization in `apps/api`, use direct dependencies installed in `apps/api/package.json` (such as `zod` and `class-validator`) and local modules like `apps/api/src/modules/notes/block-content.codec.ts`.

---

## 5. Wire Semantics & DTO Field Presence (`null` vs `undefined`)

### ❌ Avoid: Using `undefined` to Clear Optional Fields or `'key' in dto` on NestJS DTOs
1. `JSON.stringify({ header: undefined })` produces `"{}"`—the key is stripped before reaching the server.
2. With `target: "ES2023"` in `apps/api/tsconfig.json`, class fields on `BlockChangesDto` are initialized to `undefined` on every instance, meaning `'header' in b.changes` is **always `true`**, even when the client omitted `header`!

```ts
// ❌ BAD: Always true on ES2022+ class instances!
const header = 'header' in b.changes ? b.changes.header : existing.header;
```

### ✅ Prefer: Explicit `null` for Field Removal + Canonical Codec
- Pass `null` (`{ header: null }`) when explicitly removing an optional field (`header` or `footer`), and allow `null` on the DTO with `@ValidateIf((_, v) => v !== null) @IsString() @IsOptional()`.
- Always route block serialization/deserialization through `block-content.codec.ts` (`packServerBlockContent` / `unpackServerNoteBlock` on API; `serializeBlockContent` / `unpackNoteBlock` / `toBlockOutboxPayload` on mobile).

---

## 6. Data Layer Invariants & Strict Outbox Failure Classification

### Parent Existence Invariant
- Enforce parent `notes` existence directly inside `createBlock(noteId, input)` in `note-blocks.ts` (`if (!(await getNoteById(noteId))) await createNote({ id: noteId })`).
- In `NoteEditor.saveNote()`, check `const existingNote = isNewDraft ? await getNoteById(data.id) : null;` so if `createBlock()` already inserted the parent note row, `saveNote()` routes to `updateNote(data.id, ...)` to persist note metadata (`title`, `folderId`, `tags`, `isPinned`) on `Done` / `Back` / `Background`.

### Strict Outbox Failure Classification (`outbox.ts`)
Never mark outbox mutations as terminally `failed` on transient network or auth errors:
1. **`transient_no_penalty` (`status === 0` offline, `401`, `403`, `408`, `429`)**: Reset `status` from `in_flight` to `pending` **without incrementing `retryCount`**.
2. **`server_error` (`500–599`)**: Reset `status` to `pending` and increment `retryCount`.
3. **`client_rejected` (`400`, `404`, `409`, `422`)**: Increment `retryCount` and transition to `failed` only when `retryCount >= SYNC_CONSTANTS.MAX_RETRIES`.
4. Always keep `lt(syncOutbox.retryCount, SYNC_CONSTANTS.MAX_RETRIES)` active in `getPendingOutbox` so poison-pill payloads stop retrying at `MAX_RETRIES`.

---

## 7. Draft vs. Persisted Entity Lifecycle in Editors (`NoteEditor`)

### ❌ Avoid: Running Immediate SQLite Updates on Unpersisted Draft IDs
When a user creates a new note (`isNewDraft === true` and `liveBlocks.length === 0`), its `id` only exists in React state until `saveNote()` or `createBlock()` inserts it into SQLite:
- Calling `togglePinNote(note.id)`, `toggleArchiveNote(note.id)`, or `softDeleteNote(note.id)` directly on an unpersisted draft throws `Error: Note with id "..." not found`.
- Conversely, when the note **is** persisted and the user is in View Mode (`!isEditing`), updating only React state (`updateNoteState("folderId", newFolderId)`) without calling `moveNoteToFolder` leaves the change unpersisted if the user doesn't trigger `saveNote()`.

### ✅ Prefer: Draft-Aware Action Handlers (`useNoteActions`)
1. **Before creating child records (`createBlock`)**: `createBlock(noteId, input)` guarantees the parent `notes` row exists in SQLite, and `NoteEditor` marks `setHasEdited(true)` so `saveNote()` persists note metadata on exit.
2. **When toggling metadata on an unpersisted draft (`isUnpersistedDraft`)**: Pass `isNewDraft: isNewDraft && liveBlocks.length === 0` to `useNoteActions` and `NotesOptionsDropdown` so pin/archive/delete update local state instead of querying SQLite for a non-existent row.
3. **When checking if a draft is empty in `saveNote()`**: Always include `liveBlocks.length === 0` alongside `!title && !content && !tags.length`.

---

## 8. Imperative Handle Wiring & Clean UI Policy

### ❌ Avoid: Unwired `useRef` Handles, `defaultValue`-Only Controlled Inputs, & Placeholder Code
1. **Orphan Refs**: Declaring `const contentInputRef = useRef<MarkdownEditorHandle>(null)` or `const inputRefs = useRef<Record<string, MarkdownEditorHandle | null>>({})` and calling `.focus()` / `.format()` without passing `ref={...}` to the target component makes toolbar formatting and list item auto-focus silent no-ops.
2. **Uncontrolled `defaultValue` with Imperative Formatting**: If `MarkdownEditor` mutates `internalValue` in `format()`, `<TextInput>` must bind `value={internalValue}` (not just `defaultValue`), otherwise programmatic formatting never updates the native input.
3. **Placeholder / Dead Code & Disabled ClassNames**:
   - Never hardcode `https://picsum.photos/...` URLs or `() => toast.info("Taking A Photo")` dummy callbacks in production components. Wire real `expo-image-picker` actions or omit unimplemented props so `OptionSheet` hides them (`visible: !!handler`).
   - Never disable Tailwind/Uniwind classes by prefixing underscores (`_rounded-full`, `pt_2`, `border_border-border`); remove unused classes cleanly and delete commented-out code blocks instead of committing them.

---

## Pre-Commit Review Checklist
- [ ] `bun run check-types` and `bun run lint` pass with zero errors.
- [ ] All `useLiveQuery` hooks memoize their mapped return arrays with `useMemo`.
- [ ] No `useEffect(() => setState(liveData), [liveData])` state mirrors exist.
- [ ] All imperative `useRef` handles (`BlockContainerHandle`, `MarkdownEditorHandle`, list `inputRefs`) are wired to rendered components.
- [ ] No runtime value imports from `@repo/*` exist in `apps/api/src` (only `import type`).
- [ ] No user-facing debug toasts, fake `picsum.photos` URLs, or underscore-prefixed Tailwind classes exist.
