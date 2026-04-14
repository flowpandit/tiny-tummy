import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useDbClient } from "./DatabaseContext";
import { createChildStore, type ChildStore } from "./child-store";
import { useStoreSelector } from "../lib/store";
import type { Child } from "../lib/types";

interface ChildContextType {
  children: Child[];
  activeChild: Child | null;
  setActiveChildId: (id: string) => void;
  refreshChildren: () => Promise<void>;
  isLoading: boolean;
  loadError: string | null;
}

const ChildContext = createContext<ChildStore | null>(null);

export function ChildProvider({ children: childrenProp }: { children: ReactNode }) {
  const db = useDbClient();
  const storeRef = useRef<ChildStore | null>(null);

  if (!storeRef.current) {
    storeRef.current = createChildStore(db);
  }

  useEffect(() => {
    storeRef.current?.initialize();
  }, []);

  return <ChildContext.Provider value={storeRef.current}>{childrenProp}</ChildContext.Provider>;
}

function useChildStore() {
  const store = useContext(ChildContext);
  if (!store) throw new Error("Child hooks must be used within ChildProvider");
  return store;
}

export function useChildren() {
  const store = useChildStore();
  return useStoreSelector(store, (state) => state.children);
}

export function useActiveChild() {
  const store = useChildStore();
  return useStoreSelector(store, (state) => (
    state.children.find((child) => child.id === state.activeChildId) ?? null
  ));
}

export function useChildLoadState() {
  const store = useChildStore();
  const isLoading = useStoreSelector(store, (state) => state.isLoading);
  const loadError = useStoreSelector(store, (state) => state.loadError);
  return useMemo(() => ({ isLoading, loadError }), [isLoading, loadError]);
}

export function useChildActions() {
  const store = useChildStore();
  return store.actions;
}

export function useChildContext() {
  const children = useChildren();
  const activeChild = useActiveChild();
  const { isLoading, loadError } = useChildLoadState();
  const { setActiveChildId, refreshChildren } = useChildActions();

  return useMemo<ChildContextType>(() => ({
    children,
    activeChild,
    setActiveChildId,
    refreshChildren,
    isLoading,
    loadError,
  }), [activeChild, children, isLoading, loadError, refreshChildren, setActiveChildId]);
}
