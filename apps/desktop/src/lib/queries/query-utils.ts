/**
 * Generates an RFC 4122 v4 UUID compatible with Backend Prisma and Mobile SQLite.
 */
export function newId(): string {
  return crypto.randomUUID();
}

/**
 * Last-Write-Wins (LWW) timestamp guard for incoming delta sync entities.
 * Returns true if the incoming entity should overwrite the local row.
 */
export function shouldApplySyncUpdate(
  existingUpdatedAt: string | null | undefined,
  incomingUpdatedAt: string
): boolean {
  if (!existingUpdatedAt) return true;
  return new Date(existingUpdatedAt).getTime() <= new Date(incomingUpdatedAt).getTime();
}
