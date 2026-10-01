---
name: ui-ux-standards
description: Enforces purposeful, action-driven, clean UI/UX standards using Uniwind and Tailwind CSS. Strictly prohibits generic templates, placeholder copy, or bloated test layouts.
---

# UI/UX & Uniwind Interface Standards

All agent-built screens, components, and layouts across the iKeen ecosystem must be purposeful, action-oriented, and clean.

## 1. Absolute Prohibition of Generic / Filler UI

Interfaces must never be built as generic placeholders, marketing feature bullet dumps, or artificial token showcases (such as `theme-test.tsx`).

### Prohibited Patterns
- **No Mock Counters / Demo Widgets**: Never add increment buttons, dummy sliders, or arbitrary test state to real app flows.
- **No Swatch Galleries**: Do not dump color squares or token swatch lists into user-facing screens to demonstrate that styles work.
- **No Placeholder / Filler Copy**: Never use `Lorem Ipsum`, `Test 1`, `Item Name Here`, or `Description text`. Always use realistic, contextual domain models (e.g., `"Package #IK-9402 • Out for Delivery"`, `"CFA 15,000 • Mobile Money"`).
- **No Unbounded Containers**: Never allow content to stretch infinitely on tablet or web. Always enforce `w-full max-w-[800px] mx-auto`.

---

## 2. Token Discipline (Uniwind & Tailwind CSS v4)

Always style using the established Uniwind semantic tokens defined in `src/global.css`. Never use ad-hoc hardcoded hex values or inline styles for properties expressible in Tailwind classes.

### Core Semantic Classes
- **Surfaces**: `bg-background` (canvas), `bg-background-element` (cards, inputs), `bg-background-selected` (selected states, active pills).
- **Text**: `text-text` (primary headings/labels), `text-text-secondary` (subtitles, metadata, captions).
- **Brand / Accent**: `bg-primary` (primary CTAs), `text-primary`.
- **Borders & Dividers**: `border-border` (subtle strokes, cards, item separators).

### Dark / Light Adaptivity
- Never manually branch color strings at runtime if the semantic token handles it (e.g., do not write `isDark ? '#000' : '#fff'`; write `bg-background text-text`).
- Verify contrast ratios across both light and dark themes.

---

## 3. Ergonomics & Mobile-First Best Practices

1. **Clear Action Hierarchy**:
   - Every view must have a clear primary action (high-contrast primary CTA).
   - Secondary actions must use surface tokens (`bg-background-element` or `border border-border`).
2. **Touch Targets & Active Feedback**:
   - All interactive touch targets must be at least 44x44pt (`min-h-[44px]`).
   - Every pressable element must provide instant visual feedback (`active:opacity-70` or `active:scale-[0.98]`).
   - Trigger native haptics via `@/lib/haptics` (`selectionAsync` / `impactAsync`) on key user decisions. Notes, folders, FAB, search, and onboarding must not call `expo-haptics` directly.
3. **Safe Area & Inset Handling (Uniwind Safe Utilities)**:
   - **Eliminate `SafeAreaView`**: Use Uniwind's built-in safe area utilities (`p-safe`, `pt-safe`, `pb-safe`, `pl-safe`, `pr-safe`, `m-safe`, etc.) directly on standard `<View>` components instead of importing `SafeAreaView` from `react-native-safe-area-context`.
   - Scrollable containers or root views can use `pt-safe` for status bar notches and `pb-safe` for home indicators:
     ```tsx
     <View className="flex-1 bg-background pt-safe pb-safe w-full max-w-[800px] mx-auto">
     ```
   - For bottom tab bar clearance combined with home indicator:
     ```tsx
     contentContainerStyle={{ paddingBottom: BottomTabInset + 76 }}
     ```
4. **Empty & Error States**:
   - Never render a blank screen when lists are empty. Provide an intentional empty state with a clear icon, explanatory text, and an action button to recover.

---

## 4. Uniwind Compatibility & Styling Restrictions

Uniwind processes `className` bindings at build time by intercepting core React Native components. Follow these strict library boundaries:
- **`Switch`**: `className?: never`. Must use dedicated color props (`thumbColorClassName`, `trackColorOnClassName`, etc.) or standard `style`.
- **`ActivityIndicator` & `Button`**: Do not support `className`. Use `colorClassName` (or `Pressable` for buttons).
- **`RefreshControl`**: Does not accept `className`. Use `tintColorClassName`, `colorsClassName`, etc.
- **`ScrollView` / `FlatList`**: The outer element takes `className`, but the scrollable container **strictly requires** `contentContainerClassName` or `contentContainerStyle`. For multi-column `FlatList`, use `columnWrapperClassName`.
- **Third-Party / Expo Primitives**:
  - `NativeTabs` (`expo-router/unstable-native-tabs`): Use typed color props (`backgroundColor`, `indicatorColor`, `labelStyle`). Prefer `sf` + `md` symbol names; PNG `src` only as fallback. Sources: [`apps/mobile/EXPO-UI.md`](../../apps/mobile/EXPO-UI.md) §3.
  - `@expo/ui`: Wrap in `Host`. No `className`. Prefer `BottomSheet`, `Switch`, `Button`, `TextInput`, `RNHostView`. Docs: https://docs.expo.dev/versions/v57.0.0/sdk/ui/
  - `SymbolView` (`expo-symbols`): Use `tintColor`, `size`, and `style` for transforms.
  - `Image` (`expo-image`): Explicit sizing or wrap in a styled `<View className="...">`.
  - Reanimated Worklets: Dynamic animated styles require `style={[animatedStyle]}`.
  - SVG Primitives (`react-native-svg`): Use SVG attributes (`fill`, `stroke`), not CSS classes.

---

## 5. Verification Checklist

Before finalizing any screen or UI contribution:
- [ ] Is this screen directly solving a concrete user workflow in the iKeen domain?
- [ ] Is there zero placeholder text, generic demo counters, or token swatch galleries?
- [ ] Are all colors mapped to semantic tokens (`bg-background`, `bg-background-element`, `text-text`, `text-text-secondary`, `bg-primary`)?
- [ ] Are Uniwind restrictions respected (`contentContainerStyle` for scroll containers, typed props for third-party primitives)?
- [ ] Does the screen look balanced and legible in both Light and Dark modes?
- [ ] Are touch targets at least 44pt with visible active states?
- [ ] Did you run `bun --filter=@repo/mobile run check-types` and `bun --filter=@repo/mobile run lint` with zero errors?
