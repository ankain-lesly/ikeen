import { create } from 'zustand';

export interface MediaUploadState {
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

interface MediaUploadStore {
  uploads: Record<string, MediaUploadState>;
  setProgress: (mediaId: string, progress: number) => void;
  setStatus: (
    mediaId: string,
    status: MediaUploadState['status'],
    error?: string
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
          ...(state.uploads[mediaId] ?? { status: 'uploading' }),
          status: 'uploading',
          progress: Math.min(1, Math.max(0, progress)),
        },
      },
    })),
  setStatus: (mediaId, status, error) =>
    set((state) => ({
      uploads: {
        ...state.uploads,
        [mediaId]: {
          ...(state.uploads[mediaId] ?? { progress: 0 }),
          status,
          progress: status === 'completed' ? 1 : (state.uploads[mediaId]?.progress ?? 0),
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

export function useMediaUploadProgress(mediaId?: string) {
  return useMediaUploadStore((state) => (mediaId ? state.uploads[mediaId] : undefined));
}
