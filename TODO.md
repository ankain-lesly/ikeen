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

For the code present, we get this error:
```
Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

C:\Users\Dev Lee\Documents\@DevLee\mobile\ikeen\apps\mobile\src\app\agent\index.tsx:280:12
  278 |
  279 |     if (paramConversationId !== session.id && token) {
> 280 |       void handleSelectConversation(paramConversationId);
      |            ^^^^^^^^^^^^^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  281 |     }
  282 |   }, [
  283 |     handleNewChat,
```
Fix it, verify, and then give a concise explanation. @ikeen/apps/mobile/src/app/agent/index.tsx:279-282 


---

## Desktop

Currently I cant tell of the desktop app uses the prod or dev backend. Implement the health enpoint that updates a label on the sidebar bottom that shows a lable this label indicator should come from the api health check endpoint. The desktop app

---


QXZ857

