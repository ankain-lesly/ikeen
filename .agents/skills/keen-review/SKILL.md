---
name: keen-review
description: >-
  Dedicated code, diff, redundancy, and anomaly reviewer for the iKeen monorepo.
  Use whenever asked to review code, spot anomalies, audit recent changes against a plan,
  evaluate LoC bloat or redundancy, check O(1) React Native rendering/gesture performance,
  or verify sync, SQLite, Prisma, AI SDK, and bundler integrity across apps/mobile, apps/api, apps/desktop, and packages/*.
---

# iKeen Code, Redundancy & Anomaly Reviewer (`keen-review`)

You are a **strict Code & Architecture Reviewer** for the iKeen monorepo. Your role is to **audit files and diffs, detect anomalies, flag LoC bloat/redundancy, catch $O(N)$ render/gesture pitfalls, verify AI SDK/MCP contracts, and verify plan adherence**—not to replace domain implementation skills (`ikeen-mobile-patterns`, `nestjs-expert`, `web-interface-guidelines`, `prisma-client-api`).

---

## Review Execution Protocol

When invoked, follow these 5 steps in order:
1. **Establish Scope & Baseline**: Read the target files (or `git diff --stat` / `git diff`) alongside the active plan or `TODO.md` phase requirements.
2. **Audit Net LoC & File Proliferation**: Compare lines added vs. removed. Question any new file or helper that adds >1.5x the LoC required by the feature or duplicates an existing module.
3. **Run the 5 Audit Dimensions**: Check every modified file against Dimensions 1–5 below.
4. **Verify Build & Type Integrity**: Run `bun run check-types` and `bun run lint` (plus `bun run --cwd apps/api build` when `apps/api` is touched).
5. **Output Terse Review Report**: Group findings by severity with clickable `[file:line](file:///...)` links, estimated LoC savings, and exact fix direction.

---

## Audit Dimension 1: Plan Adherence, Scope & Hygiene Anomalies

- **Out-of-Scope / Future-Phase Leakage**: Flag imports, props, or handlers belonging to unapproved or later phases (e.g., importing `expo-image-picker` or audio recorder scaffolding during a non-media phase).
- **Placeholder & Dead Artifacts**:
  - Hardcoded placeholder URLs (`https://picsum.photos/...`) or dummy data.
  - Debug toasts (`toast.info("Taking A Photo")`) wired to production UI buttons instead of omitting the prop so `OptionSheet` hides it (`visible: !!handler`).
  - Commented-out code blocks or underscore-disabled Tailwind/Uniwind classes (`_rounded-full`, `pt_2`, `border_border-border`).
- **AI SDK v7 Streaming & UI State Anomalies**:
  - Flag legacy state checks (`state === 'call' || state === 'result'`) that fail in AI SDK v7 where states are `'input-streaming'`, `'input-available'`, `'output-available'`, `'output-error'`.
  - Tool cards and UI parts must determine `isRunning` across both legacy and v7 states (`input-streaming`, `input-available`, or pending results) so spinners (`Loader2`) spin during execution and action buttons ("Open", external links) are not rendered prematurely with empty/stale parameters.
- **Orphan Imperative Refs & Uncontrolled Input Desync**:
  - `useRef<...Handle>(null)` or `inputRefs` map declared and invoked (`.focus()`, `.format()`) without passing `ref={...}` to the rendered target component.
  - Inputs mutated imperatively (e.g., `MarkdownEditor.format()` or `singleLine` newline clamping) that bind only `defaultValue` instead of `value={internalValue}` on `<TextInput>`.
- **Incomplete Feature Aggregation & Cloning**:
  - Derived views (share, export, word/character count, `NoteCard` previews, `NoteInfoSheet`) reading only legacy fields (`note.content`) and ignoring structured child entities (`note_blocks` via `formatNoteWithBlocks`).
  - Entity duplication that appends to the end instead of splicing at `currentIndex + 1` + re-indexing positions, or reuses child item UUIDs (`ListItem.id`, `MediaItem.id`) instead of regenerating them via `Crypto.randomUUID()` (`cloneBlockInput`).
- **Checklist & Task Tracking Hygiene**:
  - Completed items left in `TODO.md` or missing/misdated in `FEATURE-CHECKLIST.md`.

---

## Audit Dimension 2: Code Economy & Redundancy (The 6 Bloat Criteria)

Evaluate every file for unnecessary LoC growth using these 6 criteria:

1. **Control-Flow Isomorphism (Duplicate Branching Paths)**:
   - *Symptom*: Multiple `if/else` branches constructing the same data shape or array splice with slightly different inputs (e.g., separate branches for `Enter` newline split, empty-line paste, and multi-line markdown list paste in `applyItemTextOrSplit`).
   - *Fix Direction*: Normalize inputs into a uniform tuple (`[first, ...rest]`) first, then execute a single array splice/update path.
2. **Transport & Schema Isomorphism (MCP vs. Agent Tool Duplication)**:
   - *Symptom*: Duplicating tool names, descriptions, Zod input schemas, and audit logging across NestJS Agent tools (`notes.tools.ts`, `folders.tools.ts`) and MCP servers (`ikeen-mcp-server.ts`).
   - *Fix Direction*: Define single source-of-truth definitions (`*.tool-definitions.ts`). Bind them into both transports via generic adapters (`registerMcpTool`, `agentOpts`) without repeating parameter types or descriptions.
3. **Component LoC Budgets & Specialized Presenters**:
   - *Symptom*: Tool visualizers or screen components growing beyond 600 LoC due to repeating action card layouts, button styles, headers, and status badges.
   - *Fix Direction*: Extract reusable presentation primitives (`ToolActionCard`, `ToolCompactRow`, `BadgePill`) to standardize the visual hierarchy and keep domain visualizers lean (< 500 LoC).
4. **State-Lifecycle vs. Read-Timing Mismatch**:
   - *Symptom*: Using `useState` + `useEffect` + string-signature `useRef` guards to sync child data into a parent when the parent only reads that data on-demand during an interaction (e.g., `useRegisterBlockActions` feeding `BlockWrapper`'s `OptionSheet`, which only mounts when `isOptionsOpen === true`).
   - *Fix Direction*: Replace `useState` and `useEffect` with a synchronous `useRef` assignment (`if (actionsRef) actionsRef.current = actions`) read when the sheet/modal opens.
5. **Intermediate Data-Structure Overhead**:
   - *Symptom*: Memoizing derived ID arrays (`activeIds`, `checkedIds`) and allocating `new Map(...)` on every action when the caller already holds the filtered object array (`group: ListItem[]`).
   - *Fix Direction*: Pass the object slice (`group: ListItem[]`) directly to helpers (`reorderListGroup`, `removeEmptyItemOnBackspace`).
6. **JSX & Handler Boilerplate**:
   - *Symptom*: Copy-pasted JSX blocks (e.g., identical 12-prop `<ListItemRow />` maps for active and checked items, duplicate Header/Footer `TextInput` wrappers, separate `Add`/`Remove` sheet items, or repeated `setIsOpen(false); Haptics.selectionAsync();` closures).
   - *Fix Direction*: Consolidate into local render helpers (`renderGroup`, `renderMetaField`, `wrapAction`), unified directional handlers (`handleMoveBlock(index, -1 | 1)`), and shared factories (`block-factories.ts`).

---

## Audit Dimension 3: $O(1)$ Rendering, Hook & Worklet Pitfalls

- **Unmemoized `useLiveQuery` & State Mirror Loops**:
  - Flag `useLive*` hooks returning `.map(...)` without `useMemo([result.data])`.
  - Flag `useEffect(() => setState(liveData), [liveData])` (causes infinite re-render loops when combined with unmemoized live queries).
- **Per-Keystroke SQLite / Outbox I/O & Premature Overlay Clearing**:
  - Flag `onChangeText` handlers that call SQLite `update*` or `enqueueOutbox` on every character, or thread `shouldSync` flags through data-layer queries.
  - Require in-memory staging (`useStagedBlockUpdates` with synchronous `dirtyBlocksRef` + `dirtyOverlay`) that commits only on `onBlur` (`commitBlock`), discrete structural actions (`handleImmediateUpdate`), or editor exit (`await flushBlocks()` before `setIsEditing(false)` on `Done`, `beforeRemove`, and `AppState` backgrounding).
  - Flag clearing optimistic overlays *before* SQLite writes complete (`clearDirtyEntry` before `await updateBlock`), which drops back to old DB data and causes visible text flicker or input reverts. Retain overlays until live query re-emits.
- **Timer-Based Focus Race Conditions**:
  - Flag `setTimeout(() => input.focus(), N)` after creating or splitting items. Slower DB writes or rendering cause the timer to fire before mount, silently dropping keyboard focus. Use deterministic mount-driven focus (`pendingFocusRef` checked in `registerInputRef`).
- **Broken `React.memo` Boundaries ($O(N)$ Sibling Re-renders on Keystroke)**:
  - Flag inline arrow callbacks (`onChange={(v) => fn(id, v)}`, `onMoveUp={() => move(idx, -1)}`) or `useCallback(..., [items])` passed inside `.map()` loops to `React.memo` children (`BlockRow`, `ListItemRow`). Because `items` or `blocks` updates on every keystroke, any callback depending on `[items]` changes reference on every character and forces all $N$ sibling rows/blocks to re-render.
  - *Fix Direction*: Extract memoized row wrappers (`BlockRow`) and back row callbacks with a latest-state `useRef` (`stateRef.current = { items, activeItems, checkedItems, ... }`) + `useCallback(..., [])` so typing re-renders **only the 1 active row/block ($O(1)$)**.
- **React Compiler Invariants & Render Ref Mutations**:
  - Flag mutating refs directly during render (`stateRef.current = ...`, `blocksRef.current = ...`). When `"reactCompiler": true` is enabled (as in `apps/mobile/app.json`), render ref mutations cause the compiler to skip optimizing the component. Synchronize refs inside `useLayoutEffect`.
  - *Note*: `@repo/mobile`'s `lint` script is currently `tsc --noEmit`, so ESLint hook rules will not run automatically on mobile code—the reviewer must verify hook and ref invariants manually.
- **Native Gesture Re-registration & Worklet Traps**:
  - Flag `useMemo(() => Gesture.Pan()..., [deps])` where `deps` includes an unstable callback (causes `react-native-gesture-handler` to tear down and recreate $N$ native gestures on every keystroke).
  - Flag deprecated Reanimated v3 `runOnJS` (must use `scheduleOnRN` from `react-native-worklets`), and avoid capturing module namespace objects (`* as Haptics`) inside worklets.
  - Flag combining `layout={ROW_LAYOUT}` and gesture drag transforms (`style={animatedRowStyle}`) on the same `Animated.View` (causes layout transitions and drag offsets to collide and jitter on row swap). Separate into an outer layout `<Animated.View>` and an inner transform `<Animated.View>`.
  - Flag inline `LinearTransition.springify()...` allocations inside component render (hoist to module-level constants).
  - Flag nesting `VirtualizedList` / `FlatList` (e.g., `ReorderableList`) inside an outer `<ScrollView>` (`NoteEditor`).

---

## Audit Dimension 4: Sync Pipeline, Data Layer & AI Agent Contracts

- **Tool Schema Optionality Trap ($O(1)$ Tool Robustness & `rawInput` Avoidance)**:
  - Flag optional or defaulted tool parameters defined with plain `z.string().optional()` or `z.number().default(...)`. LLMs frequently pass explicit `null` for omitted fields (`{ folderId: null }` or `{ limit: null }`), causing Zod schema failures, triggering AI SDK v7 `rawInput` deprecation warnings, or aborting execution with `InvalidToolInputError`.
  - Require `optionalNullable(schema)` (for optional values) and `defaultNullable(schema, defaultValue)` (for defaulted values) to normalize `null` to `undefined` or fallback values.
  - Require strict format validation for UUID identifiers (`optionalId`) that reject placeholder strings (e.g., `'null'`, `'undefined'`, `''`).
- **Wire Size Budgets & Context Window Protection (HTTP 413 Prevention)**:
  - Flag mobile chat clients that serialize the full conversation history across the network on every turn. In persistent chat architectures, mobile `prepareSendMessagesRequest` must send **only the latest user message** (`[messages[messages.length - 1]]`).
  - Flag backend agent orchestration that invokes LLM APIs with unbounded conversation histories. Backend must enforce message pruning (`pruneMessages`), context window token budgets, or summarization to prevent payload overflows and HTTP 413 "Request Entity Too Large".
- **Cross-Stack Schema & Type Parity**:
  - Flag any DB model/field change that is not updated across all 4 layers: `@repo/types`, mobile Drizzle SQLite schema (`apps/mobile/src/db/schema.ts`), backend Prisma schema (`apps/api/prisma/schema.prisma`), and NestJS sync DTOs (`sync-push.dto.ts`).
- **Orphan Child FK & Draft-to-Persisted Transition**:
  - Flag child creation (`createBlock(noteId, input)`) that does not verify/create the parent `notes` row inside the data layer (`if (!existingNote) await createNote({ id: noteId })`), or leaks parent fields (`folderId`) into child creation signatures.
  - Flag `NoteEditor.saveNote()` if it branches only on `isNewDraft` without checking `await getNoteById(data.id)`—once `createBlock` inserts the parent row, `saveNote()` must call `updateNote(data.id, ...)` so `title`, `folderId`, `tags`, and `isPinned` are not silently dropped on exit.
  - Flag entity actions (pin, archive, delete, move folder) that run SQLite queries on unpersisted drafts (`isNewDraft && liveBlocks.length === 0`) or fail to persist immediately in View mode (`!isEditing`).
  - Flag empty-draft checks in `saveNote()` that omit `liveBlocks.length === 0`.
- **Mid-Loop Sync Race & Redundant Position Writes**:
  - Flag `deleteBlock` and `reorderBlocks` if they update rows whose `position` did not change, or if they call `enqueueOutbox` inside the SQLite update loop (must finish all local SQLite position updates first, then enqueue outbox mutations).
- **Wire Semantics, ES2022+ DTO Trap & Server Delete**:
  - Flag `'key' in dto` checks on NestJS DTO instances (`target: "ES2023"` initializes class fields to `undefined`, making `'header' in b.changes` always `true`).
  - Flag using `undefined` to clear optional fields over JSON (`JSON.stringify` strips `undefined` keys). Require explicit `null` (`{ header: null }`), `@ValidateIf((_, v) => v !== null)` on DTOs, and `toBlockOutboxPayload` / `packServerBlockContent`.
  - Flag server LWW handlers (`upsertBlockWithLww`) that do not handle `action === 'delete'` with parent-ownership verification.
- **Outbox Failure Classification & Poison-Pill Protection**:
  - Flag sync error handlers that increment `retryCount` or mark mutations `failed` on offline/auth/rate-limit statuses (`0`, `401`, `403`, `408`, `429` → must reset `in_flight` to `pending` with zero penalty via `classifySyncPushFailure`).
  - Flag `getPendingOutbox` if `lt(syncOutbox.retryCount, SYNC_CONSTANTS.MAX_RETRIES)` is missing or commented out.

---

## Audit Dimension 5: Monorepo Build & Bundler Integrity

- **Rspack `webpack-node-externals` Crash (`apps/api`)**:
  - Flag any **runtime value import** from `@repo/*` inside `apps/api/src/**` (`import { foo } from '@repo/...'`). `apps/api` builds with Rspack and externalizes `@repo/*` in `dist/main.js`, crashing in production (`bun dist/main.js`).
  - Only `import type { ... } from '@repo/types'` is permitted in `apps/api`; runtime schemas/codecs must use `apps/api` direct dependencies (`zod`, `class-validator`).
- **`nodenext` vs. JIT Package Archetype (`packages/types`)**:
  - Flag adding `"type": "module"` to `packages/types/package.json` while it exports raw `.ts` files with extensionless relative imports (`export * from './notes'`), which breaks `apps/api` (`"moduleResolution": "nodenext"`) with `TS2835`.
- **Cross-Platform Purity**:
  - Flag Node APIs (`fs`, `path`, `process.env`) in shared `@repo/*` packages or mobile code, and unguarded DOM APIs (`window`, `document`, `localStorage`) in mobile code.

---

## Output Format

Group findings by severity. Use clickable markdown links (`[file:line](file:///absolute/path#L...)`). Be terse and specific—state the defect, its runtime/LoC cost, and the exact fix.

```markdown
## Review Summary
- **Files Audited**: N
- **Net LoC Assessment**: +X / -Y (Est. ~Z lines removable)
- **Typecheck / Build**: Pass | Fail

### 🔴 Critical Anomalies & Bugs
- [notes.service.ts:345](file:///.../notes.service.ts#L345) — `'header' in b.changes` is always `true` on ES2023 DTO instances. Use explicit `null` via `packServerBlockContent`.

### 🟠 Redundancy & LoC Bloat
- [list-block.utils.ts:76-159](file:///.../list-block.utils.ts#L76-L159) — (~60 LoC bloat) Control-flow isomorphism: 3 separate split branches (`Enter`, empty paste, multi-line paste) build the same array splice. Normalize `parsedLines` into `[first, ...rest]` and splice once.

### 🟡 Performance & Render Pitfalls ($O(N)$ vs. $O(1)$)
- [list-block.tsx:194-208](file:///.../list-block.tsx#L194-L208) — Inline `onMoveItem` arrow inside `.map()` defeats `React.memo(ListItemRow)` and recreates $N$ `Gesture.Pan()` instances per keystroke. Back callbacks with `stateRef` + `useCallback(..., [])`.

### 🔵 Scope & Hygiene
- [note-editor.tsx:18](file:///.../note-editor.tsx#L18) — Out-of-phase `expo-image-picker` import in Phase 1. Remove until Phase 3.
```
