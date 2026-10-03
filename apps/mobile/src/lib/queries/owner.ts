import { eq, isNull, or, type SQL } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { useAuthStore } from "@/lib/auth/auth-store";

export function currentAuthUserId(): string | null {
  return useAuthStore.getState().user?.id ?? null;
}

/** Guest: userId IS NULL. Signed in: this user or leftover guest rows. */
export function ownerCondition(
  column: SQLiteColumn,
  userId: string | null = currentAuthUserId(),
): SQL {
  if (!userId) return isNull(column);
  return or(eq(column, userId), isNull(column)) as SQL;
}
