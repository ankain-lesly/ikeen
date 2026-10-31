---
name: ikeen-desktop-design
description: Design system guidelines, layout conventions, and UI hygiene rules for the iKeen Tauri/React desktop application. Use whenever modifying desktop components, layouts, typography, or styling.
---

# iKeen Desktop Design System & UI Hygiene (`ikeen-desktop-design`)

This skill governs all user interface development across `apps/desktop`. Its purpose is to maintain a **clean, distraction-free, cybernetic markdown workspace** with zero visual clutter.

---

## 1. Core Design Philosophy: High-Signal Minimalism

The desktop client is a high-performance note-taking environment inspired by tools like Linear, Obsidian, and Bear. 

- **Content First**: The editor canvas and notes index are the stars. Chrome, navigation, and toolbar controls should be quiet, minimal, and recede into the background until needed.
- **Typography Over Chrome**: Differentiate hierarchy through font weights, text colors (muted vs. foreground), and whitespace—**not** through heavy borders, background boxes, or badges.
- **Keyboard-First Ergonomics**: Provide unobtrusive visual hints (`⌘\`, `⌘N`, `⌘K`, `⌘,`) rather than loud action buttons.

---

## 2. Strict UI Hygiene: Zero "Garbage Badges" & Engine Trivia

### ❌ What to NEVER Include:
1. **Developer / Engine Trivia**:
   - Never show database or runtime labels in user-facing views (e.g. `SQLite indexed`, `SQLite Local`, `Tauri v2 IPC Active`, `WebView2`).
   - Technical diagnostics belong in **Settings (⌘,)** or internal debug logs, never on the main writing canvas or sidebar.
2. **Superfluous Version & Status Pills**:
   - Never add decorative version tags (`v2`, `v2.0 Core`) in headers or sidebars.
   - Never add permanent connection/sync status chips (e.g. `Local Sync`, `Online`) across primary toolbars. Sync status should be a quiet dot indicator in settings or subtle icon state.
3. **Chip / Badge Proliferation**:
   - Do not wrap every metadata tag (`#tag`) in an outline `<Badge>` chip with borders and remove icons. Render tags with clean, muted typography.

---

## 3. Single-Responsibility Component Architecture

Every component in `apps/desktop/src/components/` must be dedicated to **one target feature domain**:

| Component | Dedicated Responsibility | Strictly Prohibited Content |
| :--- | :--- | :--- |
| **`EditorPane`** | Note title, tags, markdown text editing & preview | System diagnostics, IPC benchmarks, database status chips |
| **`NotesListPane`** | Note browsing, searching, and sorting | Database engine counters (`SQLite indexed`), clutter bars |
| **`AppSidebar`** | Navigation categories & folder hierarchy | Version tags (`v2`), engine badges, extraneous widgets |
| **`NoteCardItem`** | Note title, snippet preview, and timestamp | Overlapping badge chips, redundant visual borders |
| **`SettingsDialog`** | Preferences, shortcut key map, diagnostic reports | Writing tools, note manipulation |

---

## 4. shadcn & Base-UI Component Best Practices

1. **Self-Encapsulated States**:
   - `AppSidebar` encapsulates its own shadcn `Sheet` drawer, trigger button, and keyboard shortcut listeners (`⌘\`).
   - Never leak drawer open/close flags or portal logic into parent layouts like `App.tsx`.
2. **State Management with Zustand**:
   - Use dedicated Zustand stores (`useSidebar`) for cross-component flags instead of ad-hoc React Context or prop drilling.
3. **Resizable Panel Ratios**:
   - In `react-resizable-panels`, always use explicit percentage strings (e.g. `defaultSize="32%"`, `defaultSize="68%"`) to prevent numeric pixel collapses.

---

## 5. Review Checklist Before Completing Any Desktop UI Task

- [ ] Does any header contain engine trivia (`SQLite`, `Tauri`, `IPC`)? If yes, remove.
- [ ] Are note tags rendered as clean typography rather than heavy badge chips?
- [ ] Does the note editor contain only writing/preview modes (`Edit` / `Preview`)?
- [ ] Does the component manage its own local UI state cleanly without prop drilling?
- [ ] Does `bun run --cwd apps/desktop build` pass with 0 errors?
