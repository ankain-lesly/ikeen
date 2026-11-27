import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ForkShareResponse,
  NoteShare,
  PublicSharedNote,
  ShareAccess,
  UnlockShareResponse,
} from "@repo/types/shares";
import { xenv } from "@/lib/env.client";
import { apiClient } from "./api-client";
import { noteKeys } from "./notes.api";
import { noteBlockSchema } from "./schemas";

// ============================================================================
// Zod Schemas
// ============================================================================

export const shareAccessSchema = z.enum(["view", "copy"]);

export const noteShareSchema: z.ZodType<NoteShare> = z.object({
  id: z.string(),
  noteId: z.string(),
  slug: z.string(),
  url: z.string(),
  isActive: z.boolean(),
  access: shareAccessSchema,
  hasPassword: z.boolean(),
  expiresAt: z.string().nullable(),
  viewCount: z.number().int().min(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const publicShareAuthorSchema = z.object({
  firstName: z.string(),
  username: z.string(),
});

export const publicSharedNoteSchema: z.ZodType<PublicSharedNote> = z.object({
  slug: z.string(),
  title: z.string(),
  content: z.string().default(""),
  tags: z.array(z.string()),
  updatedAt: z.string(),
  author: publicShareAuthorSchema,
  blocks: z.array(noteBlockSchema),
  access: shareAccessSchema,
  canFork: z.boolean(),
});

export const unlockShareResponseSchema: z.ZodType<UnlockShareResponse> =
  z.object({
    token: z.string().min(1),
    expiresIn: z.number().int().positive(),
  });

export const forkShareResponseSchema: z.ZodType<ForkShareResponse> = z.object({
  noteId: z.string().min(1),
  title: z.string(),
});

export const createShareInputSchema = z.object({
  access: shareAccessSchema.optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  password: z.string().min(4).max(128).nullable().optional(),
});

export const updateShareInputSchema = z.object({
  isActive: z.boolean().optional(),
  access: shareAccessSchema.optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  password: z.string().min(4).max(128).nullable().optional(),
  rotateSlug: z.boolean().optional(),
});

export type CreateSharePayload = z.infer<typeof createShareInputSchema>;
export type UpdateSharePayload = z.infer<typeof updateShareInputSchema>;

// ============================================================================
// Expiry Presets
// ============================================================================

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

// ============================================================================
// Query Keys
// ============================================================================

export const shareKeys = {
  all: ["shares"] as const,
  detail: (noteId: string) => [...shareKeys.all, "note", noteId] as const,
  publicDetail: (slug: string, shareToken?: string) =>
    [...shareKeys.all, "public", slug, shareToken ?? ""] as const,
};

// ============================================================================
// Owner Share Hooks
// ============================================================================

export function useNoteShare(noteId: string, enabled = true) {
  return useQuery({
    queryKey: shareKeys.detail(noteId),
    queryFn: async (): Promise<NoteShare | null> => {
      const { data } = await apiClient.get(`/api/v1/notes/${noteId}/share`);
      if (data === null || data === "") return null;
      return noteShareSchema.parse(data);
    },
    enabled: Boolean(noteId) && enabled,
  });
}

export function useUpsertShare(noteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateSharePayload = {}): Promise<NoteShare> => {
      const payload = createShareInputSchema.parse(dto);
      const { data } = await apiClient.post(
        `/api/v1/notes/${noteId}/share`,
        payload,
      );
      return noteShareSchema.parse(data);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(shareKeys.detail(noteId), updated);
    },
  });
}

export function useUpdateShare(noteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: UpdateSharePayload): Promise<NoteShare> => {
      const payload = updateShareInputSchema.parse(dto);
      const { data } = await apiClient.patch(
        `/api/v1/notes/${noteId}/share`,
        payload,
      );
      return noteShareSchema.parse(data);
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
      const { data } = await apiClient.delete(`/api/v1/notes/${noteId}/share`);
      return z
        .object({ revoked: z.literal(true), noteId: z.string() })
        .parse(data);
    },
    onSuccess: () => {
      queryClient.setQueryData(shareKeys.detail(noteId), null);
    },
  });
}

// ============================================================================
// Public Reader (SSR + Client Hooks) & Fork Hook
// ============================================================================

export type PublicShareResult =
  | { status: "ok"; data: PublicSharedNote }
  | { status: "locked"; slug: string }
  | { status: "not_found" };

export async function fetchPublicShareServer(
  slug: string,
  shareToken?: string,
): Promise<PublicShareResult> {
  const baseUrl = xenv.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  const headers: Record<string, string> = {};
  if (shareToken) {
    headers["X-Share-Token"] = shareToken;
  }

  try {
    const res = await fetch(
      `${baseUrl}/api/v1/public/shares/${encodeURIComponent(slug)}`,
      {
        headers,
        cache: "no-store",
      },
    );

    if (res.status === 401) {
      const body: unknown = await res.json().catch(() => null);
      if (
        typeof body === "object" &&
        body !== null &&
        "requiresPassword" in body &&
        (body as { requiresPassword?: unknown }).requiresPassword === true
      ) {
        return { status: "locked", slug };
      }
      return { status: "not_found" };
    }

    if (!res.ok) {
      return { status: "not_found" };
    }

    const json: unknown = await res.json();
    const parsed = publicSharedNoteSchema.safeParse(json);
    if (!parsed.success) {
      return { status: "not_found" };
    }
    return { status: "ok", data: parsed.data };
  } catch {
    return { status: "not_found" };
  }
}

export function usePublicShare(
  slug: string,
  shareToken?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: shareKeys.publicDetail(slug, shareToken),
    queryFn: async (): Promise<PublicSharedNote> => {
      const { data } = await apiClient.get(
        `/api/v1/public/shares/${encodeURIComponent(slug)}`,
        {
          headers: shareToken ? { "X-Share-Token": shareToken } : undefined,
        },
      );
      return publicSharedNoteSchema.parse(data);
    },
    enabled: Boolean(slug) && Boolean(shareToken) && enabled,
    retry: false,
  });
}

export function useUnlockPublicShare(slug: string) {
  return useMutation({
    mutationFn: async (password: string): Promise<UnlockShareResponse> => {
      const { data } = await apiClient.post(
        `/api/v1/public/shares/${encodeURIComponent(slug)}/unlock`,
        { password },
      );
      return unlockShareResponseSchema.parse(data);
    },
  });
}

export function useForkShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      slug,
      shareToken,
    }: {
      slug: string;
      shareToken?: string;
    }): Promise<ForkShareResponse> => {
      const { data } = await apiClient.post(
        `/api/v1/public/shares/${encodeURIComponent(slug)}/fork`,
        undefined,
        {
          headers: shareToken ? { "X-Share-Token": shareToken } : undefined,
        },
      );
      return forkShareResponseSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
}

export type { ShareAccess };
