## Keywords

- tombstones

## Markdown Renderer

- https://github.com/software-mansion/enriched-markdown
- https://github.com/Expensify/react-native-live-markdown
- Expo UI: https://github.com/SchroederNathan/expo-ui-examples/blob/main/src/examples/rich-text-editor/index.tsx?trk=public_post_comment-text

- Add a link that users can use to request that their account and associated data is deleted 

######################

I need  a workflow that send a summary of all recent discord events every 3days? whats the best fit system to do this?

################

Analyze and plan the the system requirements below and implement. /plan

---

## Note Block Issues

### Phase 1: Sync Optimization, Block Sync Integrity & Wrapper Action Injection
- [ ] **Debounce Block Updates & Sync Triggers**: Prevent individual block property/text edits from triggering SQLite writes and network sync on every keystroke; debounce typing updates and coalesce outbox sync triggers with immediate flush on editor exit/blur. Simply passing a shouldSync to the update   function depending on input.
- [ ] **Fix Media & Block Sync Pipeline**: Ensure parent draft notes persist before block creation (preventing foreign-key/unfound parent errors), handle `delete` block mutations on the server, preserve `list` metadata (`listType`, `header`, `footer`), and update `media` item `synced` state.
- [ ] **Inject Block Actions into `BlockWrapper`**: Allow child blocks to register contextual actions into the parent `BlockWrapper` `OptionSheet` (moving `ListBlock` type switching, `+ Header`, and `+ Footer` out of inline block UI into the wrapper menu).

### Phase 2: Interactive List Block Experience
- [ ] **Enter Key Newline Creation**: Pressing `Enter` on a list block item input creates a new list item directly below and focuses it; pressing `Backspace` on an empty item removes it and focuses the previous item; Pasting text should automatically separate into items if valid.
- [ ] **Checked Items Section & Slide Animation**: Checking a checkbox item filters it down into a dedicated `Checked Items` section with a smooth Reanimated slide-in/slide-out transition.
- [ ] **Intra-List Item Reordering**: Support drag-and-drop reordering for individual items inside a `ListBlock`.

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


RL9R89
