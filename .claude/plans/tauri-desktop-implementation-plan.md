# Implementation Plan: Tauri v2 Desktop App for iKeen

This plan defines the end-to-end roadmap for introducing the **iKeen Desktop Client** (`apps/desktop`) into the monorepo using **Tauri v2**, **React 19**, **Tailwind CSS v4**, and **embedded SQLite with Drizzle ORM**.

---

## 1. Guiding Principles & Invariants

1. **Local-First Zero Latency**: All note reads, queries, and writes occur against the local embedded SQLite database. The UI is completely non-blocking (0ms latency).
2. **Monorepo Synergy**: Reuse canonical local packages (`@repo/types`, `@repo/utils`, `@repo/typescript-config`, `@repo/eslint-config`). Share UI paradigms and styles from `apps/web` (React 19, Tailwind CSS v4, Base UI, Motion).
3. **Discrete Sync Outbox Flow**: Mutations are queued locally in `sync_outbox` and processed asynchronously to the NestJS backend (`/api/sync/push`, `/api/sync/pull`) with Last-Write-Wins (LWW) conflict resolution.
4. **Desktop-First Ergonomics**: Native global keyboard shortcuts, system tray persistence, floating quick-capture HUD, and first-class local MCP sidecar orchestration.

---

## 2. Phased Rollout Roadmap

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       iKeen Desktop Implementation Roadmap                  │
├─────────────────────┬─────────────────────┬─────────────────────────────────┤
│ Phase 1: Core Shell │ Phase 2: Data & Sync│ Phase 3: Desktop UX & Canvas    │
│ • Workspace Setup   │ • SQLite & Drizzle  │ • 3-Pane Layout                 │
│ • Tauri v2 Scaffold │ • FTS5 Search       │ • Quick-Capture Window (HUD)    │
│ • React 19 + Tw v4  │ • Sync Outbox Push  │ • System Tray & Hotkeys         │
│ • Shared @repo/*    │ • Realtime Pull     │ • Command Palette (Cmd+K)       │
├─────────────────────┴─────────────────────┴─────────────────────────────────┤
│ Phase 4: Local AI, MCP Sidecars & Production Release                        │
│ • Tauri Sidecar Binaries for Local MCP Servers                              │
│ • Multi-platform Packaging (macOS dmg/app, Windows msi/exe, Linux deb/AppImg)│
│ • Auto-Update Pipeline via Tauri Updater                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Workspace Scaffolding & Core Shell (Completed ✅)

### Goal
Establish `apps/desktop` inside the Turborepo monorepo with Tauri v2, Vite, React 19, Tailwind CSS v4, and internal package linkages.

### Target Features & Tasks
- [x] **1.1 Workspace Directory Setup**:
  - Create `apps/desktop` directory structure (`src`, `src-tauri`, `public`).
  - Configure `apps/desktop/package.json` with `@repo/desktop` scope and scripts (`dev`, `build`, `check-types`, `lint`, `tauri`).
  - Ensure root `package.json` workspaces (`apps/*`) incorporate `@repo/desktop` and add `"dev:desktop"`.
- [x] **1.2 Frontend Toolchain (Vite + React 19 + Tailwind CSS v4)**:
  - Configure `vite.config.ts` with `@tailwindcss/vite` and React plugin.
  - Setup `apps/desktop/tsconfig.json` with bundler module resolution and modern options.
  - Link internal monorepo packages: `@repo/types: "workspace:*"`, `@repo/utils: "workspace:*"`, `@repo/typescript-config: "workspace:*"`, `@repo/eslint-config: "workspace:*"`.
  - Design initial 3-pane knowledge canvas wireframe in `apps/desktop/src/App.tsx` matching iKeen's dark cybernetic aesthetic.
- [x] **1.3 Tauri v2 Core Initialization**:
  - Setup `src-tauri/Cargo.toml` with `tauri = { version = "2", features = ["tray-icon"] }`.
  - Add Tauri v2 plugins: `tauri-plugin-sql`, `tauri-plugin-global-shortcut`, `tauri-plugin-shell`, `tauri-plugin-fs`, `tauri-plugin-notification`, `tauri-plugin-opener`.
  - Configure `src-tauri/tauri.conf.json` with app identifier `com.techforgelee.ikeen-desktop` and dual-window definitions (`main` 1280x840 and `quick-capture` HUD 640x380).
  - Register capabilities in `src-tauri/capabilities/default.json` and initialize plugin handlers in `src-tauri/src/lib.rs`.

### Verification & Acceptance Criteria
- [x] `bun run --filter=@repo/desktop check-types` passed with zero type errors.
- [x] `bun run --filter=@repo/desktop build` completed in ~27s, outputting optimized production bundle to `apps/desktop/dist`.
- [x] `cargo check` in `apps/desktop/src-tauri` completed cleanly across all Rust dependencies and Tauri v2 plugins.

---

## Phase 2: Local Storage Engine & Sync Architecture (Completed ✅)

### Goal
Implement the embedded SQLite database on desktop with Drizzle ORM, FTS5 full-text search, and the outbox sync engine mirroring mobile.

### Target Features & Tasks
- [x] **2.1 Embedded SQLite & Drizzle ORM Setup**:
  - Configure `@tauri-apps/plugin-sql` loading `sqlite:ikeen_desktop.db`.
  - Create `apps/desktop/src/db/client.ts` implementing Drizzle's SQLite proxy adapter (`drizzle-orm/sqlite-proxy`).
  - Port schema from `apps/mobile/src/db/schema.ts` (`folders`, `notes`, `note_blocks`, `sync_outbox`, `sync_metadata`).
- [x] **2.2 Client Migrations & FTS5 Setup**:
  - Implement automated startup migration runner executing bundled SQL tables.
  - Create SQLite FTS5 virtual table (`notes_fts`) with triggers on `notes` (INSERT, UPDATE, DELETE) for instant full-text search.
- [x] **2.3 Outbox Mutation Queue**:
  - Port `enqueueMutation` utility into `apps/desktop/src/lib/sync/outbox.ts`.
  - Intercept all local creates/updates/deletes to write to SQLite first and record outbox mutations.
- [x] **2.4 Bi-Directional Serverless Sync**:
  - Implement push worker: Batches pending mutations and posts to `POST /api/sync/push`.
  - Implement pull worker: Queries `GET /api/sync/pull?since={lastPulledAt}` and applies changes using Last-Write-Wins.
  - Integrate Pusher / Ably websocket client to trigger pull refreshes upon server invalidation events.

### Verification & Acceptance Criteria
- Creating, editing, or deleting a note updates local SQLite in <5ms.
- Disconnecting internet allows full app usage; reconnecting flushes outbox mutations to backend without data loss.
- FTS5 query returns matching notes across 10,000 items in <10ms.

---

## Phase 3: Desktop UX, Multi-Window & Native Ergonomics (Completed ✅)

### Goal
Build the desktop-native user interface featuring a 3-pane knowledge canvas, global quick-capture HUD, and system tray integration.

### Target Features & Tasks
- [x] **3.1 Three-Pane Knowledge Canvas**:
  - Implement resizable 3-pane layout: Folders Tree -> Notes List -> Fullscreen Editor Canvas.
  - Integrate rich block editor and markdown preview reusing `@base-ui/react` and Lucide icons.
  - Add tag filtering, archived views, and pinned notes sorting.
- [x] **3.2 Global Quick-Capture Window (HUD)**:
  - Register global shortcut (`Cmd+Shift+Space` or `Ctrl+Shift+Space`) in Tauri Rust layer.
  - Implement dedicated translucent, frameless window (`label: "quick-capture"`) for capturing thoughts instantly.
  - Auto-hide on blur or `Escape`; auto-sync to local database on `Cmd+Enter`.
- [x] **3.3 System Tray & Menu Bar Applet**:
  - Build native tray icon displaying real-time sync indicators (Synced, Syncing, Offline).
  - Add quick action menu: "New Note", "Quick Capture", "Sync Now", "Settings", "Quit".
- [x] **3.4 Desktop Keyboard Navigation & Command Palette**:
  - Implement `Cmd+K` / `Ctrl+K` command palette for fast search, folder switching, and AI actions.
  - Add standard desktop keybindings (e.g., `Cmd+N` for new note, `Cmd+B` / `Cmd+\` for sidebar toggle, `Cmd+Delete` / `Delete` for archive/trash).

### Verification & Acceptance Criteria
- [x] Pressing `Cmd+Shift+Space` anywhere in the OS opens the Quick-Capture HUD in <150ms.
- [x] Note typed in Quick-Capture instantly appears in the main window's notes list.
- [x] Full-featured `Cmd+K` command palette searches across notes, folders, tags, and runs desktop actions.
- [x] Note list navigation with arrow keys (`↑`/`↓`) and vim keys (`j`/`k`) updates active note with zero latency.

---

## Phase 4: Production Release Pipeline & In-App Updater (Completed ✅)

### Goal
Package release artifacts, configure multi-platform CI/CD workflows, and implement the automated desktop updater. Note: Model Context Protocol (MCP) server is centralized in the backend (`apps/api/src/modules/mcp/ikeen-mcp-server.ts`) for all agents, documented in `docs/architecture/MCP_ARCHITECTURE.md`.

### Target Features & Tasks
- [x] **4.1 Centralized Remote MCP Strategy**:
  - Direct all AI agents to the central Remote MCP server in `apps/api/src/modules/mcp` with unified authentication and synced database storage.
  - Documented architecture and preserved knowledge graph algorithms in [`docs/architecture/MCP_ARCHITECTURE.md`](file:///c:/Users/Dev%20Lee/Documents/@DevLee/mobile/ikeen/docs/architecture/MCP_ARCHITECTURE.md).
- [x] **4.2 Multi-Platform Build Pipeline**:
  - Configure Github Actions workflow for cross-compiling desktop binaries (`.github/workflows/desktop-release.yml` and `.github/workflows/desktop-ci.yml`):
    - **macOS**: Universal binary (`.dmg`, `.app`) with Apple Developer notarization.
    - **Windows**: x64 & ARM64 NSIS installers (`.exe`) and MSI packages (`.msi`).
    - **Linux**: `.AppImage` and `.deb` packages.
- [x] **4.3 Automated In-App Updates**:
  - Configure `@tauri-apps/plugin-updater` with public key verification and `latest.json` release manifest endpoints.
  - Check for release manifests on app launch and deliver background updates with interactive UI in `SettingsDialog.tsx` (`use-updater.ts`).

### Verification & Acceptance Criteria
- [x] Release binaries compile cleanly across macOS, Windows, and Linux via GitHub Actions release matrix.
- [x] In-app updater detects newer releases and upgrades seamlessly.
