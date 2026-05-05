import { useState, useEffect, useSyncExternalStore } from "react";
import { loadAvatar } from "../lib/photos";

// Global revision counter — increments when any avatar changes
let revision = 0;
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return revision;
}

/** Call this after saving or deleting an avatar to trigger all Avatar components to reload */
export function invalidateAvatars() {
  revision++;
  listeners.forEach((cb) => cb());
}

/**
 * Loads a child's avatar photo URL. Returns null if no photo exists.
 * Automatically reloads when invalidateAvatars() is called.
 */
export function useAvatar(childId: string | null): string | null {
  const rev = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!childId) {
      setUrl(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setUrl(null);

    loadAvatar(childId).then((result) => {
      if (cancelled) {
        if (result) URL.revokeObjectURL(result);
        return;
      }
      objectUrl = result;
      setUrl(result);
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [childId, rev]);

  return url;
}
