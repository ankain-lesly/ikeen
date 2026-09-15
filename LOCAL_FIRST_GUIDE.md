# Local-First Architecture & Sync Guide (Expo + Serverless Express)

This guide defines the end-to-end architecture, data contracts, and implementation blueprints for a **Local-First Expo Mobile Application** synced with a **Serverless Express Backend**, powered by **PostgreSQL (Prisma 7)**, **Local SQLite (Drizzle ORM)**, and **Pusher** for real-time invalidation.

---

## 1. Architectural Pillars

1. **Local Data Primacy**: All reads and writes happen against an embedded SQLite database on the mobile device. The UI never blocks on network requests; operations are instantaneous (0 ms latency).
2. **Serverless Express as Central Orchestrator**: The backend remains the single source of truth and validation gatekeeper. Every mutation passes through Express so that **AI Agents** can ingest content, generate vector embeddings, extract memories, and trigger notifications.
3. **Pusher for Real-Time Sync Signals**: Because the backend runs on stateless, serverless functions (where long-lived WebSocket servers like Socket.IO are not feasible), the backend triggers sync invalidation events via **Pusher HTTP REST API**, and the mobile client receives them over Pusher's managed WebSocket infrastructure.
4. **Single-User Writes & Last-Write-Wins (LWW)**: Notes and memories are authored and modified by the authenticated owner. Conflicts are resolved deterministically using revision timestamps (`updatedAt`).

---

## 2. System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 Expo Mobile (SDK 57)                                   │
│                                                                                        │
│   ┌─────────────────────────┐          ┌───────────────────────────────────────────┐   │
│   │      UI Components      │◄────────►│            Local SQLite DB                │   │
│   │  (Instant Reads/Writes) │          │     (expo-sqlite + Drizzle ORM + FTS5)    │   │
│   └─────────────────────────┘          └─────────────────────┬─────────────────────┘   │
│                                                              │                         │
│                                        ┌─────────────────────▼─────────────────────┐   │
│                                        │                Sync Engine                │   │
│                                        │       (Outbox Queue + Pull/Push)          │   │
│                                        └──────────────┬──────────────────▲─────────┘   │
└───────────────────────────────────────────────────────┼──────────────────┼─────────────┘
                                                        │                  │
                                 HTTPS (Push / Pull)    │                  │ Pusher WebSockets
                                                        ▼                  │ (Sync Signal)
┌──────────────────────────────────────────────────────────────────────────┴─────────────┐
│                          Serverless Express Backend (@repo/db)                         │
│                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │                              Sync API Controller                               │   │
│   │        • POST /api/sync/push   (Validate, apply LWW, trigger AI tasks)         │   │
│   │        • GET  /api/sync/pull   (Fetch changes since lastPulledAt)              │   │
│   └───────────────────────┬────────────────────────────────────────────────┬───────┘   │
│                           │                                                │           │
│                           ▼                                                ▼           │
│   ┌─────────────────────────────────────────────┐        ┌─────────────────────────┐   │
│   │         PostgreSQL Database (Prisma 7)      │        │     Pusher Trigger      │   │
│   │             (Source of Truth)               │        │   (HTTP POST to Pusher) │   │
│   └───────────────────────┬─────────────────────┘        └─────────────────────────┘   │
│                           │                                                            │
│                           ▼                                                            │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │                           AI Agent Pipeline & Jobs                             │   │
│   │      (Memory Extraction, Vector Embeddings, Note Summaries, Auto-Tagging)      │   │
│   └────────────────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Evaluation: Drizzle vs. Prisma on Mobile

| Dimension | Drizzle ORM (`drizzle-orm/expo-sqlite`) | Prisma (`@prisma/react-native`) |
| :--- | :--- | :--- |
| **Runtime Overhead** | **~25 KB pure TypeScript**. Zero binary footprint. Compiles down to native SQL strings. | **Heavy (~3–8 MB)**. Ships a compiled WebAssembly/Rust engine inside the mobile app bundle. |
| **Expo & New Arch** | **First-class Day-1 support**. Directly consumes `expo-sqlite` (maintained by Expo core team). Fully compatible with RN 0.86 / React 19. | **Experimental / Early Access**. Often lags behind React Native TurboModules and architectural overhauls. |
| **Client Migrations** | **Built-in mobile runner**: `useMigrations(db, migrations)` executes bundled SQL on app launch. | **Manual workarounds**. `prisma migrate` CLI cannot run on mobile devices. |
| **Offline Search** | **Native SQLite FTS5 support**. Enables instant offline full-text search across thousands of notes. | Requires custom raw SQL execution workarounds. |

> **Verdict**: Use **Prisma 7** on the serverless Express backend (where its Postgres migrations and relational queries shine), and use **Drizzle ORM + `expo-sqlite`** on the mobile client.

---

## 4. Universal Data Contracts (LWW Standard)

Every synchronized entity (`Note`, `Memory`) adheres to the following core columns:

```prisma
// Shared Contract Fields
id        String    @id @default(uuid()) // Client-generated UUID v4
userId    String                         // Owner reference
version   Int       @default(1)          // Incremented per mutation
createdAt DateTime  @default(now())
updatedAt DateTime  @updatedAt           // LWW comparison anchor
deletedAt DateTime?                      // Soft delete / Tombstone
```

### Prisma Models (`packages/database/prisma/schema.prisma`)

```prisma
model Note {
  id        String    @id @default(uuid())
  userId    String
  title     String    @db.VarChar(255)
  content   String    @db.Text
  tags      String[]  @default([])
  version   Int       @default(1)

  // AI Enrichment Fields
  summary   String?   @db.Text
  isProcessed Boolean @default(false)

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, updatedAt])
  @@index([userId, deletedAt])
  @@map("notes")
}

model Memory {
  id          String    @id @default(uuid())
  userId      String
  sourceNoteId String?  // Optional reference to originating note
  content     String    @db.Text
  category    String    @default("general") @db.VarChar(50)
  importance  Int       @default(1)
  version     Int       @default(1)

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, updatedAt])
  @@index([userId, category])
  @@map("memories")
}
```

---

## 5. Mobile SQLite Schema (Drizzle ORM)

In `apps/mobile/src/db/schema.ts`:

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const localNotes = sqliteTable("notes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  tags: text("tags"), // JSON stringified array
  summary: text("summary"),
  isProcessed: integer("is_processed", { mode: "boolean" }).default(false),
  version: integer("version").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
  
  // Local Sync Tracking
  syncStatus: text("sync_status", { 
    enum: ["synced", "pending_insert", "pending_update", "pending_delete"] 
  }).notNull().default("synced"),
});

export const localMemories = sqliteTable("memories", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  sourceNoteId: text("source_note_id"),
  content: text("content").notNull(),
  category: text("category").notNull().default("general"),
  importance: integer("importance").notNull().default(1),
  version: integer("version").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
  
  syncStatus: text("sync_status", { 
    enum: ["synced", "pending_insert", "pending_update", "pending_delete"] 
  }).notNull().default("synced"),
});

// Outbox Mutation Queue
export const syncOutbox = sqliteTable("sync_outbox", {
  id: text("id").primaryKey(),
  entity: text("entity", { enum: ["note", "memory"] }).notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action", { enum: ["insert", "update", "delete"] }).notNull(),
  payload: text("payload").notNull(), // JSON stringified entity data
  createdAt: text("created_at").notNull(),
  retryCount: integer("retry_count").notNull().default(0),
});
```

---

## 6. Serverless Sync Protocols

### 1. Push (`POST /api/sync/push`)
The mobile client flushes pending outbox mutations in a single batch.

#### Request Body
```json
{
  "clientTimestamp": "2026-09-13T14:30:00.000Z",
  "mutations": [
    {
      "outboxId": "uuid-1",
      "entity": "note",
      "entityId": "note-uuid-abc",
      "action": "insert",
      "data": {
        "id": "note-uuid-abc",
        "title": "Meeting with Lead Architect",
        "content": "Discussed local-first sync with serverless Express.",
        "updatedAt": "2026-09-13T14:29:55.000Z"
      }
    }
  ]
}
```

#### Serverless Execution Steps:
1. Authenticate `userId` from Bearer token.
2. Inside a Prisma `$transaction`:
   - Check existing record. If incoming `updatedAt >= existing.updatedAt`, apply mutation (LWW).
   - If action is `delete`, set `deletedAt = now()`.
3. Dispatch background AI task (e.g. queue memory extraction from note).
4. Publish a Pusher event on `private-user-{userId}` with channel event `sync:invalidate` to alert any other active devices.
5. Return success statuses for each `outboxId`.

---

### 2. Pull (`GET /api/sync/pull?since=<iso_timestamp>`)
Fetches all server deltas (inserts, updates, soft deletes) since `since`.

#### Serverless Query:
```typescript
const sinceDate = req.query.since ? new Date(req.query.since as string) : new Date(0);
const userId = req.user.id;

const [updatedNotes, updatedMemories] = await Promise.all([
  prisma.note.findMany({
    where: {
      userId,
      updatedAt: { gt: sinceDate },
    },
  }),
  prisma.memory.findMany({
    where: {
      userId,
      updatedAt: { gt: sinceDate },
    },
  }),
]);

return res.json({
  serverTimestamp: new Date().toISOString(),
  deltas: {
    notes: updatedNotes,
    memories: updatedMemories,
  },
});
```

#### Mobile Client Pull Handling:
1. Merge server deltas into SQLite tables using LWW (`if server.updatedAt >= local.updatedAt`).
2. If `deletedAt !== null`, remove from active UI queries or hard-delete if no pending outbox mutations exist.
3. Save `serverTimestamp` as the new `lastPulledAt` in `expo-secure-store`.

---

## 7. Real-Time Sync Invalidation with Pusher

Because serverless functions terminate after each request, **Pusher** provides the bridge between serverless events and mobile real-time updates:

```
[Mobile App] --(Push Mutation)--> [Serverless Express]
                                           │
                                    (1) Writes DB
                                    (2) Enqueues AI Job
                                    (3) pusher.trigger()
                                           │
                                           ▼
                                 [Pusher Cloud Service]
                                           │
                                (WebSocket Broadcast)
                                           │
                                           ▼
[Other Mobile / Web Client] <── (Event: 'sync:invalidate')
         │
    (Auto-runs GET /api/sync/pull)
```

### Backend Integration (`apps/backend/src/shared/lib/pusher.ts`)
```typescript
import Pusher from "pusher";

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

export async function notifyDataInvalidated(userId: string, entity: "notes" | "memories") {
  await pusherServer.trigger(`private-user-${userId}`, "sync:invalidate", {
    entity,
    timestamp: new Date().toISOString(),
  });
}
```

### Mobile Integration (`apps/mobile/src/services/pusher.ts`)
```typescript
import Pusher from "pusher-js/react-native";
import { syncManager } from "./SyncManager";

export function initRealtimeSync(userId: string, userToken: string) {
  const pusher = new Pusher(process.env.EXPO_PUBLIC_PUSHER_KEY!, {
    cluster: process.env.EXPO_PUBLIC_PUSHER_CLUSTER!,
    authEndpoint: `${process.env.EXPO_PUBLIC_API_URL}/api/pusher/auth`,
    auth: {
      headers: { Authorization: `Bearer ${userToken}` },
    },
  });

  const channel = pusher.subscribe(`private-user-${userId}`);
  channel.bind("sync:invalidate", async (_data: { entity: string }) => {
    // Immediate background delta pull
    await syncManager.pull();
  });

  return () => {
    channel.unbind_all();
    pusher.unsubscribe(`private-user-${userId}`);
  };
}
```

---

## 8. AI Agent Integration Workflow

When notes and memories pass through the Express backend:

1. **Memory Extraction**:
   - Express runs an asynchronous AI service (e.g. LangChain / OpenAI / Gemini) that extracts core facts from the note:
     ```
     Input Note: "Met with Sarah today. She prefers Figma for wireframes and wants the MVP ready by October 15."
     Extracted Memory: "Sarah prefers Figma; target MVP deadline is October 15."
     ```
2. **Persistent Storage**:
   - The AI Agent inserts the memory into the `memories` table with `sourceNoteId = note.id`.
3. **Pusher Event Notification**:
   - The backend fires `notifyDataInvalidated(userId, "memories")`.
4. **Mobile Instant Sync**:
   - Mobile receives the Pusher event, pulls the delta, and the user sees the newly extracted memory without ever refreshing.

---

## 9. Monorepo Setup Checklist

1. **Install Mobile Dependencies**:
   ```bash
   bun add expo-sqlite drizzle-orm pusher-js @react-native-community/netinfo --filter=@repo/mobile
   bun add -D drizzle-kit --filter=@repo/mobile
   ```
2. **Install Server Dependencies**:
   ```bash
   bun add pusher --filter=ikeen-backend
   ```
3. **Generate Prisma Client**:
   Update `packages/database/prisma/schema.prisma` with `Note` and `Memory` models, then execute:
   ```bash
   bun run --filter=@repo/db db:generate
   ```
4. **Initialize Drizzle**:
   Create `drizzle.config.ts` in `apps/mobile` targeting `./src/db/schema.ts` with dialect `sqlite`.
