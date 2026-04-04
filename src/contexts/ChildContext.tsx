import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import type { Child } from "../lib/types";
import * as db from "../lib/db";
import { withTimeout } from "../lib/async";

interface ChildContextType {
  children: Child[];
  activeChild: Child | null;
  setActiveChildId: (id: string) => void;
  refreshChildren: () => Promise<void>;
  isLoading: boolean;
  loadError: string | null;
}

const ChildContext = createContext<ChildContextType | null>(null);

export function ChildProvider({ children: childrenProp }: { children: ReactNode }) {
  const [childList, setChildList] = useState<Child[]>([]);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refreshChildren = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setLoadError(null);

    try {
      const safeRows = await withTimeout(db.getChildren(), 8000, "Loading children");
      if (requestId !== requestIdRef.current) return;

      setChildList(safeRows);
      if (safeRows.length === 0) {
        setActiveChildId(null);
      } else if (!safeRows.find((c) => c.id === activeChildId)) {
        setActiveChildId(safeRows[0].id);
      }
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      console.error("Failed to load children", error);
      setLoadError("Unable to load your children right now.");
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [activeChildId]);

  useEffect(() => {
    void refreshChildren();
  }, [refreshChildren]);

  const activeChild = childList.find((c) => c.id === activeChildId) ?? null;

  return (
    <ChildContext.Provider
      value={{
        children: childList,
        activeChild,
        setActiveChildId,
        refreshChildren,
        isLoading,
        loadError,
      }}
    >
      {childrenProp}
    </ChildContext.Provider>
  );
}

export function useChildContext() {
  const ctx = useContext(ChildContext);
  if (!ctx) throw new Error("useChildContext must be used within ChildProvider");
  return ctx;
}
