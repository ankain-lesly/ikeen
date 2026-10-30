# Implementation Plan: Custom Option Sheet Refactor

## Context
Currently, the codebase contains multiple manual implementations of custom bottom sheets (`NotesOptionsDropdown`, `OpenURLSheet`, `EditorToolbarBlocks`, `MoveToFolderSheet`, `NotesFilterSheet`). Each implementation repeats boilerplate for managing `isPresented`, dismissal handlers, sheet container styling, and action button rendering.

This refactor proposes creating a centralized `OptionSheet` component to unify this experience and simplify the codebase.

---

## Architecture & Design Goals

1. **New Component: `OptionSheet` (`apps/mobile/src/components/ui/option-sheet.tsx`)**
   - **Purpose**: A reusable, generic wrapper around `@expo/ui`'s `BottomSheet`.
   - **Props Interface**:
     - `isPresented: boolean`
     - `onDismiss: () => void`
     - `title?: string | React.ReactNode`
     - `actions: Array<{ label: string, icon: React.ReactNode, onPress: () => void, color?: string, visible?: boolean }>`
     - `children?: React.ReactNode` (for custom layouts)
     - `snapPoints?: string[]` (optional override)

2. **Standardization**:
   - All existing sheet implementations will be refactored to use `OptionSheet` where appropriate.
   - `NotesOptionsDropdown` (sheet mode), `OpenURLSheet`, `EditorToolbarBlocks` will be immediate beneficiaries.

---

## Critical Files to Modify / Create

- **New Files**:
  - `apps/mobile/src/components/ui/option-sheet.tsx`: The core reusable sheet component.
- **Modified Files**:
  - `apps/mobile/src/components/notes/notes-options-dropdown.tsx`: Refactor sheet mode.
  - `apps/mobile/src/components/notes/open-url-sheet.tsx`: Replace manual sheet.
  - `apps/mobile/src/components/notes/editor-toolbar-blocks.tsx`: Replace manual sheet.
  - `apps/mobile/src/components/notes/move-to-folder-sheet.tsx`: (Partial refactor if applicable).

---

## Detailed Implementation Steps

### Phase 1: Create `OptionSheet`

Create `apps/mobile/src/components/ui/option-sheet.tsx`:
- Use `BottomSheet` from `@expo/ui`.
- Encapsulate the `RNHostView` and basic container styling.
- Render a header if `title` is provided.
- Render `actions` using a list of `SheetButton` components.
- Render `children` if provided.

### Phase 2: Refactor Existing Sheets

1. **Refactor `OpenURLSheet`**:
   - Use `OptionSheet`.
   - Map `Copy Link` and `Open Link` to the `actions` prop.
2. **Refactor `NotesOptionsDropdown` (Sheet variant)**:
   - Use `OptionSheet`.
   - Map action buttons (Pin, Archive, etc.) to the `actions` prop.
3. **Refactor `EditorToolbarBlocks`**:
   - Use `OptionSheet`.
   - Map actions (Camera, Media, Checkbox, etc.) to the `actions` prop.

---

## Verification Plan

1. **Visual & Interaction Check**:
   - Ensure sheets open and dismiss as expected.
   - Verify all action handlers continue to trigger correctly.
   - Validate theming consistency.
2. **Typecheck & Lint**:
   - Run `npx tsc --noEmit` and `npx expo lint`.
