## Keywords

- tombstones

## Markdown Renderer

- https://github.com/software-mansion/enriched-markdown
- https://github.com/Expensify/react-native-live-markdown
- Expo UI: https://github.com/SchroederNathan/expo-ui-examples/blob/main/src/examples/rich-text-editor/index.tsx?trk=public_post_comment-text
- [ ] Fix `EnrichedMarkdownTextInput` stripping markdown snippets (e.g., codeblocks converted to plain text) when editing; `MarkdownEditor` currently uses `TextInput` until a finite rich-text/markdown editor solution is finalized.

- Add a link that users can use to request that their account and associated data is deleted 

######################

I need  a workflow that send a summary of all recent discord events every 3days? whats the best fit system to do this?

################

## Note Block Issues

### Phase 4: NoteCard Structured Block & Media Previews
- [ ] **First Block Preview Fallback**: When `note.content` is empty, render a structured preview of the first block in `note.blocks` (e.g., text excerpt or compact checklist preview) inside `NoteCard`.
- [ ] **NoteCard Media Thumbnail**: When a note contains a `media` block, display a thumbnail for the first or most recently added media item on `NoteCard`.

## Note Content Legacy

- Eliminate Note.content in future release and rely only on note.blocks

## Add Background Image

Add a setting background image to the notes app and optionally for each note setup


## Note List and Wrapper 
- Re-evaluate the note list items and wrapper base business logic if it can be simplified. It has a lot of source code for simple tasks
- apps\mobile\src\components\notes\blocks\list-block.tsx

## Validate In Flight Sync
- in flights should not reset on startup, simple updates the query to find plus failed or processing before syncing fresh Todo
- conflicts between updating outbox data in in inflight. What is the flow and mitigations


---

Atlassian
 
---

## Features

- Reminders: Add reminder button on the note-bulk-actions when feature is implemented
- Scratchpad: A single view For dumping unorganized notes ideas. Also Synced. (Architecture. User creates/assigns a specific note only visible as scratchpad)
- Sides when integrating reminders


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

EEJ73W