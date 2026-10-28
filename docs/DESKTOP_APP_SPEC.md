# iKeen Desktop Client: Architecture & Technical Specification

## 1. Overview & Architectural Vision

The **iKeen Desktop Client** (`apps/desktop`) is an ultra-fast, local-first personal knowledge environment and AI command center engineered using **Tauri v2**. 

It expands iKeen beyond mobile (`apps/mobile`) and web (`apps/web`) into a persistent desktop experience optimized for high-throughput keyboard workflows, instant full-text note retrieval, offline resilience, and sandboxed AI/MCP tool orchestration.

---

## 2. Core Pillars & Technology Evaluation

### 2.1 The Selection of Tauri v2
As established in iKeen's local-first philosophy ([`LOCAL_FIRST_TOOLS.md`](file:///c:/Users/Dev%20Lee/Documents/@DevLee/mobile/ikeen/docs/LOCAL_FIRST_TOOLS.md)), heavyweight runtimes that penalize startup latency or bloat device memory are fundamentally rejected.

| Architectural Dimension | Tauri v2 Standard | Legacy Electron Alternative | Impact on iKeen |
| :--- | :--- | :--- | :--- |
| **Idle Memory Footprint** | **30 – 50 MB** | 350 – 600 MB | Runs in macOS menu bar / Windows system tray 24/7 without battery drain. |
| **Binary Bundle Size** | **10 – 15 MB** | 160 – 240 MB | Fast downloads, lightweight updates, small disk footprint. |
| **Cold Launch Time** | **< 300 ms** | 2.5 – 5.0 s | Enables instant-on note taking and fast command execution. |
| **Webview Engine** | Native OS Webview (WebView2 / WebKit) | Bundled Chromium | Evergreen security patches handled by the OS. |
| **Local Storage (SQLite)** | Native C/Rust SQLite + FTS5 | Node.js `better-sqlite3` addon | 0ms local query latency and instant full-text search. |
| **Sidecar Processes** | Native Sandboxed Binaries (`tauri-plugin-shell`) | Child Process Node Spawning | First-class orchestration of local Model Context Protocol (MCP) servers. |

---

## 3. Monorepo Integration & Workspace Structure

The desktop application sits inside the Turborepo monorepo alongside existing applications:

```text
ikeen/
├── apps/
│   ├── api/                    # NestJS + Prisma 7 Serverless Backend
│   ├── mobile/                 # Expo SDK 57 / React Native 0.86
│   ├── web/                    # Next.js 16.3 / Tailwind CSS v4 Dashboard
│   └── desktop/                # [NEW] Tauri v2 Desktop Application
│       ├── src/                # React 19 Frontend (Vite + Tailwind v4)
│       │   ├── app/            # Views (Canvas, Dual-Pane Editor, Settings)
│       │   ├── components/     # Desktop UI (Sidebar, CommandPalette, CaptureHUD)
│       │   ├── db/             # Drizzle ORM SQLite client & migrations
│       │   ├── hooks/          # Keyboard shortcuts, sync listeners, live queries
│       │   └── stores/         # Zustand desktop layout & active note state
│       ├── src-tauri/          # Rust Desktop Core
│       │   ├── src/
│       │   │   ├── lib.rs      # Plugin registrations & window handlers
│       │   │   └── main.rs     # Tauri runtime entrypoint
│       │   ├── Cargo.toml      # Rust dependencies & features
│       │   └── tauri.conf.json # Window, Tray, Shortcut, & Permission manifests
│       ├── package.json        # @repo/desktop
│       ├── tsconfig.json       # Extends @repo/typescript-config
│       └── vite.config.ts      # Vite 6 bundler with Tailwind CSS v4
├── packages/
│   ├── types/                  # Shared domain types (@repo/types)
│   ├── utils/                  # Universal utility functions (@repo/utils)
│   ├── typescript-config/      # Base TypeScript compiler configs
│   └── eslint-config/          # Shared linting configs
└── docs/
    └── DESKTOP_APP_SPEC.md     # This specification document
```

---

## 4. Subsystem Architectures

### 4.1 Local Persistence & FTS5 Search
* **Database Engine**: Embedded SQLite database (`ikeen_desktop.db`) managed via `@tauri-apps/plugin-sql` and Rust backend.
* **ORM Layer**: Type-safe schema matching `apps/mobile/src/db/schema.ts` executed through Drizzle ORM's SQLite proxy (`drizzle-orm/sqlite-proxy`).
* **Full-Text Search (FTS5)**: A dedicated SQLite virtual table indexing `title`, `content`, `summary`, and `tags`, enabling instant fuzzy search across 100,000+ notes in < 5ms.
* **Sync Outbox & Invalidation**:
  * Mutations write locally first and enqueue to `sync_outbox`.
  * Background worker flushes mutations to `POST /api/sync/push`.
  * Real-time sync signals received via Pusher/Ably trigger incremental `GET /api/sync/pull?since=...`.

### 4.2 Multi-Window Architecture & Quick Capture
1. **Main Canvas Window**:
   - Dual-pane or three-pane layout: Folders Tree -> Notes List -> Fullscreen Block/Markdown Editor.
   - Resizable panes, full keyboard navigation, and split-view comparison.
2. **Quick Capture HUD Window**:
   - Frameless, translucent, floating window summoned via global hotkey (`Cmd+Shift+Space` on macOS, `Ctrl+Shift+Space` on Windows).
   - Designed for fast thought capture, audio memo ingestion, or direct AI prompt input without leaving the active foreground app.
   - Closes automatically upon submission or `Escape`.
3. **System Tray Integration**:
   - Native menu bar / tray icon indicating active sync state (Idle, Syncing, Offline).
   - Quick menu: "New Note", "Open Quick Capture", "Sync Now", "Preferences", "Quit".

### 4.3 Local AI & MCP Tool Orchestration
* **Sidecar Capabilities**: Tauri v2's native sidecar feature allows launching bundled executable binaries.
* **Local MCP Integration**: Enables running local Model Context Protocol servers (e.g. SQLite analyzer, filesystem inspector, local Git integration) directly on the user's workstation.
* **Context Streaming**: The desktop canvas interfaces directly with both remote streaming agents (`apps/api`) and local sidecars with minimal latency.

---

## 5. Security & Permission Architecture

Tauri v2 enforces an explicit capability-based security model:
* **Filesystem Access**: Confined to the user-selected vault directory and the app's local data directory (`$APPDATA/ikeen`).
* **Network Access**: Restricted strictly to the iKeen backend domain, Pusher/Ably real-time gateways, and user-configured MCP endpoints.
* **Shell Execution**: Hardened against arbitrary command execution; only pre-declared sidecar binaries can be spawned.
