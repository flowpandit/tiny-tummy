import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as db from "../lib/db";
import { withTimeout } from "../lib/async";
import type { Child } from "../lib/types";

export function useChildrenState() {
  const [children, setChildren] = useState<Child[]>([]);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const requestIdRef = useRef(0);

  const refreshChildren = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    if (!hasLoadedOnce) {
      setLoadError(null);
    }

    try {
      const nextChildren = await withTimeout(db.getChildren(), 8000, "Loading children");
      if (requestId !== requestIdRef.current) return;

      setChildren(nextChildren);
      if (nextChildren.length === 0) {
        setActiveChildId(null);
      } else if (!nextChildren.find((child) => child.id === activeChildId)) {
        setActiveChildId(nextChildren[0].id);
      }
      setHasLoadedOnce(true);
      setLoadError(null);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      console.error("Failed to load children", error);
      if (!hasLoadedOnce) {
        setLoadError("Unable to load your children right now.");
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [activeChildId, hasLoadedOnce]);

  useEffect(() => {
    void refreshChildren();
  }, [refreshChildren]);

  const activeChild = useMemo(
    () => children.find((child) => child.id === activeChildId) ?? null,
    [activeChildId, children],
  );

  return {
    children,
    activeChild,
    setActiveChildId,
    refreshChildren,
    isLoading,
    loadError,
  };
}
