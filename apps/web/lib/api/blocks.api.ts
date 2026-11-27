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
    onMutate: async ({ blockId, dto }) => {
      await queryClient.cancelQueries({ queryKey: noteKeys.detail(noteId) });
      const prevDetail = queryClient.getQueryData<NoteDetail>(
        noteKeys.detail(noteId),
      );

      if (prevDetail) {
        const now = new Date().toISOString();
        const existing = prevDetail.blocks.find((b) => b.id === blockId);
        const optimisticBlock = {
          ...(existing ?? {
            id: blockId,
            noteId,
            position: dto.position ?? prevDetail.blocks.length,
            createdAt: now,
          }),
          type: dto.type,
          position: dto.position ?? existing?.position ?? prevDetail.blocks.length,
          ...(dto.listType ? { listType: dto.listType } : {}),
          ...(dto.header !== undefined
            ? { header: dto.header ?? undefined }
            : {}),
          ...(dto.footer !== undefined
            ? { footer: dto.footer ?? undefined }
            : {}),
          ...(dto.content !== undefined ? { content: dto.content } : {}),
          updatedAt: now,
        } as NoteBlock;

        const nextBlocks = existing
          ? prevDetail.blocks.map((b) =>
              b.id === blockId ? optimisticBlock : b,
            )
          : [...prevDetail.blocks, optimisticBlock];
        nextBlocks.sort((a, b) => a.position - b.position);

        queryClient.setQueryData<NoteDetail>(noteKeys.detail(noteId), {
          ...prevDetail,
          blocks: nextBlocks,
        });
      }

      return { prevDetail };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevDetail) {
        queryClient.setQueryData(noteKeys.detail(noteId), ctx.prevDetail);
      }
    },
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
