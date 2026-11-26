import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { NoteBlock } from "@repo/types";
import { apiClient } from "./api-client";
import {
  noteBlockSchema,
  softDeleteBlockResponseSchema,
  upsertBlockInputSchema,
  type NoteDetail,
} from "./schemas";
import { noteKeys } from "./notes.api";

export type UpsertBlockPayload = z.infer<typeof upsertBlockInputSchema>;
export type SoftDeleteBlockResponse = z.infer<
  typeof softDeleteBlockResponseSchema
>;

export async function upsertBlockApi(
  noteId: string,
  blockId: string,
  dto: UpsertBlockPayload,
): Promise<NoteBlock> {
  const payload = upsertBlockInputSchema.parse(dto);
  const { data } = await apiClient.put(
    `/api/v1/notes/${noteId}/blocks/${blockId}`,
    payload,
  );
  return noteBlockSchema.parse(data);
}

export async function deleteBlockApi(
  noteId: string,
  blockId: string,
): Promise<SoftDeleteBlockResponse> {
  const { data } = await apiClient.delete(
    `/api/v1/notes/${noteId}/blocks/${blockId}`,
  );
  return softDeleteBlockResponseSchema.parse(data);
}

export async function reorderBlocksApi(
  noteId: string,
  blockIds: string[],
): Promise<NoteBlock[]> {
  const { data } = await apiClient.patch(
    `/api/v1/notes/${noteId}/blocks/reorder`,
    { blockIds },
  );
  return z.array(noteBlockSchema).parse(data);
}

export function useUpsertBlock(noteId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      blockId,
      dto,
    }: {
      blockId: string;
      dto: UpsertBlockPayload;
    }) => upsertBlockApi(noteId, blockId, dto),
    onSuccess: (saved) => {
      queryClient.setQueryData<NoteDetail>(noteKeys.detail(noteId), (prev) => {
        if (!prev) return prev;
        const exists = prev.blocks.some((b) => b.id === saved.id);
        const nextBlocks = exists
          ? prev.blocks.map((b) => (b.id === saved.id ? saved : b))
          : [...prev.blocks, saved];
        nextBlocks.sort((a, b) => a.position - b.position);
        return {
          ...prev,
          updatedAt: saved.updatedAt,
          blocks: nextBlocks,
        };
      });
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
}

export function useDeleteBlock(noteId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (blockId: string) => deleteBlockApi(noteId, blockId),
    onSuccess: ({ id, deletedAt }) => {
      queryClient.setQueryData<NoteDetail>(noteKeys.detail(noteId), (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          updatedAt: deletedAt,
          blocks: prev.blocks.filter((b) => b.id !== id),
        };
      });
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
}

export function useReorderBlocks(noteId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (blockIds: string[]) => reorderBlocksApi(noteId, blockIds),
    onSuccess: (orderedBlocks) => {
      queryClient.setQueryData<NoteDetail>(noteKeys.detail(noteId), (prev) =>
        prev ? { ...prev, blocks: orderedBlocks } : prev,
      );
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
}
