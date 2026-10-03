export type AppStorePlatform = 'android' | 'ios';

export interface AppRelease {
  version: string;
  build: number;
  releasedAt: string;
  title: string;
  notes: readonly string[];
  storeUrls?: Partial<Record<AppStorePlatform, string>>;
}

export const DEFAULT_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.techforgelee.ikeen';

/** Newest first. Index 0 is the current release. */
export const APP_RELEASES: readonly AppRelease[] = [
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
    notes: [
      'iKeen name, icons, splash, and notification artwork',
    ],
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
