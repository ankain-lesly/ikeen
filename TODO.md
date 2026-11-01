## Markdown Renderer

- https://github.com/software-mansion/enriched-markdown
- https://github.com/Expensify/react-native-live-markdown
- Expo UI: https://github.com/SchroederNathan/expo-ui-examples/blob/main/src/examples/rich-text-editor/index.tsx?trk=public_post_comment-text
- [ ] Fix `EnrichedMarkdownTextInput` stripping markdown snippets (e.g., codeblocks converted to plain text) when editing; `MarkdownEditor` currently uses `TextInput` until a finite rich-text/markdown editor solution is finalized.

- Add a link that users can use to request that their account and associated data is deleted 

---

## Note Content Legacy

- Eliminate Note.content in future release and rely only on note.blocks

## Add Background Image

- Add a setting background image to the notes app and optionally for each note setup

## Tool Definition & Sync Invalidation Co-location (Approach A)
- [ ] Refactor `TOOL_MUTATION_ENTITIES` record lookup to co-locate `mutates: readonly SyncEntity[]` directly on tool definition schemas (e.g., `notes.tool-definitions.ts`, `folders.tool-definitions.ts`).
  - **Motivation**: Eliminate risk of dictionary drift when adding new tools in the future.
  - **Design**:
    - Extend tool definition interfaces with `mutates?: readonly ('notes' | 'note_blocks' | 'folders')[]` (aligned with MCP annotations like `readOnlyHint`).
    - Both `AgentService` and `IkeenMcpServer` derive invalidation targets dynamically from the tool definition metadata.
    - Deprecate static `TOOL_MUTATION_ENTITIES` dictionary in `apps/api/src/modules/sync/sync-events.constants.ts`.

---

## Features

- Reminders: Add reminder button on the note-bulk-actions when feature is implemented
- Scratchpad: A single view For dumping unorganized notes ideas. Also Synced. (Architecture. User creates/assigns a specific note only visible as scratchpad)
- Sides when integrating reminders


##

- Gallery
- Agents sidebar

## Home Sidebar Design

---
## Ikeen

- Notes
- Folders
- Scratch Pad
- Chat
- Reminders

---
- Add Note
- Add Folder
---

### Recent Notes (Completed)
---


## Important Before Release

- Ensure inflight issue tested



#######

## Desktop

- Roadmap to build a desktop app with Tauri for the notes app (floating app toolbar on screen for quick actions, open app, launch on startup)

C88FUV