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

### Phase 3: Media Block Layout Overhaul
- [ ] **Horizontal Media Carousel**: Replace vertical stacked media cards in `MediaBlock` with a horizontal scrollable carousel for images/visual media.
- [ ] **Dedicated Vertical Audio Layout**: Render audio files (`mediaType === "audio"`) in a separate vertical stack inside `MediaBlock` below visual media.

### Phase 4: NoteCard Structured Block & Media Previews
- [ ] **First Block Preview Fallback**: When `note.content` is empty, render a structured preview of the first block in `note.blocks` (e.g., text excerpt or compact checklist preview) inside `NoteCard`.
- [ ] **NoteCard Media Thumbnail**: When a note contains a `media` block, display a thumbnail for the first or most recently added media item on `NoteCard`.

## Note Content Legacy

- Eliminate Note.content in future release and rely only on note.blocks
- ikeen agents tools up to date with the new notes block system

## Add Background Image

Add a setting background image to the notes app and optionally for each note setup

---

Atlassian
 
---

## Features

- Reminders: Add reminder button on the note-bulk-actions when feature is implemented
- Scratchpad: A single view For dumping unorganized notes ideas. Also Synced
- Sides when integrating reminders


AL9X7E
