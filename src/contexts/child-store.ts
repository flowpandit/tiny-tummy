import type { Child } from "../lib/types";
import { withTimeout } from "../lib/async";
import { createExternalStore, type ExternalStore } from "../lib/store";
import type { DbClient } from "./DatabaseContext";

interface ChildStoreState {
  children: Child[];
  activeChildId: string | null;
  isLoading: boolean;
  loadError: string | null;
}

export interface ChildStore extends ExternalStore<ChildStoreState> {
  initialize: () => void;
  actions: {
    setActiveChildId: (id: string) => void;
    refreshChildren: () => Promise<void>;
  };
}

export function createChildStore(db: DbClient): ChildStore {
  const store = createExternalStore<ChildStoreState>({
    children: [],
    activeChildId: null,
    isLoading: true,
    loadError: null,
  });

  let hasLoadedOnce = false;
  let requestId = 0;
  let initialized = false;

  const refreshChildren = async () => {
    const currentRequestId = ++requestId;
    store.setState((state) => ({
      ...state,
      isLoading: true,
      loadError: hasLoadedOnce ? state.loadError : null,
    }));

    try {
      const nextChildren = await withTimeout(db.getChildren(), 8000, "Loading children");

      if (currentRequestId !== requestId) return;

      store.setState((state) => {
        const nextActiveChildId = nextChildren.length === 0
          ? null
          : nextChildren.some((child) => child.id === state.activeChildId)
              ? state.activeChildId
              : nextChildren[0].id;

        return {
          ...state,
          children: nextChildren,
          activeChildId: nextActiveChildId,
          isLoading: false,
          loadError: null,
        };
      });

      hasLoadedOnce = true;
    } catch (error) {
      if (currentRequestId !== requestId) return;

      console.error("Failed to load children", error);
      store.setState((state) => ({
        ...state,
        isLoading: false,
        loadError: hasLoadedOnce ? state.loadError : "Unable to load your children right now.",
      }));
    }
  };

  return {
    ...store,
    initialize() {
      if (initialized) return;
      initialized = true;
      void refreshChildren();
    },
    actions: {
      setActiveChildId: (id) => {
        store.setState((state) => (
          state.activeChildId === id
            ? state
            : { ...state, activeChildId: id }
        ));
      },
      refreshChildren,
    },
  };
}
