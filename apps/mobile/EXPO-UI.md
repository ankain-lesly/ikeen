Here are the specific UI elements in the Notes feature that can either be fixed or are significantly better off using the **`@expo/ui`** package:

---

### 1. Filter Switcher (`All` / `Pinned` / `Archived`)
* **Current State**: Custom `Pressable` pill buttons styled with Tailwind/Uniwind CSS.
* **Why `@expo/ui` is better**: `@expo/ui` provides the native **`SegmentedControl`** (SwiftUI `Picker` style `.segmented` / Compose `SegmentedButton`).
  * Delivers the authentic physical sliding thumb animation with spring physics.
  * Native haptic clicks built into segment changes.
  * Adapts automatically to system vibrancy and dynamic light/dark mode.

---

### 2. Sort Selection Menu
* **Current State**: A single button that cycles through `Modified` ➔ `Created` ➔ `Title` on every tap because custom dropdowns in React Native are clunky.
* **Why `@expo/ui` is better**: `@expo/ui` provides native **`Menu`** / **`DropdownMenu`**.
  * Tapping the button opens a true native menu.
  * Shows checkmarks (`isOn`) next to the active sort order.
  * Includes icons and section dividers without managing custom modal overlays or z-indexes.

---

### 3. Note Card Swipe Actions
* **Current State**: No swipe actions (only tap or long-press) because JS swipe gesture libraries (`react-native-gesture-handler` swipeables) often stutter or conflict with vertical scrolling.
* **Why `@expo/ui` is better**: `@expo/ui` supports native **`SwipeActions`**.
  * Native leading swipe to **Pin/Unpin** (tinted accent color).
  * Native trailing swipe to **Archive** or full-swipe to **Delete** (destructive red with system haptics).
  * Zero scroll hitching or JS bridge overhead.

---

### 4. Note Card Long-Press Context Menu
* **Current State**: Uses Expo Router's `Link.Menu`, which is tightly bound to navigation routing and primarily iOS-only.
* **Why `@expo/ui` is better**: `@expo/ui` provides native **`ContextMenu`**.
  * Can be placed on any component directly without requiring navigation `<Link>` wrapping.
  * True SwiftUI `contextMenu` on iOS (with preview scaling and blur) and Jetpack Compose floating context menu on Android.
  * Supports submenus (e.g. `Move to Tag ➔ #work, #personal`).

---

### 5. Note Info & Metadata Sheet (`NoteInfoSheet`)
* **Current State**: Implemented with React Native's `<Modal transparent>`, which lacks interactive downward drag-to-dismiss gestures and sheet snapping detents.
* **Why `@expo/ui` is better**: `@expo/ui` provides native **`BottomSheet`** (SwiftUI `.sheet` / Compose `ModalBottomSheet`).
  * Native sheet detents (`['medium', 'large']`).
  * Fluid interactive drag-down dismissal and rubber-band physics.
  * Native sheet grabber handle and system background blur.

---

### 6. Tag Selection & Multi-Picker
* **Current State**: Manual text input and chip rendering.
* **Why `@expo/ui` is better**: `@expo/ui` provides native **`Picker`** (with `menu` style).
  * Enables selecting from existing tags via a native compact popover menu.
  * Checkmark multiple tags directly from a single native interface.

---

### 7. Editor Pin / Archive Switches
* **Current State**: Icon pressables with manual color fills.
* **Why `@expo/ui` is better**: `@expo/ui` provides native **`Toggle`** / **`Switch`**.
  * Built-in platform haptics and accessibility switch states without writing custom animations.