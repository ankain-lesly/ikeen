import { useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface UseRecentSearchesOptions {
  // STORAGE_KEY?: string;
  // MAX_HISTORY?: number;
  caseSensitive?: boolean;
}

export interface UseRecentSearchesReturn {
  history: string[];
  isLoading: boolean;
  saveSearch: (term: string) => Promise<void>;
  deleteSearch: (term: string) => Promise<void>;
  clearAllHistory: () => Promise<void>;
}

const STORAGE_KEY="@recent_searches"
const MAX_HISTORY = 10;

export function useRecentSearches({
  caseSensitive = false,
}: UseRecentSearchesOptions = {}): UseRecentSearchesReturn {
  const [history, setHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Keep a ref of history to inspect latest state without closure staleness
  const historyRef = useRef<string[]>([]);
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  // Load history from AsyncStorage on mount or key change
  useEffect(() => {
    let isMounted = true;
    
    const loadRecentSearches = async () => {
      try {
        setIsLoading(true);
        const storedHistory = await AsyncStorage.getItem(STORAGE_KEY);
        if (!isMounted) return;

        if (storedHistory !== null) {
          const parsed: unknown = JSON.parse(storedHistory);
          if (
            Array.isArray(parsed) &&
            parsed.every((item) => typeof item === "string")
          ) {
            setHistory(parsed);
            return;
          }
        }
        setHistory([]);
      } catch (error: unknown) {
        console.error(
          `[useRecentSearches] Failed to load "${STORAGE_KEY}":`,
          error,
        );
        if (isMounted) setHistory([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadRecentSearches();

    return () => {
      isMounted = false;
    };
  }, []);

  // Add search term (deduplicate, hoist to front, prune)
  const saveSearch = useCallback(
    async (searchTerm: string): Promise<void> => {
      const trimmed = searchTerm.trim();
      if (!trimmed) return;

      const current = historyRef.current;
      const matches = (item: string) =>
        caseSensitive
          ? item === trimmed
          : item.localeCompare(trimmed, undefined, {
              sensitivity: "accent",
            }) === 0;

      // No-op if already the most recent search
      if (current.length > 0 && matches(current[0])) return;

      const next = [trimmed, ...current.filter((item) => !matches(item))].slice(
        0,
        MAX_HISTORY,
      );

      setHistory(next);
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (error: unknown) {
        console.error(
          `[useRecentSearches] Failed to save search to "${STORAGE_KEY}":`,
          error,
        );
      }
    },
    [caseSensitive],
  );

  // Delete single term
  const deleteSearch = useCallback(
    async (termToDelete: string): Promise<void> => {
      const current = historyRef.current;
      const next = current.filter((item) => item !== termToDelete);

      if (next.length === current.length) return;

      setHistory(next);
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (error: unknown) {
        console.error(
          `[useRecentSearches] Failed to delete from "${STORAGE_KEY}":`,
          error,
        );
      }
    },
    [],
  );

  // Clear all
  const clearAllHistory = useCallback(async (): Promise<void> => {
    setHistory([]);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error: unknown) {
      console.error(
        `[useRecentSearches] Failed to clear "${STORAGE_KEY}":`,
        error,
      );
    }
  }, []);

  return {
    history,
    isLoading,
    saveSearch,
    deleteSearch,
    clearAllHistory,
  };
}
