import { createContext, useContext, type ReactNode } from "react";
import { useChildrenState } from "../hooks/useChildrenState";
import type { Child } from "../lib/types";

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
  const {
    children,
    activeChild,
    setActiveChildId,
    refreshChildren,
    isLoading,
    loadError,
  } = useChildrenState();

  return (
    <ChildContext.Provider
      value={{
        children,
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
