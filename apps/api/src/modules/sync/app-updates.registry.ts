export type AppStorePlatform = 'android' | 'ios';

export interface AppRelease {
  version: string;
  build: number;
  releasedAt: string;
  title: string;
  notes: readonly string[];
}

export const DEFAULT_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.techforgelee.ikeen';

/** Newest first. Index 0 is the current release. */
export const APP_RELEASES: readonly AppRelease[] = [
  {
    version: '2.2.0',
    build: 9,
    releasedAt: '2026-11-22',
    title: 'iKeen 2.2.0: Distraction-Free Scratchpad & Reminders Hardening',
    notes: [
      'Cross-Platform Scratchpad: dedicated quick-capture workspace for instant ideas, draft outlines, and checklists',
      'Unified Note Editor: zero-data-loss block editing with automatic state flushing on background and navigation',
      'Reminders Hardening: dynamic overdue styling, editor footer reminder pill, and multi-tenant security isolation',
      'Cold-Start Deep Linking: tapping system reminder alerts routes directly to target notes even from cold start',
      'Desktop Timezone Parity: local calendar date input synchronization eliminating cross-timezone drift',
    ],
  },
  {
    version: '2.1.0',
    build: 8,
    releasedAt: '2026-11-15',
    title: 'iKeen 2.1.0: Note Reminders, Push Notifications & Agent Polish',
    notes: [
      'Smart Note Reminders: schedule time-based alerts and recurring reminders directly from notes and cards',
      'Server Push Notifications: real-time device notifications when the AI Agent or tools create notes and reminders',
      'Interactive Reminder Chips: 1-tap quick completion buttons and full list filtering in the new Reminders screen',
      'AI Chat Stream Fidelity: accurate tool progress states, live indicators, and schema error resilience',
      'User Privacy & Deletion: in-app account deletion compliance in profile settings',
    ],
  },
  {
    version: '2.0.1',
    build: 7,
    releasedAt: '2026-10-31',
    title: 'iKeen 2.0.1: Agent Resilience & Media Enhancements',
    notes: [
      'Tool Execution Reliability: resilient schema handling for AI agent note and folder operations',
      'Media Vault & User Gallery: authenticated media upload tracking and user asset retrieval',
      'Smoother Agent Chat: real-time streaming indicator and accurate tool completion states',
      'Sync Performance: optimized turn-boundary WebSocket invalidation and wire size budgets',
      'Checklist Polish: refined checkbox interactions, multi-line paste, and gesture ergonomics',
    ],
  },
  {
    version: '2.0.0',
    build: 6,
    releasedAt: '2026-10-30',
    title: "Welcome to iKeen 2.0: The Modular Block Workspace",
    notes: [
      'Modular Note Blocks: mix rich text, interactive checklists, and media in any order',
      'Voice Notes: record and listen to voice memos directly inside your notes',
      'Background Media Outbox: reliable photo & file uploads with offline retry',
      'Reimagined Navigation: infinite recent notes drawer and modern home shell',
      'Resilient Sync Engine: hardened offline recovery, pagination, and crash protection',
      'Block AI Tools: agent can now draft, summarize, and edit specific note blocks',
    ],
  },
  {
    version: '1.3.0',
    build: 5,
    releasedAt: '2026-10-03',
    title: "What's new in iKeen",
    notes: [
      'Smarter agent responses and context organization',
      'Ask the agent to search the web and read a page',
      'Connect Gmail and other apps from chat, then save the result as a note',
      'Richer Markdown in notes and agent replies',
      'Select several notes at once to move, pin, archive, or delete',
      'Delete your account from Profile',
    ],
  },
  {
    version: '1.2.0',
    build: 4,
    releasedAt: '2026-09-28',
    title: "What's new in iKeen",
    notes: [
      'iKeen branding, icons, and splash',
      'Clearer navigation and onboarding',
      'Search, recent searches, and note filters',
      'Haptic feedback on key actions',
      'Faster sync across devices',
      'Smarter AI agent chat',
      'Stability fixes',
    ],
  },
  {
    version: '1.1.1',
    build: 3,
    releasedAt: '2026-10-02',
    title: 'iKeen branding',
    notes: ['iKeen name, icons, splash, and notification artwork'],
  },
  {
    version: '1.0.1',
    build: 2,
    releasedAt: '2026-09-22',
    title: 'Sync and AI agent',
    notes: [
      'Sign in and sync notes across devices',
      'AI agent chat in your workspace',
      'Profile and settings',
      'Sync status and outbox',
    ],
  },
  {
    version: '1.0.0',
    build: 1,
    releasedAt: '2026-09-12',
    title: 'Welcome to iKeen',
    notes: [
      'Local-first notes on your device',
      'Folders and a full note editor',
      'Pins, tags, and offline SQLite storage',
    ],
  },
];

export function getLatestRelease(): AppRelease {
  const latest = APP_RELEASES[0];
  if (!latest) {
    throw new Error('APP_RELEASES must contain at least one release');
  }
  return latest;
}

export function getReleaseByVersion(version: string): AppRelease | undefined {
  return APP_RELEASES.find((release) => release.version === version);
}

export function getReleaseByBuild(build: number): AppRelease | undefined {
  return APP_RELEASES.find((release) => release.build === build);
}
