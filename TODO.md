################################

# TODOs

- Recent Search on search page

#######################

### Finalized sync rules

1. **Mutation:** When a user creates or updates a record, create/update its `PENDING` sync-queue entry; if an existing mutation is already `IN_FLIGHT`, keep it immutable and create a new `PENDING` entry for the subsequent change.

2. **Network failure:** `PENDING → IN_FLIGHT → PENDING` when the request gets no response/connection fails, preserving the same mutation for retry; after the retry limit, transition to `FAILED` rather than resyncing all records.

3. **Sync status:** Each mutation follows `PENDING → IN_FLIGHT → SUCCESS` on a confirmed server response, or `PENDING/IN_FLIGHT → FAILED` on a non-retryable server error; the local record's sync state is updated accordingly.

4. **Sync engine execution:** The sync engine claims pending mutations by atomically transitioning them to `IN_FLIGHT`, processes each mutation, then transitions it to `SUCCESS`, `PENDING` (retryable failure), or `FAILED` (terminal failure), ensuring an `IN_FLIGHT` mutation is never coalesced or modified while it is being processed.


### Issues

> resetInFlightOnStartup: Best on startup 

> SYNC DOES NOT SUPPORT CREATED AT TIMESTAMP

## Keywords

- tombstones


###

 pathname: "/notes/[id]",
 pathname: "/notes/create|new",


- Chage all cosole.error -> cosole.warn


- App version