# iKeen Design System & UI/UX Standards

This document establishes the official design system, token strategy, and UX standards for the **iKeen** ecosystem across mobile (Expo / React Native / Uniwind) and web (Next.js / Tailwind CSS v4).

---

## 1. Design Philosophy: Intentional, Action-Driven, Purposeful

Every screen and component built by agents must directly advance a concrete user workflow within the product domain (deliveries, logistics, payments, account management, notifications).

### The Golden Rule
> **Interfaces must be purpose-built, action-oriented, and content-rich. Generic templates, placeholder dumps, arbitrary counters, and artificial token showcases (such as `theme-test.tsx`) are strictly prohibited.**

### Core Tenets
1. **Action-Driven Hierarchy**: Every screen has a primary job. A user should understand what they can do within 3 seconds of viewing. Primary actions receive highest contrast; secondary actions use subtle surface tones.
2. **Domain Authenticity**: Use realistic, contextual domain models (e.g., package status, currency amounts, courier tracking, timestamps, recipient addresses). Never use `Lorem Ipsum`, `Test Item 1`, or arbitrary numbers.
3. **Zero Visual Bloat**: Remove decorative elements that do not convey state, context, or action. Every pixel must justify its existence through functionality or clarity.
4. **Adaptive by Default**: Dark mode, light mode, accessibility scales, and device boundaries (notches, dynamic islands, navigation bars, desktop max-width constraints) must be handled seamlessly via design tokens.

---

## 2. Design Token Architecture (Uniwind & Tailwind CSS v4)

Styling is handled via Tailwind CSS v4 and **Uniwind** build-time compilation. Tokens are declared in `@layer theme` and mapped via `@theme inline` in `src/global.css`.

### Semantic Color Tokens

Never hardcode arbitrary hex colors for standard UI elements. Always use semantic utility classes:

| Semantic Token | Tailwind Class | Light Mode | Dark Mode | Intended Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Background** | `bg-background` | `#ffffff` | `#000000` | Canvas and root screen background |
| **Background Element** | `bg-background-element` | `#F0F0F3` | `#212225` | Cards, input containers, list row backdrops |
| **Background Selected** | `bg-background-selected`| `#E0E1E6` | `#2E3135` | Active chips, selected tab pills, pressed states |
| **Card** | `bg-card` | `#F0F0F3` | `#212225` | Structured card surfaces |
| **Text (Primary)** | `text-text` / `text-foreground` | `#000000` | `#ffffff` | Headings, primary labels, values |
| **Text Secondary** | `text-text-secondary` | `#60646C` | `#B0B4BA` | Subtitles, helper text, captions, metadata |
| **Primary / Tint** | `bg-primary`, `text-primary` | `#0a7ea4` | `#ffffff` | Primary CTA buttons, brand badges, active accents |
| **Border** | `border-border` | `#E0E1E6` | `#2E3135` | Dividers, subtle card strokes, inactive outlines |

### Spacing System (8pt Grid)

Align all layout dimensions, padding, margins, and gaps to the 8pt scale:

| Token | Pixels | Tailwind Utility | Standard Role |
| :--- | :--- | :--- | :--- |
| `Spacing.half` | `2px` | `p-0.5`, `gap-0.5` | Hairline offsets, tag badges |
| `Spacing.one` | `4px` | `p-1`, `gap-1`, `m-1` | Tight icon-label groupings |
| `Spacing.two` | `8px` | `p-2`, `gap-2`, `m-2` | Micro component padding, chip spacing |
| `Spacing.three` | `16px` | `p-4`, `gap-4`, `m-4` | Standard card internal padding, item lists |
| `Spacing.four` | `24px` | `p-6`, `gap-6`, `m-6` | Screen horizontal margins, section gaps |
| `Spacing.five` | `32px` | `p-8`, `gap-8`, `m-8` | Major section separations |
| `Spacing.six` | `64px` | `py-16`, `my-16` | Hero section vertical padding |

### Typography Scale

Typography must balance readability, density, and clear typographic hierarchy:

| Role | Font Size / Line Height | Tailwind Classes | Weight |
| :--- | :--- | :--- | :--- |
| **Display Title** | `32px / 44px` | `text-[32px] leading-[44px]` | `font-semibold` (600) |
| **Screen Heading** | `24px / 32px` | `text-2xl leading-8` | `font-bold` (700) |
| **Section Header** | `18px / 26px` | `text-lg leading-snug` | `font-semibold` (600) |
| **Body (Default)** | `16px / 24px` | `text-base leading-6` | `font-normal` (400) / `font-medium` (500) |
| **Body (Compact)** | `14px / 20px` | `text-sm leading-5` | `font-medium` (500) |
| **Caption / Meta** | `12px / 16px` | `text-xs leading-4` | `font-normal` (400) |
| **Monospace / Code**| `12px / 16px` | `font-mono text-xs` | `font-medium` (500) |

---

## 3. Ergonomics & Mobile-First Best Practices

### A. Touch Targets & Interactivity
- **Minimum Hit Slop**: Touch targets must be at least `44x44pt` (`min-h-[44px] min-w-[44px]`), even if the visual icon or label is smaller.
- **Active State Feedback**: Every interactive button, row, and chip must provide immediate feedback:
  - Visual: `active:opacity-70` or `active:scale-[0.98]`.
  - Haptic: Trigger `expo-haptics` (`Haptics.selectionAsync()` or `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)`) on tap.

### B. Safe Area & Tab Bar Insets
- Always wrap screen scroll views with dynamic safe area handling:
  ```tsx
  const insets = useSafeAreaInsets();
  // Bottom padding must account for floating tabs and home indicator
  const bottomPadding = insets.bottom + BottomTabInset + Spacing.three;
  ```
- Apply insets to `contentContainerStyle` or `contentContainerClassName` so the scroll track extends edge-to-edge behind translucent bars.

### C. Desktop & Tablet Constraints
- Never allow mobile interfaces to stretch unbounded across wide monitors:
  ```tsx
  <View className="w-full max-w-200 mx-auto flex-1">
  ```

---

## 4. Uniwind Compatibility & Styling Restrictions

Uniwind processes `className` bindings at build time by intercepting core React Native components. Agents must strictly adhere to the following library-level constraints:

### A. React Native Core Components with Incomplete/No `className` Support
- **`Switch`**: `className` is strictly forbidden by types (`className?: never`). Always use dedicated color props:
  - `thumbColorClassName`, `trackColorOnClassName`, `trackColorOffClassName`, `ios_backgroundColorClassName`, or standard `style`.
- **`ActivityIndicator` & `Button`**: Neither component supports `className`. Use `colorClassName` (or `color={...}` / custom `Pressable` for buttons).
- **`RefreshControl`**: Does not accept `className`. Use `tintColorClassName`, `colorsClassName`, `progressBackgroundColorClassName`, or `titleColorClassName`.
- **`ScrollView` / `FlatList` / `SectionList`**: The outer element takes `className`, but the scrollable container **strictly requires** `contentContainerClassName` or `contentContainerStyle`. For multi-column `FlatList`, use `columnWrapperClassName`.

### B. Third-Party & Expo Components Requiring `style` or Props
Uniwind does **not** intercept non-core packages. Never pass `className` to:
- **`expo-router` NativeTabs** (`NativeTabs`, `NativeTabs.Trigger`): Use typed color props (`backgroundColor`, `indicatorColor`, `labelStyle`).
- **`expo-symbols` (`SymbolView`)**: Requires `tintColor`, `size`, and inline `style` for transforms (e.g. `{ transform: [{ rotate: ... }] }`).
- **`expo-image` (`Image`)**: Layout and aspect-ratio should be defined on a parent `<View className="...">` or passed via `style`.
- **`react-native-reanimated` (`useAnimatedStyle`)**: Worklet-driven dynamic styles must strictly use `style={[animatedStyle, ...]}`.
- **`react-native-svg`**: Primitives (`Svg`, `Path`, `Rect`, `Circle`) use SVG XML attributes (`fill`, `stroke`, `strokeWidth`), not Tailwind utility classes.
- **`lucide-react-native`**: Vector icons use `color`, `size`, and `strokeWidth` props.
- **Dynamic Insets**: Hardware-dependent padding (e.g., `insets.bottom + BottomTabInset`) must be passed via `contentContainerStyle`.

---

## 5. Prohibited Design Anti-Patterns

Any code submission containing the following patterns will be rejected:

1. **Synthetic "Demo" / "Test" Screens**:
   - No mock dashboards with random numbers (`Count: 42`, `Test 1`, `Demo Widget`).
   - No swatch galleries showing color squares just to prove tokens work.
2. **Placeholder & Filler Copy**:
   - No `Lorem ipsum dolor sit amet...`.
   - No generic labels like `Card Title Goes Here`, `Description text here`.
   - Always draft realistic domain content (e.g., `"Express Parcel • Tracking #IK-84920"`, `"Arriving today by 4:30 PM"`).
3. **Hardcoded Ad-hoc Colors**:
   - Never write `bg-[#f0f0f3]` or `style={{ color: '#60646c' }}` when `bg-background-element` or `text-text-secondary` exist.
4. **StyleSheet.create Regressions**:
   - In screens and components using Uniwind, avoid mixing redundant `StyleSheet.create` objects for properties cleanly expressible in Tailwind utility classes.
5. **Missing Empty & Loading States**:
   - Never build a screen assuming data always exists. Every list or view must specify an intentional empty state with a clear recovery CTA (e.g., `"No active orders • Start a delivery"`).

---

## 6. UI Review Checklist for Agents

Before declaring any screen or UI component complete:

- [ ] **Purpose**: Does this view solve an actual user problem with clear domain context?
- [ ] **Primary Action**: Is there a clear, high-priority primary CTA?
- [ ] **Semantic Tokens**: Are all colors using `bg-background`, `bg-background-element`, `text-text`, `text-text-secondary`, `border-border`, and `bg-primary`?
- [ ] **Uniwind Constraints**: Are core components using utility classes, with `contentContainerStyle`/`ClassName` used for scroll containers, and third-party/vector primitives using typed props instead of unsupported `className`?
- [ ] **Dark Mode**: Does the layout invert cleanly without unreadable black-on-dark or white-on-light text?
- [ ] **Insets**: Does the content scroll comfortably past the tab bar and status bar without clipping?
- [ ] **Touch Ergonomics**: Are all interactive elements at least 44pt tall with active states?
- [ ] **Type Safety**: Does `bun run check-types` pass with 0 errors?
