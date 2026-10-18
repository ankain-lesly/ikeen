# Implementation Checklists

Grouped by todo topic / issue for clearer tracking and context.

## 📱 Custom Option Sheet Refactor
* **Status**: Completed
* **Scope**: Centralize manual bottom sheets and standardize component wrappers across the mobile app.

- [x] Create core `OptionSheet` component (`apps/mobile/src/components/ui/option-sheet.tsx`)
- [x] Refactor `OpenURLSheet` to use `OptionSheet`
- [x] Refactor `NotesEditorToolbarBlocks` to use `OptionSheet`
- [x] Refactor `NotesOptionsDropdown` (Sheet variant) to use `OptionSheet`
- [x] Refactor `MoveToFolderSheet` to use `OptionSheet`
- [x] Run Monorepo Typecheck & Lint verification (`bun run check-types`, `bun run lint`)

---

## 📋 Future / Pending Issues
*(Checklist sections will be added here as new items from `TODO.md` or user requests are picked up for implementation)*
