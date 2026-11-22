## Markdown Renderer

- https://github.com/software-mansion/enriched-markdown
- https://github.com/Expensify/react-native-live-markdown
- Expo UI: https://github.com/SchroederNathan/expo-ui-examples/blob/main/src/examples/rich-text-editor/index.tsx?trk=public_post_comment-text

- [ ] Fix `EnrichedMarkdownTextInput` stripping markdown snippets (e.g., codeblocks converted to plain text) when editing; `MarkdownEditor` currently uses `TextInput` until a finite rich-text/markdown editor solution is finalized.

---

## Desktop Reminders Notification Scheduler

- [ ] Implement native background notification scheduling for Desktop (Tauri v2). Replace client-side setInterval polling with a robust OS-level mechanism: either a Rust background thread / system tray daemon in Tauri or server-side push notification dispatch when reminders reach `dueAt` while the window is closed or unfocused.

---

## Add Background Image

- Add a setting background image to the notes app and optionally for each note setup

---

## Features

- Gallery Nav Link On Agent sidebar when gallery feature is implemented

---

## Home Sidebar Design

QXZ857
