import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'pinnedSessions';

export function usePinnedSessions() {
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...pinnedIds]));
  }, [pinnedIds]);

  const togglePin = useCallback((sessionId: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  }, []);

  const isPinned = useCallback(
    (sessionId: string) => pinnedIds.has(sessionId),
    [pinnedIds]
  );

  return { pinnedIds, togglePin, isPinned };
}
