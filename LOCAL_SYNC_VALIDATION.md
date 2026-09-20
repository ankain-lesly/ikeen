## Top Local First Sync Validation Questions


@author Lesly Chuo
@email lesly@leslychuo.me
@github github.com/ankain-lesly/ikeen

@version: 1
@appVersion: 0.0.1

---

1. How do you handle idempotency:
> Cases when network fails and no response or error is returned from the server. If not handled, the server can still run same migrations again and again. How does it recognize an already processed mutation and ensue it doesn't exist twice

2. Sync Queue update/coalesce:
> How does the sync queue work when creating records. Does create multiple records or simple update. Clearly explain how update/coalesce is implemented.

3.Clock Skew Resistance:
> I understand the clock skew has been handled by using and maintain service time.

4. Deduplication Optimization: 
> Clean the queue array before hitting the wire. If a row gets created and then instantly deleted while offline, drop both actions from the payload to minimize server requests.

5. Pagination Limits: 
> Batch large sync pushes. Limit processing to 100–500 queue records per HTTP request cycle to avoid exceeding server memory allocations or breaking database request limits.

6. Soft Delete
> Clearly outline how soft delete is implemented on both apps.

7. Mutations In flights:
> If the system is currently syncing how do you handle cases were the user tries to update a local record while syncing is in progress

8. Inflight Syncs Traffic Control:
> How do you handle sync to ensure the sync system does not run duplicate requests over. What strategy works, handling network edge cases and what has been implemented today.

8. Field Mutations:
> Considering a note where folderId, isPinned, isAchieved, tags, ...etc can be updated separately, how to you handle the sync queue

10. Sync Queue Records:
> Does the sync queue table/schema records persist or get pruned after a sync

11. Dependency Try:
> What is the sync order, syncing notes first or folders to ensure structural relationships on server


sync queue => sync outbox