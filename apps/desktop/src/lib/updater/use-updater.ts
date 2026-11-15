/**
 * Automated In-App Updater Hook for Tauri v2
 */

import { useState, useCallback } from 'react';
import { isTauriEnvironment } from '@/db/client';

export type UpdaterStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'up-to-date'
  | 'downloading'
  | 'ready'
  | 'error';

export interface UpdateMetadata {
  version: string;
  currentVersion: string;
  body?: string;
  date?: string;
}

async function loadUpdaterModule(): Promise<{ check: () => Promise<any> } | null> {
  if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
    return null;
  }
  try {
    const dynamicImport = new Function('specifier', 'return import(specifier)');
    return await dynamicImport('@tauri-apps/plugin-updater');
  } catch {
    return null;
  }
}

async function loadProcessModule(): Promise<{ relaunch: () => Promise<void> } | null> {
  if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
    return null;
  }
  try {
    const dynamicImport = new Function('specifier', 'return import(specifier)');
    return await dynamicImport('@tauri-apps/plugin-process');
  } catch {
    return null;
  }
}

export function useUpdater() {
  const [status, setStatus] = useState<UpdaterStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateMetadata | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [updateHandle, setUpdateHandle] = useState<any>(null);

  const checkForUpdates = useCallback(async () => {
    setStatus('checking');
    setError(null);

    if (!isTauriEnvironment()) {
      // Browser mock behavior for previewing UI
      await new Promise((r) => setTimeout(r, 800));
      setStatus('up-to-date');
      setUpdateInfo({
        version: '0.1.0',
        currentVersion: '0.1.0',
        body: 'You are running the latest desktop development build.',
      });
      return;
    }

    try {
      const updaterMod = await loadUpdaterModule();
      if (!updaterMod) {
        setStatus('up-to-date');
        setUpdateInfo({
          version: '0.1.0',
          currentVersion: '0.1.0',
          body: 'Running embedded desktop build.',
        });
        return;
      }

      const update = await updaterMod.check();

      if (update?.available) {
        setUpdateHandle(update);
        setUpdateInfo({
          version: update.version,
          currentVersion: update.currentVersion,
          body: update.body || 'New features and stability enhancements.',
          date: update.date,
        });
        setStatus('available');
      } else {
        setUpdateInfo({
          version: update?.currentVersion || '0.1.0',
          currentVersion: update?.currentVersion || '0.1.0',
        });
        setStatus('up-to-date');
      }
    } catch (err: unknown) {
      console.warn('[Updater check error]', err);
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }, []);

  const downloadAndInstall = useCallback(async () => {
    if (!updateHandle) {
      setError('No update handle available.');
      return;
    }

    setStatus('downloading');
    setDownloadProgress(0);

    try {
      let downloadedBytes = 0;
      let totalBytes = 0;

      await updateHandle.downloadAndInstall((event: any) => {
        if (event.event === 'Started') {
          totalBytes = event.data.contentLength || 0;
        } else if (event.event === 'Progress') {
          downloadedBytes += event.data.chunkLength;
          if (totalBytes > 0) {
            setDownloadProgress(Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)));
          }
        } else if (event.event === 'Finished') {
          setDownloadProgress(100);
          setStatus('ready');
        }
      });

      setStatus('ready');
    } catch (err: unknown) {
      console.warn('[Updater download error]', err);
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }, [updateHandle]);

  const relaunchApp = useCallback(async () => {
    try {
      const processMod = await loadProcessModule();
      if (processMod) {
        await processMod.relaunch();
      }
    } catch (err: unknown) {
      console.warn('[Updater relaunch error]', err);
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  return {
    status,
    error,
    updateInfo,
    downloadProgress,
    checkForUpdates,
    downloadAndInstall,
    relaunchApp,
  };
}
