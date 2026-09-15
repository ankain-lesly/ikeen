## Sync Architecture: Full Options Evaluation

---

### 1. Legend-State

* **Status:** Discarded
* **Why not using it:**
* Legend-State persists data into SQLite primarily as serialized key-value state trees or blobs rather than real relational SQL tables.
* You lose the ability to write direct, native SQL queries, relational joins, and indexing over your offline dataset.
* Because it hydrates observables into JavaScript memory on startup, it behaves like an in-memory state tree backed by disk rather than a true database engine.



---

### 2. TinyBase

* **Status:** Discarded
* **CRDT Meaning:** **Conflict-Free Replicated Data Type** — a data structure and algorithm that allows concurrent, independent edits across multiple offline nodes to merge automatically without conflicts or central server coordination.
* **Why not using CRDTs:**
* Because this notes app is not a collaborative, real-time multiplayer workspace (like Google Docs or Figma), CRDTs add unnecessary metadata overhead (vector clocks, hash trees), operational complexity, and serverless impedance mismatches without delivering tangible benefit.
* When concurrent edits do happen (e.g., an AI agent updates metadata while the user writes offline), standard column-level isolation or timestamp-based Last-Write-Wins (LWW) solves the issue cleanly.


* **Why not using TinyBase:**
* Without CRDTs, TinyBase functions as a tabular reactive store where custom push/pull sync logic still has to be implemented manually.
* Its built-in sync protocols rely heavily on stateful, persistent WebSocket connections, which conflict with stateless, serverless HTTP functions unless external edge infrastructure (like Cloudflare Durable Objects or PartyKit) is added.



---

### 3. WatermelonDB

* **Status:** Discarded
* **Why not using it:**
* **Engineered for extreme scale:** Built specifically to solve thread-blocking when handling tens of thousands of records (via JSI and lazy RxJS observables). For a personal notes app with hundreds to thousands of records, this performance overhead is unnecessary.
* **Native build friction:** Relies on custom native code bindings and cannot run on a standard Expo managed workflow without custom development builds (`expo-dev-client`) and native configuration plugins.
* **Schema duplication:** Requires defining and maintaining separate database models and decorator classes for mobile SQLite, in addition to the backend Prisma PostgreSQL schema.



---

### 4. Prisma ORM for Expo

* **Status:** Discarded
* **Why not using it:**
* **Local-only query engine:** Prisma for Expo provides reactive hooks (`useFindMany`) and allows using Prisma's query syntax locally against SQLite, but it does **not** include an automated, bi-directional remote synchronization engine.
* **Manual sync plumbing:** To make it local-first with a serverless backend, you still have to build the entire network transport, mutation tracking queue, and conflict resolution protocol from scratch.
* **Binary overhead:** Embedding the local Prisma engine and query compiler into mobile bundles adds unnecessary footprint compared to lightweight SQLite drivers.



---

### 5. LiveStore

* **Status:** Discarded
* **Why not using it:**
* **Event sourcing requirement:** LiveStore achieves local-first reactivity and Git-like rebasing via an immutable, ordered event log rather than standard CRUD row mutations.
* **Backend mismatch:** Adopting LiveStore would require redesigning your existing Express/Prisma PostgreSQL architecture into an event-sourcing append-only log, rather than interacting with standard relational tables.
* **Overkill for notes:** Tracking every single keystroke or UI state transition as an event stream introduces unwarranted architectural complexity for standard notes persistence.



---

### 6. PowerSync

* **Status:** Discarded (Alternative Considered)
* **Why not using it:**
* **Additional infrastructure requirement:** PowerSync requires hosting and maintaining a separate PowerSync sync service (or paying for their cloud product) that hooks into PostgreSQL's Write-Ahead Log (WAL) via logical replication.
* **Avoids external dependencies:** While it eliminates writing sync endpoints, your architecture is better served by keeping the sync flow self-contained within your existing serverless Express/Prisma REST API rather than introducing third-party replication middleware.



---

### 7. Drizzle ORM + `expo-sqlite`

* **Status:** **Selected Solution**
* **Why using it:**
* **Zero native build friction:** Runs directly on modern `expo-sqlite` using official first-class driver support (`drizzle-orm/expo-sqlite`). No custom native plugins, no JSI build headaches, and fully compatible with the standard Expo workflow.
* **Unified TypeScript ergonomics:** Schemas are written in pure TypeScript and mirror the backend Prisma schema structure directly, eliminating decorator models and boilerplate.
* **Built-in UI reactivity:** Native support for the `useLiveQuery` hook automatically re-renders React Native components whenever watched SQLite tables change.
* **Clean serverless integration:** Pairs with a lightweight client-side `sync_queue` table to push batched mutations to standard serverless Express/Prisma endpoints (`POST /sync/push`) and pull server/AI-generated updates (`GET /sync/pull?since=timestamp`).