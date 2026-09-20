# Project Roadmap & Deferred Sync Engine Improvements

The following sync engine improvements have been deferred for later review and implementation:

## 1. Clock Skew Resistance & Non-Skipping Delta Snapshots
- **Context**: Delta skipping can occur if the server captures its snapshot timestamp *after* querying records, or if client clocks drift far ahead under Last-Write-Wins.
- **Review Items**:
  - Capture `serverTimestamp` before querying delta records (`updatedAt >= sinceDate`).
  - Server-side timestamp clamping for rogue client clocks exceeding threshold (`serverNow + 5 minutes`).

## 2. Offline Deduplication (Create-Then-Delete Short-Circuit)
- **Context**: A user creates an entity offline and deletes it while still offline before syncing.
- **Review Items**:
  - In `enqueueOutbox`: detect if an entity being deleted was only ever created locally and never pushed to the server.
  - Purge the outbox row directly and hard-delete from local SQLite, avoiding sending a create followed by a delete/tombstone over the wire.

## 3. Soft Delete & Tombstone Pruning Policy
- **Context**: Soft-deleted entities (`deletedAt IS NOT NULL`) accumulate in both PostgreSQL and SQLite indefinitely.
- **Review Items**:
  - Establish a 90-day server-side retention policy (`DELETE FROM notes WHERE deletedAt < NOW() - INTERVAL '90 days'`).
  - Client-side 