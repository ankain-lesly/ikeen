compaction during background database maintenance to purge stale tombstones older than 90 days.


################################

# TODOs

- Recent Search


## User validate
>User Review Required
>IMPORTANT

0.

> Guest Notes Cloud Migration: When a guest user logs in or registers on a device containing local notes, those local notes will automatically be linked to their authenticated account (userId = user.id) and pushed to the cloud in the initial sync cycle.

> If this approach is proper or first initialize the sync queue

1. 

> First user sync what is the flow. Should the sync queue be prepared or launch straight to syncing?

2.
> Incase of Network Failure, will the server run same mutation again and again?

> So the server should accept an idempotency key for each queued mutation 
> Verify the pattern for idempotency key and how to generate considering point 3. blow
> The client sends the same mutationId on every retry. The server recognizes an already-processed mutation and doesn't execute it twice.

3. 

> How do you haneld update/Coalesce

## Key considerations

Yes, consider these four critical details before writing your sync code:

* Idempotency Handling: Devices will retry uploads if network timeouts happen. The server must ignore actions it has already applied to prevent data duplication.

* Clock Skew Resistance: Never trust the device system clock. Rely strictly on incremental version sequences or the server timestamp to resolve structural data conflicts.

* Deduplication Optimization: Clean the queue array before hitting the wire. If a row gets created and then instantly deleted while offline, drop both actions from the payload to minimize server requests.

* Pagination Limits: Batch large sync pushes. Limit processing to 100–500 queue records per HTTP request cycle to avoid exceeding server memory allocations or breaking database request limits.

* Soft Delete

> Optimal approach: update/coalesce the existing queue entry when possible, rather than creating a new queue record for every local change.



#######################

### Finalized sync rules

1. **Mutation:** When a user creates or updates a record, create/update its `PENDING` sync-queue entry; if an existing mutation is already `IN_FLIGHT`, keep it immutable and create a new `PENDING` entry for the subsequent change.

2. **Network failure:** `PENDING → IN_FLIGHT → PENDING` when the request gets no response/connection fails, preserving the same mutation for retry; after the retry limit, transition to `FAILED` rather than resyncing all records.

3. **Sync status:** Each mutation follows `PENDING → IN_FLIGHT → SUCCESS` on a confirmed server response, or `PENDING/IN_FLIGHT → FAILED` on a non-retryable server error; the local record's sync state is updated accordingly.

4. **Sync engine execution:** The sync engine claims pending mutations by atomically transitioning them to `IN_FLIGHT`, processes each mutation, then transitions it to `SUCCESS`, `PENDING` (retryable failure), or `FAILED` (terminal failure), ensuring an `IN_FLIGHT` mutation is never coalesced or modified while it is being processed.


### Issues

- Refactor and Created Dedicated Module for Ably
- Avoid f: any declarations

- Add versions to notes on update, same to sync_queue
- 
- inconsistency all mutations should be done on the notes/folder modules

- On the api: Avoid using any for known objects like (tx: any) for transactions and (f: any) use (tx) and (f) as they come :
  > a the appropriate type for a tx (transactions) is Prisma.TransactionClient or  PrismaService if it defaults to the PrismaService
- api not logging api requests For monitoring and observing on console

  > logging should be comprehensive both for server and client.
  > on the server start from api request logs, log certain events, pull/push initiated, events, ably, etc
  > on client, log network changes, triggers, events, ably ..etc




Fix: Update/Coalesce

Use one sync_queue record

keep changes in a different schema sync_queue_drifts


---

review the idempotency handling and clock skew Resistancei


 

 ## Validation

 Strict Field Tracking: The outbox payload carries only changes: Partial<Entity>, never full record snapshots.

 > Ensure across all edits using the same reusable record update function. to ensure consistency and avoid duplications.


> resetInFlightOnStartup: Best on startup 

> SYNC DOES NOT SUPPORT CREATED AT TIMESTAMP