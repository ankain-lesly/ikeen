# Expo UI (`@expo/ui`) & Native Tabs — Mobile Design Reference

This app ships **Expo SDK 57** (`expo ~57.0.21`, `@expo/ui ~57.0.18`). Native controls come from **`@expo/ui`**; bottom tabs use **`expo-router/unstable-native-tabs`**. Uniwind `className` does **not** style Expo UI or NativeTabs primitives — wrap layout in RN `View`s and pass typed props.

Official docs (always prefer the SDK 57 tree over memory):

| Topic | URL |
| :--- | :--- |
| Expo UI overview | https://docs.expo.dev/versions/v57.0.0/sdk/ui/ |
| Universal Host | https://docs.expo.dev/versions/v57.0.0/sdk/ui/universal/host/ |
| Universal Switch | https://docs.expo.dev/versions/v57.0.0/sdk/ui/universal/switch/ |
| Native tabs | https://docs.expo.dev/router/advanced/native-tabs/ |
| Expo UI examples | https://docs.expo.dev/versions/v57.0.0/sdk/ui/ (examples + Hot Chocolate demo) |

Install / align versions with `npx expo install @expo/ui` (already a dependency).

---

## 1. Design rules for `@expo/ui`

1. **Wrap native subtrees in `Host`.** `Host` is the RN ↔ SwiftUI / Compose bridge (like `<svg>` in the DOM). Use `matchContents` when the host should size to its children.
2. **Prefer universal imports for shared screens:** `import { Host, Switch, BottomSheet, Button, TextInput, RNHostView } from '@expo/ui'`.
3. **Platform packages when you need Compose/SwiftUI-only APIs:** `@expo/ui/jetpack-compose` (`DropdownMenu`, `Switch` `onCheckedChange`) and `@expo/ui/swift-ui`. Do not import SwiftUI on Android.
4. **Put React Native content inside native sheets via `RNHostView`.** Used today for filter / folder / chat sheets.
5. **No Uniwind `className` on Expo UI components.** Style surrounding RN views with tokens (`bg-background`, `bg-card`, `text-text`). Pass native colors via props (`containerColor`, `color`).
6. **Inside `Host`, flexbox does not apply to Compose/SwiftUI children.** Use `Row` / `Column` (universal) or `HStack` / `VStack` (SwiftUI). Flexbox only styles the `Host` itself.

---

## 2. Common components (universal first)

Use these for cross-platform notes / settings / search UI. Catalog: [SDK 57 Expo UI](https://docs.expo.dev/versions/v57.0.0/sdk/ui/).

| Component | Role | Used in iKeen |
| :--- | :--- | :--- |
| `Host` | Required wrapper | Filter sheet, switches, dropdowns, search |
| `RNHostView` | RN views inside Compose/SwiftUI | Bottom sheets, dropdown triggers |
| `BottomSheet` | Native sheet + detents + grabber | Notes filter, create folder, move-to-folder, chat drawer |
| `Switch` | Platform toggle | Filter pinned/archived, profile, folder lock, `AppSwitch` |
| `Button` | Native filled/outlined CTA | Search empty-state “Create note” |
| `TextInput` | Native search/field | Search screen (`@expo/ui`) |
| `Row` / `Column` | Native layout inside Host | Search empty-state actions |
| `DropdownMenu` (Compose) | Overflow menus | Folder / note detail overflow |
| `MenuView` (`@expo/ui/community/menu`) | Long-press menu | Chat message list |

**Strong candidates next (already in Expo UI, not required yet):**

- Universal `Picker` / SwiftUI `Menu` — sort field instead of cycling `Pressable`s
- Compose `SegmentedButton` / drop-in `SegmentedControl` — Recent / Pinned / Archived
- SwiftUI `ContextMenu` / `SwipeActions` — note card pin / archive / delete
- Universal `Icon` — SF Symbol on iOS, Material Symbol on Android

Drop-in replacements (API-compatible community libs): `BottomSheet`, `Menu`, `Picker`, `SegmentedControl`, `Slider`, `DateTimePicker` — see the same overview page.

---

## 3. NativeTabs icons — sources and how to download

Tab bar icons live in [`app-tabs.tsx`](src/components/app-tabs.tsx). NativeTabs **does not take `className`**. Icon APIs (SDK 56–57): `sf` (iOS), `md` (Android Material Symbols), `src` (PNG / raster). Docs: https://docs.expo.dev/router/advanced/native-tabs/

### Preferred: system symbol names (no asset download)

Pass names, not files. iOS tints SF Symbols automatically.

```tsx
<NativeTabs.Trigger.Icon
  sf={{ default: 'house', selected: 'house.fill' }}
  md={{ default: 'home', selected: 'home_filled' }}
/>
```

| Platform | Browse / download | How we use it |
| :--- | :--- | :--- |
| **iOS SF Symbols** | [Apple SF Symbols app](https://developer.apple.com/sf-symbols/) (free Mac app; copy the symbol **name**, e.g. `note.text`, `person.fill`) | `sf` / `{ default, selected }` |
| **Android Material Symbols** | [Google Fonts Icons](https://fonts.google.com/icons) — set style to **Material Symbols**, copy the **icon name** (`home`, `sticky_note_2`, `person`) | `md` / `{ default, selected }` |
| **Material Symbols in JS** | `@expo/material-symbols` (already in `apps/mobile/package.json`) | Optional for in-app icons; NativeTabs `md` still uses the platform font |

Suggested names for this app (Home / Notes / Profile):

| Tab | SF (`sf`) | Material (`md`) |
| :--- | :--- | :--- |
| Home | `house` / `house.fill` | `home` / `home_filled` |
| Notes | `note.text` / `square.and.pencil` | `sticky_note_2` / `edit_note` |
| Profile | `person` / `person.fill` | `person` / `account_circle` |

### Custom PNG (`src`) — fallback assets

Template PNGs remain at `apps/mobile/assets/images/tabIcons/` (`home.png`, `explore.png` + `@2x` / `@3x`) if you need `src` + `renderingMode="template"`. **Live tabs in [`app-tabs.tsx`](src/components/app-tabs.tsx) use `sf` + `md` symbol names**, not these PNGs.

Download / export suggestions if you stay on `src`:

1. **SF Symbols app → File → Export Symbol** as PDF/SVG, then rasterize 25 / 50 / 75 pt (1x / 2x / 3x) as **template** (single-color) PNGs.
2. **[Google Fonts Icons](https://fonts.google.com/icons) → download SVG**, export PNG at 24 / 48 / 72 px, keep glyphs **monochrome** for tinting.
3. **SF Symbols as PNG via Apple’s app** only; do not hotlink Apple’s symbol artwork into Android.
4. Icon fonts rasterized at module scope with `getImageSourceSync` (requires a **dev build**): `@react-native-vector-icons/material-design-icons` + `@react-native-vector-icons/get-image` — see Native tabs “Vector icons”.

Priority: iOS `sf` > `xcasset` > `src`. Android `drawable` > `md` > `src`. Distinct selected `src`/`md` objects work on this SDK (screens ≥ 4.25).

---

## 4. Notes-feature mapping (still valid)

Keep using Expo UI where we already do (`BottomSheet`, `Switch`, `DropdownMenu`). Remaining upgrades:

1. Header Recent / Pinned / Archived → native segmented control
2. Sort cycle button → native `Menu` / `DropdownMenu`
3. Note card swipe / context menu → SwiftUI `SwipeActions` / `ContextMenu` (iOS) with Compose fallbacks
4. `NoteInfoSheet` RN `Modal` → `BottomSheet`
5. Tag chips → `Picker` / menu
6. Pin / archive icon pressables → `Switch` / `Toggle`
