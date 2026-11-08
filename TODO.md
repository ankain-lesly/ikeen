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

- [x] Desktop Phase 1 & 2: Local SQLite + Drizzle ORM, bidirectional sync manager, clean sidebar layout, and single-source-of-truth types.
- [x] Desktop Phase 3: Global Quick-Capture HUD (`⌘⇧Space` / `Ctrl+Shift+Space`), background system tray actions, minimize-to-tray on close, and launch on startup (`tauri-plugin-autostart`).
- [ ] Desktop Phase 4: Native keyboard navigation shortcuts & command palette (Cmd+K / Ctrl+K).

5BVHJ5