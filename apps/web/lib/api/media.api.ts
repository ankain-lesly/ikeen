import { useMutation } from "@tanstack/react-query";
import { apiClient } from "./api-client";
import {
  mediaUploadResponseSchema,
  type MediaUploadResponse,
} from "./schemas";

export function useUploadMedia() {
  return useMutation({
    mutationFn: async ({
      file,
      folder,
    }: {
      file: File;
      folder?: string;
    }): Promise<MediaUploadResponse["data"]> => {
      const formData = new FormData();
      formData.append("file", file);
      if (folder) {
        formData.append("folder", folder);
      }

      const { data } = await apiClient.post("/api/v1/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const parsed = mediaUploadResponseSchema.parse(data);
      return parsed.data;
    },
  });
}
