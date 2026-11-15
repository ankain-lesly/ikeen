# Desktop Validation & Hardening Plan (`apps/desktop`)

## Goal Description
Validate the recent desktop work (media upload pipeline, block persistence, editor debounce, sync wiring) against the `keen-review` dimensions and fix real defects with minimal code. No references were attached to the request, so I validated against the approved media-pipeline plan and the current code. Every finding below is confirmed by reading the code or config, not assumed.

> [!NOTE]
> Typecheck and build already pass. The defects below are runtime and data-integrity issues that the compiler cannot catch.

---

## Confirmed Findings

### 🔴 Critical

| # | Defect | Evidence | Impact |
|---|---|---|---|
| C1 | **Tauri cannot write, read, or display sandboxed media.** `capabilities/default.json` has only `fs:default` (no AppData write or read scope), and `tauri.conf.json` has no `assetProtocol`. | `src-tauri/capabilities/default.json` L23, `tauri.conf.json` L36-38 | `writeFile` to AppData fails silently and falls back to a `blob:` URL (`file-system.ts`). The blob dies on restart, so the image breaks and the upload job later fails with "file not found". `convertFileSrc` URLs are blocked. |
| C2 | **Uploaded cloud URL is overwritten by stale editor state.** `reconcileUploadedMediaUrl` writes `url` to SQLite, but `EditorPane` keeps its own `blocks` state (`url: undefined`). The next debounced save (`saveBlocksForNote`) writes that stale content back and erases the URL. | `upload-service.ts` reconcile, `EditorPane.tsx` `handleUpdateBlocks` | The image is uploaded but the cloud URL is lost, and the item is re-enqueued and re-uploaded forever. |
| C3 | **Duplicate and resetting enqueue.** `EditorPane` enqueues (with the File), and `saveBlocksForNote` enqueues again for every `localUri && !url` item on every save. The `onConflictDoUpdate` sets `status:'pending'` even while the job is `uploading`. | `EditorPane.tsx` L272, `note-blocks.ts` L137 | Typing in a checklist while an upload runs resets the job and causes duplicate uploads. |
| C4 | **Debounced edits are lost.** The unmount cleanup clears both debounce timers without flushing. Switching notes (the `key` remount) within 400 ms drops the last edits for the title, content, and blocks. | `EditorPane.tsx` cleanup effect | Silent data loss. This regressed when the per-keystroke saves were debounced. |

### 🟠 High

| # | Defect | Fix direction |
|---|---|---|
| H1 | **Retry poison-pill.** Offline, 401, 403, 408 and 429 uploads consume `retryCount` and become `failed` after 5 tries. Mobile uses `transient_no_penalty` for these. | Mirror mobile's `classifyMediaUploadFailure`. |
| H2 | **Outbox churn.** `saveBlocksForNote` upserts and enqueues every block with a fresh `updatedAt` on every save, not just changed blocks. One keystroke in one checklist makes N outbox rows and bumps unrelated blocks. | Skip unchanged blocks by comparing against the existing packed content. |
| H3 | **Whole-store subscription.** `useMediaUploadStore()` with no selector re-renders the whole editor on every progress tick. The `useMediaUploadProgress` selector already exists but is unused. | Extract a small `MediaThumb` component that uses `useMediaUploadProgress(item.id)`. |

### 🟡 Medium

| # | Defect | Fix direction |
|---|---|---|
| M1 | `blob:` fallback in `saveMediaAssetToSandbox` is also used when Tauri writes fail, and it is never revoked. It hides C1. | Only use the blob fallback when `!isTauri()`. In Tauri, throw and skip the item. |
| M2 | `uploadMediaJob` guesses the MIME type from the filename extension and defaults to `image/jpeg`. | Persist `metadata.mimeType` (already stored) and read it instead. |
| M3 | `SyncOutboxDialog.tsx` is 703 LoC, above the 500 LoC budget. | Defer. Extract the inspector in a later refactor (no behavior change). |

### ✅ Validated clean
- Enter-to-focus uses mount-driven `pendingFocusItemId`, not `setTimeout`.
- Base64 is banned in the editor and the outbox payload.
- `Settings` exposes only user-facing, wired controls.
- Version stays `0.1.0`.
- No raw SQL in the new queries.

---

## Proposed Changes

### Tauri config (fixes C1)
#### [MODIFY] `src-tauri/capabilities/default.json`
Add scoped fs permissions instead of broad access:
```json
"fs:allow-appdata-read-recursive",
"fs:allow-appdata-write-recursive",
"fs:allow-mkdir",
"fs:allow-exists",
"fs:allow-write-file",
"fs:allow-read-file",
{ "identifier": "fs:scope", "allow": [{ "path": "$APPDATA/media/**" }] }
```
#### [MODIFY] `src-tauri/tauri.conf.json`
```json
"security": {
  "csp": null,
  "assetProtocol": { "enable": true, "scope": ["$APPDATA/media/**"] }
}
```
Enabling `assetProtocol` also requires the `protocol-asset` feature on `tauri` in `src-tauri/Cargo.toml`.

> [!IMPORTANT]
> The `Cargo.toml` change needs a Rust rebuild (`bun run tauri dev`). I cannot verify the asset protocol in `vite build` alone. You will need to confirm it visually in the running app.

### Media service (fixes C2, C3, H1, M1, M2)
#### [MODIFY] `lib/media/upload-service.ts`
- `enqueueMediaUpload`: on conflict, do not reset a job that is `uploading` or `completed`:
  ```ts
  .onConflictDoNothing({ target: mediaSyncOutbox.id })
  ```
  This is used for first enqueue. A separate explicit `retryMediaUpload(id)` sets `pending`.
- `reconcileUploadedMediaUrl`: after the DB write, notify the editor with a tiny `onMediaUploaded(blockId)` listener set (same pattern as `onSyncComplete`) so the open editor reloads its blocks. This also makes the displayed `url` the cloud URL.
- Add `classifyMediaUploadFailure(status)`. For 0, 401, 403, 408 and 429 reset to `pending` without incrementing `retryCount`. For 5xx increment. For other 4xx fail immediately. Surface the HTTP status from the XHR rejection.
- MIME type: read from the block item's `metadata.mimeType`.

#### [MODIFY] `lib/media/file-system.ts`
Use the `blob:` fallback only when `!isTauri()`. On a Tauri write error, rethrow so the caller skips the item.

#### [MODIFY] `lib/queries/note-blocks.ts` (fixes C3, H2)
- Remove the `enqueueMediaUpload` loop from `saveBlocksForNote`. `EditorPane` stays the single enqueue site, and sync-pulled blocks never carry a `localUri`. This also removes the `note-blocks -> upload-service` import.
- Before each upsert, compare `packedContent` and `position` against `existing` (already fetched via `listBlocksForNote`) and skip unchanged blocks, so there is no outbox row and no `updatedAt` bump:
  ```ts
  const prev = existingById.get(b.id);
  if (prev && prev.position === pos && packDesktopNoteBlockContent(prev) === packedContent) { result.push(prev); continue; }
  ```
- Merge guard for C2: if the DB already holds a cloud `url` for an item id and the incoming item has none, keep the DB `url`:
  ```ts
  // in media blocks: item.url ??= prevItemsById.get(item.id)?.url
  ```

### Editor (fixes C2, C4, H3)
#### [MODIFY] `components/editor/EditorPane.tsx`
- **Flush on unmount** instead of discarding. Keep `pendingBlocksRef` and `commitChangesRef`, and in the cleanup call `flush()`:
  ```ts
  useEffect(() => () => {
    clearTimeout(debounceTimerRef.current ?? undefined);
    clearTimeout(blockDebounceTimerRef.current ?? undefined);
    commitChangesRef.current();                 // title and content
    if (pendingBlocksRef.current) void saveBlocksForNote(noteId, pendingBlocksRef.current);
  }, []);
  ```
  Because the editor is keyed by note id, the unmount runs for the old note, so the captured id is correct.
- Subscribe to `onMediaUploaded` and reload blocks (`listBlocksForNote`) when the uploaded block matches the open note.
- Replace `const uploadStore = useMediaUploadStore()` with a `MediaThumb` subcomponent using `useMediaUploadProgress(item.id)`. This also trims about 25 lines of inline JSX from the 1000-line `EditorPane`.
- Retry button calls `retryMediaUpload(item.id)`.

> [!TIP]
> `EditorPane.tsx` is about 1,040 LoC. This plan only extracts `MediaThumb`. A fuller split (checklist block, text block, preview blocks) is a separate, behavior-neutral refactor that I propose to record in `TODO.md` rather than do now, per the anti-bloat rule.

### Tracking
#### [MODIFY] `FEATURE-CHECKLIST.md` and `TODO.md`
Add this hardening pass with the current date. Add `SyncOutboxDialog` and `EditorPane` extraction as proposed TODO items. No git staging.

---

## Open Questions

> [!IMPORTANT]
> 1. **Scope of the fs permissions:** I plan `$APPDATA/media/**` only. Is that acceptable, or do you want pictures picked from anywhere readable in place instead of copied?
> 2. **Unresolved-media behavior:** when a Tauri write fails, I propose skipping that file silently and logging a warning. Do you want a toast instead? (A toast would be user-visible diagnostics, so my default is silent.)

---

## Verification Plan

### Automated
```bash
node node_modules/typescript/bin/tsc --noEmit -p apps/desktop/tsconfig.json
bun run --cwd apps/desktop build
```
I will not run the full-repo `bun run check-types` through turbo again. It hung for more than 8 minutes on `@repo/mobile`/`@repo/api` earlier, so I will scope checks to `apps/desktop`.

### Manual (run in `bun run tauri dev`)
1. Add an image, restart the app: the thumbnail still renders (C1).
2. While it uploads, type in a checklist: the outbox row shows one upload job and the status does not reset (C3).
3. After upload, keep typing: the SQLite block still has the cloud `url` and the item is not re-uploaded (C2).
4. Type in the content, then switch notes within 400 ms: the text persists (C4).
5. Go offline and add an image: the job stays `pending` with `retryCount = 0`. Reconnect and it uploads (H1).
6. Edit one checklist item: only that block gets a new `sync_outbox` row (H2).
</Content>
<parameter name="Overwrite">true