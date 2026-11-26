import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Folder } from "@repo/types";
import { apiClient } from "./api-client";
import {
  createFolderInputSchema,
  folderSchema,
  updateFolderInputSchema,
} from "./schemas";
import { noteKeys } from "./notes.api";

export type CreateFolderPayload = z.infer<typeof createFolderInputSchema>;
export type UpdateFolderPayload = z.infer<typeof updateFolderInputSchema>;

export const folderKeys = {
  all: ["folders"] as const,
  lists: () => [...folderKeys.all, "list"] as const,
  details: () => [...folderKeys.all, "detail"] as const,
  detail: (id: string) => [...folderKeys.details(), id] as const,
};

export async function fetchFoldersApi(): Promise<Folder[]> {
  const { data } = await apiClient.get("/api/v1/folders");
  return z.array(folderSchema).parse(data);
}

export async function fetchFolderApi(id: string): Promise<Folder> {
  const { data } = await apiClient.get(`/api/v1/folders/${id}`);
  return folderSchema.parse(data);
}

export async function createFolderApi(
  dto: CreateFolderPayload,
): Promise<Folder> {
  const payload = createFolderInputSchema.parse(dto);
  const { data } = await apiClient.post("/api/v1/folders", payload);
  return folderSchema.parse(data);
}

export async function updateFolderApi(
  id: string,
  dto: UpdateFolderPayload,
): Promise<Folder> {
  const payload = updateFolderInputSchema.parse(dto);
  const { data } = await apiClient.patch(`/api/v1/folders/${id}`, payload);
  return folderSchema.parse(data);
}

export async function deleteFolderApi(id: string): Promise<Folder> {
  const { data } = await apiClient.delete(`/api/v1/folders/${id}`);
  return folderSchema.parse(data);
}

export function useFolders(enabled = true) {
  return useQuery({
    queryKey: folderKeys.lists(),
    queryFn: fetchFoldersApi,
    enabled,
  });
}

export function useFolder(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: folderKeys.detail(id ?? ""),
    queryFn: () => fetchFolderApi(id!),
    enabled: Boolean(id) && enabled,
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFolderApi,
    onSuccess: (created) => {
      queryClient.setQueryData<Folder>(folderKeys.detail(created.id), created);
      queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
    },
  });
}

export function useUpdateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateFolderPayload }) =>
      updateFolderApi(id, dto),
    onSuccess: (updated) => {
      queryClient.setQueryData<Folder>(folderKeys.detail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFolderApi,
    onSuccess: (_deleted, id) => {
      queryClient.removeQueries({ queryKey: folderKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
}
