import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { Child } from "../lib/types";
import * as db from "../lib/db";

interface ChildContextType {
  children: Child[];
  activeChild: Child | null;
  setActiveChildId: (id: string) => void;
  refreshChildren: () => Promise<void>;
  isLoading: boolean;
}

const ChildContext = createContext<ChildContextType | null>(null);

export function ChildProvider({ children: childrenProp }: { children: ReactNode }) {
  const [childList, setChildList] = useState<Child[]>([]);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshChildren = useCallback(async () => {
    const rows = await db.getChildren();
    setChildList(rows);
    if (rows.length > 0 && !rows.find((c) => c.id === activeChildId)) {
      setActiveChildId(rows[0].id);
    }
  }, [activeChildId]);

  useEffect(() => {
    refreshChildren().finally(() => setIsLoading(false));
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
