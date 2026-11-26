import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Note } from "@repo/types";
import { apiClient } from "./api-client";
import {
  createNoteInputSchema,
  noteDetailSchema,
  noteSchema,
  updateNoteInputSchema,
  type NoteDetail,
} from "./schemas";

export interface NotesFilter {
  folderId?: string;
  pinnedOnly?: boolean;
  archivedOnly?: boolean;
  includeArchived?: boolean;
}

export type CreateNotePayload = z.infer<typeof createNoteInputSchema>;
export type UpdateNotePayload = z.infer<typeof updateNoteInputSchema>;

export const noteKeys = {
  all: ["notes"] as const,
  lists: () => [...noteKeys.all, "list"] as const,
  list: (filters: NotesFilter = {}) => [...noteKeys.lists(), filters] as const,
  trash: () => [...noteKeys.all, "trash"] as const,
  details: () => [...noteKeys.all, "detail"] as const,
  detail: (id: string) => [...noteKeys.details(), id] as const,
};

export async function fetchNotesApi(
  filters: NotesFilter = {},
): Promise<Note[]> {
  const params: Record<string, string> = {};
  if (filters.folderId !== undefined) params.folderId = filters.folderId;
  if (filters.pinnedOnly) params.pinnedOnly = "true";
  if (filters.archivedOnly) params.archivedOnly = "true";
  if (filters.includeArchived) params.includeArchived = "true";

  const { data } = await apiClient.get("/api/v1/notes", { params });
  return z.array(noteSchema).parse(data);
}

export async function fetchNoteApi(id: string): Promise<NoteDetail> {
  const { data } = await apiClient.get(`/api/v1/notes/${id}`);
  return noteDetailSchema.parse(data);
}

export async function createNoteApi(dto: CreateNotePayload): Promise<Note> {
  const payload = createNoteInputSchema.parse(dto);
  const { data } = await apiClient.post("/api/v1/notes", payload);
  return noteSchema.parse(data);
}

export async function updateNoteApi(
  id: string,
  dto: UpdateNotePayload,
): Promise<Note> {
  const payload = updateNoteInputSchema.parse(dto);
  const { data } = await apiClient.patch(`/api/v1/notes/${id}`, payload);
  return noteSchema.parse(data);
}

export async function deleteNoteApi(id: string): Promise<Note> {
  const { data } = await apiClient.delete(`/api/v1/notes/${id}`);
  return noteSchema.parse(data);
}

export function useNotes(filters: NotesFilter = {}, enabled = true) {
  return useQuery({
    queryKey: noteKeys.list(filters),
    queryFn: () => fetchNotesApi(filters),
    enabled,
  });
}

export function useNote(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: noteKeys.detail(id ?? ""),
    queryFn: () => fetchNoteApi(id!),
    enabled: Boolean(id) && enabled,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createNoteApi,
    onSuccess: (created) => {
      queryClient.setQueryData<NoteDetail>(noteKeys.detail(created.id), {
        ...created,
        blocks: [],
      });
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateNotePayload }) =>
      updateNoteApi(id, dto),
    onMutate: async ({ id, dto }) => {
      await queryClient.cancelQueries({ queryKey: noteKeys.detail(id) });
      await queryClient.cancelQueries({ queryKey: noteKeys.lists() });

      const prevDetail = queryClient.getQueryData<NoteDetail>(
        noteKeys.detail(id),
      );
      const prevLists = queryClient.getQueriesData<Note[]>({
        queryKey: noteKeys.lists(),
      });

      if (prevDetail) {
        queryClient.setQueryData<NoteDetail>(noteKeys.detail(id), {
          ...prevDetail,
          ...dto,
        });
      }

      for (const [key, list] of prevLists) {
        if (!list) continue;
        queryClient.setQueryData<Note[]>(
          key,
          list.map((n) => (n.id === id ? { ...n, ...dto } : n)),
        );
      }

      return { prevDetail, prevLists };
    },
    onError: (_err, { id }, ctx) => {
      if (ctx?.prevDetail) {
        queryClient.setQueryData(noteKeys.detail(id), ctx.prevDetail);
      }
      if (ctx?.prevLists) {
        for (const [key, list] of ctx.prevLists) {
          queryClient.setQueryData(key, list);
        }
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<NoteDetail>(
        noteKeys.detail(updated.id),
        (prev) => (prev ? { ...prev, ...updated } : undefined),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteNoteApi,
    onSuccess: (_deleted, id) => {
      queryClient.removeQueries({ queryKey: noteKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: noteKeys.trash() });
    },
  });
}

export async function fetchTrashedNotesApi(): Promise<Note[]> {
  const { data } = await apiClient.get("/api/v1/notes/trash");
  return z.array(noteSchema).parse(data);
}

export async function restoreNoteApi(id: string): Promise<Note> {
  const { data } = await apiClient.post(`/api/v1/notes/${id}/restore`);
  return noteSchema.parse(data);
}

export async function permanentDeleteNoteApi(
  id: string,
): Promise<{ id: string; deleted: boolean }> {
  const { data } = await apiClient.delete(`/api/v1/notes/${id}/permanent`);
  return z.object({ id: z.string(), deleted: z.boolean() }).parse(data);
}

export function useTrashedNotes(enabled = true) {
  return useQuery({
    queryKey: noteKeys.trash(),
    queryFn: fetchTrashedNotesApi,
    enabled,
  });
}

export function useRestoreNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: restoreNoteApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.trash() });
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
}

export function usePermanentDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: permanentDeleteNoteApi,
    onSuccess: (_res, id) => {
      queryClient.removeQueries({ queryKey: noteKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: noteKeys.trash() });
    },
  });
}
