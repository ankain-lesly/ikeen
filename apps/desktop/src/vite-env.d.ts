/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '@tauri-apps/plugin-updater' {
  export interface Update {
    version: string;
    currentVersion: string;
    body?: string;
    date?: string;
    available: boolean;
    downloadAndInstall: (
      onProgress?: (event: {
        event: 'Started' | 'Progress' | 'Finished';
        data?: any;
      }) => void
    ) => Promise<void>;
  }

  export function check(): Promise<Update | null>;
}

declare module '@tauri-apps/plugin-process' {
  export function relaunch(): Promise<void>;
  export function exit(exitCode?: number): Promise<void>;
}
