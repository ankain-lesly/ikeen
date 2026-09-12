# Mobile App UI/UX Design Specification (Expo SDK 57+)

> **Project:** Dev Lee Personal Life OS Mobile Application  
> **Platform Target:** iOS (iPhone & Dynamic Island) and Android  
> **Technology Stack:** Expo SDK 57+, React Native 0.77+ (New Architecture Fabric/TurboModules), Expo Router v4/v5, Reanimated 3/4, Skia, `expo-audio`, `expo-glass-effect`, `expo-haptics`, `expo-sqlite`  
> **Design Philosophy:** Sub-100ms time-to-capture, tactile haptic physics, offline-first reliability, and adaptive multi-persona fluidity.  
> **Date:** March 2026  

---

## 1. Technical Foundation & Engineering Baseline (Expo SDK 57+)

The mobile client is built on the modern React Native New Architecture with zero legacy components:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        EXPO SDK 57+ RUNTIME                            │
│  React Native 0.77+ (New Architecture Fabric Engine + TurboModules)    │
│  React 19 Concurrent Features (useActionState, useOptimistic)          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    NAVIGATION & INTERACTION ENGINE                     │
│  • Expo Router v4/v5 (Typed routes, Link.AppleZoom transitions)        │
│  • NativeTabs with iOS 26 liquid effects & Android Material You        │
│  • Gesture Handler + Reanimated 3/4 (60/120 FPS physics threads)       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                      NATIVE CAPABILITIES & HARDWARE                    │
│  • expo-audio (Sub-300ms streaming recording & background playback)   │
│  • expo-glass-effect (Liquid glass backdrops & blurs)                  │
│  • expo-image with SF Symbols (source="sf:symbol.name")                │
│  • expo-haptics (Nuanced tactile micro-feedback taxonomy)              │
│  • expo-notifications (Interactive actionable notification categories) │
│  • expo-sqlite / PowerSync (Synchronous local write, background sync)  │
└────────────────────────────────────────────────────────────────────────┘
```

### 1.1 Critical Native Engineering Guidelines
1. **Sub-100ms Instant Capture**:
   - Tapping the app launcher or quick widget immediately focuses the note editor or audio recorder.
   - Saves occur synchronously to local **`expo-sqlite`**, then reconcile in the background with the Next.js backend via Inngest.
2. **Apple Human Interface Guidelines Compliance**:
   - Continuous corner radii: `{ borderCurve: 'continuous' }` on all cards and sheets.
   - Native safe areas: `<ScrollView contentInsetAdjustmentBehavior="automatic" />`.
   - Native elevation: CSS `boxShadow` (e.g. `boxShadow: '0 4px 20px rgba(0,0,0,0.1)'`), avoiding deprecated RN shadows.
   - SF Symbols: `<Image source="sf:sparkles" />` via `expo-image`.
3. **Tactile Haptic Taxonomy (`expo-haptics`)**:
   - **Selection**: Changing tabs, scrolling picker wheels.
   - **Light Impact**: Swiping a card, tapping quick chips, expanding accordions.
   - **Medium Impact**: Switching personas, starting voice recording.
   - **Success Notification**: Marking a habit/task complete, syncing note.
   - **Warning Notification**: Voice transcription failure or network timeout.

---

## 2. Five Distinct Design Experiences

To find the optimal daily workflow for Dev Lee, this specification details **five distinctly different design paradigms**. Each offers a tailored interaction model, visual identity, and psychological rhythm.

---

### Experience 1: "The Cognitive Canvas" (Spatial Gestural / Fluid Card-Stack)

> **Mood & Vibe:** Liquid Glass, Apple VisionOS spatial depth, gestural manipulation, visual thinking.  
> **Best Suited For:** Creative ideation, architecture sketching, visual second-brain linking.

```
┌──────────────────────────────────────────────────────────┐
│  [Search / Life RAG]                      (Avatar: Lee) │
│                                                          │
│   ┌───────────────────────────┐                          │
│   │ 🟢 WORK (In Progress)     │                          │
│   │ API Microservices Spec    │  Pinch to summarize      │
│   │ 4 action items extracted  │  Swipe right to file     │
│   └─────────────┬─────────────┘  Flick up to agent       │
│                 │ (Spatial Stack)                        │
│   ┌─────────────▼─────────────┐                          │
│   │ 🟡 FINANCE                │                          │
│   │ Q2 Tax & Runway Audit     │                          │
│   └───────────────────────────┘                          │
│                                                          │
│  [ (Mic) Hold to Speak ]        [ (＋) Quick Scratchpad ]│
└──────────────────────────────────────────────────────────┘
```

#### Visual Language
- **Palette**: Deep Obsidian (`#0A0B0E`), Liquid Cyan (`#00F2FE`), Translucent Glass (`rgba(255,255,255,0.08)`).
- **Surface**: `expo-glass-effect` with layered depth and dynamic blur.
- **Card Physics**: Real-time 3D tilt and spring bounce driven by Reanimated gesture handlers.

#### Key Interactions
- **AppleZoom Navigation**: Tapping a note zooms into the full-screen markdown canvas with fluid spatial expansion (`<Link href="..." asChild><Link.AppleZoom /></Link>`).
- **Throw-to-Agent Gesture**: Flicking a card upward tosses the note into the active Agent Persona orb to generate a critique, task breakdown, or translation.
- **Pinch-to-Condense**: Two-finger pinch on any card compresses a 1,000-word note into a 3-bullet AI summary card.

---

### Experience 2: "The Cybernetic Terminal" (Keyboard-First / Neo-Brutalist Command Center)

> **Mood & Vibe:** Developer terminal, Bloomberg terminal, high-density monospace, speed of thought.  
> **Best Suited For:** Software engineers, power users, rapid task logging, zero-distraction focus.

```
┌──────────────────────────────────────────────────────────┐
│ $ personal-os --status=ACTIVE               BAT: 98% [●] │
│ ──────────────────────────────────────────────────────── │
│ > [14:22] NOTE: Auth token issue resolved in PR #42      │
│ > [12:05] HABIT: 3.5L Water logged [OK]                  │
│ > [09:15] FIN: $42.50 spent on lunch (Dining)            │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ AGENT [WORK]: "Reviewing Redis caching strategy..."  │ │
│ │ • Cache invalidation hook queued for 11 PM run       │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ [ / ] [ /note ] [ /fin ] [ /fit ] [ /remind ] [ /deep ]  │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ > _ Type command or slash action...           [SEND] │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

#### Visual Language
- **Palette**: Jet Pitch Black (`#000000`), Phosphor Green (`#39FF14`), Electric Amber (`#FFB000`), Terminal White (`#E6EDF3`).
- **Typography**: Monospace (`JetBrains Mono` / `SF Mono`), tabular figures (`fontVariant: ['tabular-nums']`).
- **Borders**: Sharp 1px crisp neo-brutalist borders (`#222222`), zero soft shadows.

#### Key Interactions
- **Bottom Command Palette (`⌘K` Bar)**: Always-present input line. Everything is driven by typing or voice slash-commands:
  - `/note Fix memory leak in auth worker` $\rightarrow$ Instantly files note.
  - `/fin 50 lunch` $\rightarrow$ Logs expense to Finance Agent.
  - `/remind 4pm call Alex` $\rightarrow$ Schedules Inngest background timer.
  - `/deep analyze webgpu on mobile` $\rightarrow$ Dispatches Tavily research job.
- **Modifier Quick-Keys**: Fixed keyboard accessory row with fast token pills (`/fit`, `/work`, `/todo`, `@lee`).

---

### Experience 3: "The Sanctuary Journal" (Warm Editorial / Mindful Daily Rhythm)

> **Mood & Vibe:** Kinfolk / Monocle magazine, artisanal paper, stoic coaching, mindful breathing.  
> **Best Suited For:** Morning/evening reflections, mental health, habit discipline, long-form writing.

```
┌──────────────────────────────────────────────────────────┐
│ Friday, 11 September                                     │
│ Good afternoon, Lesly.                                   │
│                                                          │
│ ❝ What stands in the way becomes the way. ❞              │
│                                                          │
│ ── Today's Focus ─────────────────────────────────────── │
│ ○ Complete system specification for personal app        │
│ ○ Zone 2 Cardio (45 mins)                                │
│                                                          │
│ ── Daily Reflection ──────────────────────────────────── │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ "Morning sprint went smoothly. Need to ensure the    │ │
│ │  mobile architecture remains offline-first..."       │ │
│ │                                                      │ │
│ │ [ 🎙️ 01:24 Voice Reflection attached ]              │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│  [ Morning Intent ]    [ Midday Check ]    [ Evening Log ]│
└──────────────────────────────────────────────────────────┘
```

#### Visual Language
- **Palette**: Linen White (`#FBF9F5`), Deep Ink (`#1C1917`), Terracotta (`#C2410C`), Warm Sage (`#4D7C0F`). Dark mode switches to Muted Charcoal (`#121212`) and Soft Cream (`#E7E5E4`).
- **Typography**: Premium Serif (`New York` / `Playfair Display`) paired with crisp sans-serif body.
- **Textures**: Subtle warm paper grain and organic, slow easing curves.

#### Key Interactions
- **Unfolding Prompt Cards**: Tapping "Morning Intent" triggers a soft, folding origami-like animation revealing coaching questions curated by the **Life Coach Agent**.
- **Tactile Audio Scrubber**: Voice memos render as elegant wave forms with haptic clicks on every second scrubbed.
- **Habit Lotus Bloom**: Completing your daily routine habits progressively animates an organic floral geometric bloom.

---

### Experience 4: "The Bento Matrix" (Modular High-Density Operations Dashboard)

> **Mood & Vibe:** Apple Health meets Linear, dark titanium, quantified-self data, modular widgets.  
> **Best Suited For:** High-output operators, fitness tracking, real-time metrics, quick toggling.

```
┌──────────────────────────────────────────────────────────┐
│ DASHBOARD                                (● Lee: Online) │
│                                                          │
│ ┌───────────────────────┐  ┌───────────────────────────┐ │
│ │ 🏃 WORKOUT: LEGS      │  │ 💰 TODAY SPENT            │ │
│ │ Squats: 120kg x 5     │  │ $18.40  (Under budget)    │ │
│ │ [Progress Ring: 75%]  │  │ [Sparkline: 7-day trend]  │ │
│ └───────────────────────┘  └───────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ 📝 QUICK CAPTURE NOTE                                │ │
│ │ "Explore Expo Router AppleZoom with Skia shaders..." │ │
│ │ Tags: #mobile #ideas                 [+ Auto-linked] │ │
│ └──────────────────────────────────────────────────────┘ │
│ ┌───────────────────────────┐  ┌───────────────────────┐ │
│ │ 🎯 HABITS (4/5)           │  │ 🔔 NEXT UP            │ │
│ │ [✓] Cold plunge           │  │ 16:00 Client review   │ │
│ │ [✓] 30m Reading           │  │ Inngest alert: 2h     │ │
│ └───────────────────────────┘  └───────────────────────┘ │
│                                                          │
│ [ Today ]       [ Notes ]       [ Agents ]      [ Matrix ]│
└──────────────────────────────────────────────────────────┘
```

#### Visual Language
- **Palette**: Dark Titanium (`#16181D`), Surface Slate (`#1E222B`), Accent Violet (`#8B5CF6`), Electric Emerald (`#10B981`).
- **Grid Layout**: Dynamic 2-column and full-width Bento modular grid cards.
- **Micro-Data**: Sparklines, circular progress indicators, and badge status pills.

#### Key Interactions
- **One-Tap Widget Toggling**: Tap checkboxes or habit cards directly from the grid without opening a modal.
- **Long-Press Card Elevation**: Long-pressing any bento tile pops up a full-screen interactive metric canvas using `expo-glass-effect`.
- **Drag-to-Reorder**: Customize your daily dashboard layout based on your current focus (e.g. prioritize Fitness on gym days, Finance on Fridays).

---

### Experience 5: "The Ambient Companion" (Voice-First / Dynamic Island & Live Activities)

> **Mood & Vibe:** Jarvis / Her, sentient presence, hands-free walking companion, zero-screen friction.  
> **Best Suited For:** Commuting, walking, hands-busy moments, fluid voice-to-action life management.

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│                                                          │
│                                                          │
│                                                          │
│                    ╭──────────────╮                      │
│                   │   ╭────────╮   │                     │
│                  │   │   🪩   │   │                    │
│                   │   ╰────────╯   │                     │
│                    ╰──────────────╯                      │
│               [ Pulsing Fluid Aura Orb ]                 │
│                 "Listening to you..."                    │
│                                                          │
│                                                          │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ ❝ I've summarized your last 3 ideas and scheduled    │ │
│ │   a gym reminder for 6:00 PM. Anything else? ❞       │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│         [ 🎙️ Tap & Hold to Speak / Release to Process ]    │
└──────────────────────────────────────────────────────────┘
```

#### Visual Language
- **Palette**: Deep Void Black (`#050505`), Spectral Gradient Aura (`#38BDF8` through `#C084FC` to `#34D399`).
- **Fluid Visualizer**: Real-time WebGL/Skia audio reactive orb that pulses, morphs, and responds to your voice frequency.
- **Typography**: Clean, oversized modern typography with high line-height for effortless legibility.

#### Key Interactions
- **Universal Tap-and-Hold**: Press and hold anywhere on the screen to talk. Release to immediately execute transcription, classification, note-filing, and agent response.
- **Dynamic Island Companion**:
  - While recording in the background, iPhone Dynamic Island expands to show real-time waveform.
  - While running a deep research job, Dynamic Island displays a progress pill: `[🔍 Deep Research: 65%]`.
- **Lock-Screen Live Activity**:
  - Displays your active daily habit checklist and current top task directly on your iPhone lock screen without unlocking your phone.

---

## 3. Screen Hierarchy & Component Specifications (Expo Router)

The app follows the strict file-based routing conventions of **Expo Router v4/v5**:

```
apps/mobile/app/
├── _layout.tsx                        # Root layout: ThemeProvider, AuthGuard, SQLiteProvider
├── index.tsx                          # Auth check / Biometric gateway
├── (auth)/
│   └── login.tsx                      # Web sign-in / QR pairing
│
└── (tabs)/                            # NativeTabs Navigator (iOS 26 liquid effects)
    ├── _layout.tsx                    # Tab definitions & icons (SF Symbols)
    │
    ├── today/                         # Daily Routine & Command Hub
    │   ├── index.tsx                  # Active experience dashboard (Bento / Terminal / Canvas)
    │   └── habit-modal.tsx            # FormSheet for habit history
    │
    ├── notes/                         # Second Brain Notes Engine
    │   ├── index.tsx                  # Search, filter, tag directory
    │   ├── [id].tsx                   # Full-screen Markdown note editor
    │   ├── new.tsx                    # Instant capture route
    │   └── graph-view.tsx             # 2D/3D Semantic backlink graph
    │
    ├── agents/                        # Multi-Persona AI Chat
    │   ├── index.tsx                  # Persona switcher carousel & active thread
    │   ├── [persona].tsx              # Streaming ToolLoopAgent chat session
    │   └── voice-overlay.tsx          # Fullscreen Ambient Companion modal
    │
    └── settings/                      # Preferences & System Health
        ├── index.tsx                  # Vault keys, channels (Telegram/Twilio), backup
        └── experience-picker.tsx      # Switch between the 5 Design Experiences
```

---

## 4. Rich-Text / Markdown Editor Specification

The core note-taking screen (`app/(tabs)/notes/[id].tsx`) is engineered for distraction-free speed:

```tsx
import { ScrollView, TextInput, View, Text } from 'react-native';
import { useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';

export default function NoteEditorScreen({ noteId }: { noteId: string }) {
  const { width } = useWindowDimensions();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="interactive"
      contentContainerStyle={{ padding: 20, gap: 16 }}>
      {/* Note Title */}
      <TextInput
        placeholder="Note Title..."
        placeholderTextColor="#666"
        style={{
          fontSize: 26,
          fontWeight: '700',
          color: '#FFF',
          borderCurve: 'continuous',
        }}
      />

      {/* AI Assistant Context Ribbon */}
      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          paddingVertical: 6,
          paddingHorizontal: 12,
          backgroundColor: 'rgba(255,255,255,0.06)',
          borderRadius: 12,
          borderCurve: 'continuous',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
        <Text style={{ color: '#00F2FE', fontSize: 12, fontWeight: '600' }}>
          ✦ Lee: 3 action items detected
        </Text>
      </View>

      {/* Markdown Content Area */}
      <TextInput
        multiline
        placeholder="Start typing or tap mic for voice dump..."
        placeholderTextColor="#555"
        style={{
          fontSize: 16,
          lineHeight: 24,
          color: '#E0E0E0',
          minHeight: 400,
        }}
      />
    </ScrollView>
  );
}
```

---

## 5. Offline-First Synchronization Engine

A personal notes and routine app cannot afford spin-wheels or network latency:

1. **Local-First SQLite Cache (`expo-sqlite`)**:
   - Every keystroke and habit toggle writes immediately to the device's local SQLite database in under **5ms**.
   - UI updates optimistically with zero spinners.
2. **Background Sync Worker (`Inngest + Next.js API`)**:
   - A background sync queue monitors network reachability.
   - When connected, dirty records are batch-pushed to PostgreSQL.
   - Conflict resolution follows **Last-Write-Wins (LWW)** with automated chunk merging for simultaneous mobile/web note edits.

---

## 6. Actionable Push Notifications Specification

Using `expo-notifications`, incoming alerts provide immediate tactile actions without requiring the user to open the app:

```ts
import * as Notifications from 'expo-notifications';

export async function registerNotificationCategories() {
  await Notifications.setNotificationCategoryAsync('REMINDER_CATEGORY', [
    {
      identifier: 'MARK_DONE',
      buttonTitle: '✓ Mark Done',
      options: { isDestructive: false, opensAppToForeground: false },
    },
    {
      identifier: 'SNOOZE_15',
      buttonTitle: '⏱ Snooze 15m',
      options: { isDestructive: false, opensAppToForeground: false },
    },
  ]);

  await Notifications.setNotificationCategoryAsync('HABIT_CHECK_CATEGORY', [
    {
      identifier: 'HABIT_YES',
      buttonTitle: 'Done!',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'HABIT_SKIP',
      buttonTitle: 'Skip Today',
      options: { isDestructive: true, opensAppToForeground: false },
    },
  ]);
}
```

---

## 7. Recommendation: Which Experience to Start With?

For your initial MVP build, the optimal recommendation is **Experience 4 ("The Bento Matrix")** with an embedded **Ambient Companion floating audio orb (from Experience 5)**:

* **Why:** The Bento Matrix provides the highest daily utility—giving you an immediate bird's-eye view of your habits, daily notes, financial runway, and active tasks. Adding the floating audio orb gives you hands-free voice capture on the go without sacrificing the clean, structured dashboard.
* **Evolution:** You can include the **Experience Switcher** in settings, allowing you to toggle between the **Bento Matrix** for weekday operations, the **Cybernetic Terminal** when coding at your desk, and the **Sanctuary Journal** on Sunday mornings.
