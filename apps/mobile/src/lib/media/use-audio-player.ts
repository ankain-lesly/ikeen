import { useEffect, useRef } from "react";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

export function formatDuration(seconds?: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Global coordinator to enforce single-player exclusivity
type PlaybackListener = (activeUri?: string) => void;
const playbackListeners = new Set<PlaybackListener>();

function notifyPlaybackStarted(activeUri: string) {
  for (const listener of playbackListeners) {
    listener(activeUri);
  }
}

export function useAudioPlayerState(uri?: string) {
  const player = useAudioPlayer(uri ? { uri } : null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    isPlayingRef.current = !!status.playing;
  }, [status.playing]);

  // Pause when another audio begins playing
  useEffect(() => {
    if (!uri) return;
    const listener: PlaybackListener = (activeUri) => {
      if (activeUri !== uri && isPlayingRef.current && player) {
        try {
          player.pause();
        } catch {
          // Player already disposed or paused
        }
      }
    };
    playbackListeners.add(listener);
    return () => {
      playbackListeners.delete(listener);
    };
  }, [uri, player]);

  // Clean disposal on unmount or uri change
  useEffect(() => {
    return () => {
      try {
        if (isPlayingRef.current && player) {
          player.pause();
        }
      } catch {
        // Player already disposed
      }
    };
  }, [player]);

  const togglePlay = () => {
    if (!player) return;
    try {
      if (status.playing) {
        player.pause();
      } else {
        if (uri) {
          notifyPlaybackStarted(uri);
        }
        // If track completed, restart from beginning
        if (status.duration > 0 && status.currentTime >= status.duration) {
          player.seekTo(0);
        }
        player.play();
      }
    } catch (err) {
      console.warn("[AudioPlayer] togglePlay failed:", err);
    }
  };

  const seekTo = (seconds: number) => {
    if (!player) return;
    try {
      player.seekTo(seconds);
    } catch (err) {
      console.warn("[AudioPlayer] seekTo failed:", err);
    }
  };

  return {
    player,
    status,
    isPlaying: !!status.playing,
    isLoaded: !!status.isLoaded,
    isBuffering: !!status.isBuffering,
    currentTime: status.currentTime || 0,
    duration: status.duration || 0,
    togglePlay,
    seekTo,
  };
}
