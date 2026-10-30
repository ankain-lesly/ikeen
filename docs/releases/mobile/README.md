# iKeen Mobile Release Matrix & History

This directory contains the official release documentation, changelogs, database migration diffs, and verification checklists for `@repo/mobile` (`com.techforgelee.ikeen`).

For the monorepo release process standard, see [docs/releases/RELEASE_PROCESS.md](../RELEASE_PROCESS.md).

---

## Release History

| Version | Build | Release Date | Codename / Focus | Status | Documentation |
| :--- | :---: | :---: | :--- | :---: | :--- |
| **`2.0.0`** | `6` | 2026-10-30 | **The Modular Block & Media Era** | **Current** | [v2.0.0.md](v2.0.0.md) |
| **`1.3.0`** | `5` | 2026-10-03 | AI Web Search, Composio Integrations & Account Deletion | Archived | [v1.3.0 in registry](../../../apps/api/src/modules/sync/app-updates.registry.ts#L16-L29) |
| **`1.2.0`** | `4` | 2026-09-28 | Brand Refresh, Haptics & Fast Sync | Archived | [v1.2.0 in registry](../../../apps/api/src/modules/sync/app-updates.registry.ts#L30-L44) |
| **`1.1.1`** | `3` | 2026-10-02 | Iconography, Splash & Notification Artwork | Archived | [v1.1.1 in registry](../../../apps/api/src/modules/sync/app-updates.registry.ts#L45-L51) |
| **`1.0.1`** | `2` | 2026-09-22 | Cloud Sync & In-App AI Chat | Archived | [v1.0.1 in registry](../../../apps/api/src/modules/sync/app-updates.registry.ts#L52-L63) |
| **`1.0.0`** | `1` | 2026-09-12 | Initial Launch (Local-first Offline Notes) | Archived | [v1.0.0 in registry](../../../apps/api/src/modules/sync/app-updates.registry.ts#L64-L75) |

---

## Platform Compatibility Matrix

| iKeen Version | React Native | Expo SDK | Metro / Bundler | Min iOS | Min Android |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **`2.0.0`** | `0.86.0` | `~57.0.21` | Expo Router v57 / Metro | iOS 15.1+ | Android 8.0+ (API 26) |
| **`1.3.0`** | `0.86.0` | `~57.0.12` | Expo Router v57 / Metro | iOS 15.1+ | Android 8.0+ (API 26) |
| **`1.0.0`** | `0.85.0` | `~56.0.0`  | Expo Router v56 / Metro | iOS 14.0+ | Android 7.0+ (API 24) |

---

## Release Cadence & Maintenance Policy

* **Major Releases (`X.0.0`)**: Released when major architectural or data model paradigms change. Supported for a minimum of 6 months with hotfix patches.
* **Minor Releases (`x.Y.0`)**: Monthly or bi-weekly feature drops containing non-breaking enhancements.
* **Patch Releases (`x.y.Z`)**: Shipped as needed for sync stability, crash resolution, and critical bug fixes.
