import NetInfo from "@react-native-community/netinfo";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { and, eq, inArray, or } from "drizzle-orm";
import type {
  CreateNoteShareInput,
  ForkShareResponse,
  NoteShare,
  PublicSharedNote,
  UnlockShareResponse,
  UpdateNoteShareInput,
} from "@repo/types/shares";
import { db } from "@/db/client";
import { noteBlocks, syncOutbox } from "@/db/schema";
import { useAuthStore } from "@/lib/auth/auth-store";
import { syncManager } from "@/lib/sync/sync-manager";
import { ApiError, request } from "./api-client";

export type ShareExpiryPreset = "never" | "24h" | "7d" | "30d";

const EXPIRY_PRESET_MS: Record<Exclude<ShareExpiryPreset, "never">, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

export function computeExpiryIso(
  preset: ShareExpiryPreset,
  nowMs = Date.now(),
): string | null {
  if (preset === "never") return null;
  return new Date(nowMs + EXPIRY_PRESET_MS[preset]).toISOString();
}

export type PublicShareResult =
  | { status: "ok"; data: PublicSharedNote }
  | { status: "locked"; slug: string }
  | { status: "not_found" };

function getAuthToken(): string {
  const token = useAuthStore.getState().token;
  if (!token) {
    throw new ApiError("Sign in required to share notes", 401);
  }
  return token;
}

async function ensureNoteSyncedForShare(noteId: string): Promise<void> {
  const net = await NetInfo.fetch();
  if (!net.isConnected) {
    throw new ApiError("You are offline. Connect to the internet to share.", 0);
  }

  const blocks = await db
    .select({ id: noteBlocks.id })
    .from(noteBlocks)
    .where(eq(noteBlocks.noteId, noteId));

  const entityIds = [noteId, ...blocks.map((b) => b.id)];

  const pending = await db
    .select({ id: syncOutbox.id })
    .from(syncOutbox)
    .where(
      and(
        or(
          eq(syncOutbox.status, "pending"),
          eq(syncOutbox.status, "in_flight"),
        ),
        inArray(syncOutbox.entityId, entityIds),
      ),
    );

  if (pending.length > 0) {
    await syncManager.sync();
  }
}

// ============================================================================
// TanStack Query Keys & Hooks
// ============================================================================

export const shareKeys = {
  all: ["shares"] as const,
  detail: (noteId: string) => [...shareKeys.all, "note", noteId] as const,
  publicDetail: (slug: string, shareToken?: string) =>
    [...shareKeys.all, "public", slug, shareToken ?? ""] as const,
};

export function useNoteShare(noteId: string, enabled = true) {
  return useQuery({
    queryKey: shareKeys.detail(noteId),
    queryFn: async (): Promise<NoteShare | null> => {
      const token = getAuthToken();
      const data = await request<NoteShare | null>(`/notes/${noteId}/share`, {
        method: "GET",
        token,
      });
      return data ?? null;
    },
    enabled: Boolean(noteId) && enabled,
  });
}

export function useUpsertShare(noteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateNoteShareInput = {}): Promise<NoteShare> => {
      await ensureNoteSyncedForShare(noteId);
      const token = getAuthToken();
      return request<NoteShare>(`/notes/${noteId}/share`, {
        method: "POST",
        token,
        body: JSON.stringify(dto),
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(shareKeys.detail(noteId), updated);
    },
  });
}

export function useUpdateShare(noteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: UpdateNoteShareInput): Promise<NoteShare> => {
      const token = getAuthToken();
      return request<NoteShare>(`/notes/${noteId}/share`, {
        method: "PATCH",
        token,
        body: JSON.stringify(dto),
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(shareKeys.detail(noteId), updated);
    },
  });
}

export function useRevokeShare(noteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<{ revoked: true; noteId: string }> => {
      const token = getAuthToken();
      return request<{ revoked: true; noteId: string }>(
        `/notes/${noteId}/share`,
        {
          method: "DELETE",
          token,
        },
      );
    },
    onSuccess: () => {
      queryClient.setQueryData(shareKeys.detail(noteId), null);
    },
  });
}

export function usePublicShare(slug?: string, shareToken?: string) {
  return useQuery({
    queryKey: shareKeys.publicDetail(slug ?? "", shareToken),
    queryFn: async (): Promise<PublicShareResult> => {
      try {
        const data = await request<PublicSharedNote>(
          `/public/shares/${encodeURIComponent(slug!)}`,
          {
            method: "GET",
            headers: shareToken ? { "X-Share-Token": shareToken } : undefined,
          },
        );
        return { status: "ok", data };
      } catch (err) {
        if (
          err instanceof ApiError &&
          err.status === 401 &&
          err.data?.requiresPassword === true
        ) {
          return { status: "locked", slug: slug! };
        }
        return { status: "not_found" };
      }
    },
    enabled: Boolean(slug),
  });
}

export function useUnlockPublicShare(slug: string) {
  return useMutation({
    mutationFn: (password: string): Promise<UnlockShareResponse> =>
      request<UnlockShareResponse>(
        `/public/shares/${encodeURIComponent(slug)}/unlock`,
        {
          method: "POST",
          body: JSON.stringify({ password }),
        },
      ),
  });
}

export function useForkPublicShare() {
  return useMutation({
    mutationFn: async ({
      slug,
      shareToken,
    }: {
      slug: string;
      shareToken?: string;
    }): Promise<ForkShareResponse> => {
      const token = getAuthToken();
      const res = await request<ForkShareResponse>(
        `/public/shares/${encodeURIComponent(slug)}/fork`,
        {
          method: "POST",
          token,
          headers: shareToken ? { "X-Share-Token": shareToken } : undefined,
        },
      );
      await syncManager.sync();
      return res;
    },
  });
}
