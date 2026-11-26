export type SyncFailureCategory =
  | 'transient_no_penalty'
  | 'server_error'
  | 'client_rejected';

/**
 * Strictly classifies HTTP / network push failures before mutating outbox retry state:
 * - `transient_no_penalty` (offline status 0, 401/403 auth expiry, 408 timeout, 429 rate-limit):
 *   Resets `in_flight` -> `pending` WITHOUT incrementing `retryCount`.
 * - `server_error` (5xx):
 *   Increments `retryCount`; stays `pending` until `MAX_RETRIES` is reached.
 * - `client_rejected` (400, 404, 409, 422):
 *   Explicit server rejection; increments `retryCount` and marks `failed` at `MAX_RETRIES`.
 */
export function classifySyncPushFailure(
  status?: number,
  errorMessage?: string,
): SyncFailureCategory {
  // Check for network errors or connection exceptions by error message first
  if (errorMessage) {
    const msg = errorMessage.toLowerCase();
    if (
      msg.includes('network') ||
      msg.includes('fetch') ||
      msg.includes('timeout') ||
      msg.includes('abort') ||
      msg.includes('offline') ||
      msg.includes('connection') ||
      msg.includes('econn') ||
      msg.includes('enotfound') ||
      msg.includes('socket') ||
      msg.includes('failed to fetch') ||
      msg.includes('network request failed')
    ) {
      return 'transient_no_penalty';
    }
  }

  // Unknown, missing, or non-standard responses are transient (never penalize or mark failed)
  if (
    status === undefined ||
    status === null ||
    status === 0 ||
    isNaN(status) ||
    status < 100 ||
    status >= 600 ||
    status === 401 ||
    status === 403 ||
    status === 408 ||
    status === 429
  ) {
    return 'transient_no_penalty';
  }

  if (status >= 500 && status < 600) {
    return 'server_error';
  }

  return 'client_rejected';
}
