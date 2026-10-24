import { create } from "zustand";

export interface MediaUploadState {
  progress: number; // 0 to 1
  status: "pending" | "uploading" | "completed" | "failed";
  error?: string;
}

interface MediaUploadStore {
  uploads: Record<string, MediaUploadState>;
  setProgress: (mediaId: string, progress: number) => void;
  setStatus: (
    mediaId: string,
    status: MediaUploadState["status"],
    error?: string,
  ) => void;
  clearUpload: (mediaId: string) => void;
}

export const useMediaUploadStore = create<MediaUploadStore>((set) => ({
  uploads: {},

  setProgress: (mediaId, progress) =>
    set((state) => ({
      uploads: {
        ...state.uploads,
        [mediaId]: {
          ...state.uploads[mediaId],
          progress: Math.min(1, Math.max(0, progress)),
          status: "uploading",
        },
      },
    })),

  setStatus: (mediaId, status, error) =>
    set((state) => ({
      uploads: {
        ...state.uploads,
        [mediaId]: {
          progress: status === "completed" ? 1 : (state.uploads[mediaId]?.progress ?? 0),
          status,
          error,
        },
      },
    })),

  clearUpload: (mediaId) =>
    set((state) => {
      const next = { ...state.uploads };
      delete next[mediaId];
      return { uploads: next };
    }),
}));

/**
 * Selective hook to observe upload progress for a single media item without
 * triggering re-renders when other media items upload.
 */
export function useMediaUploadProgress(mediaId?: string) {
  return useMediaUploadStore((state) => (mediaId ? state.uploads[mediaId] : undefined));
}
