import { useSyncExternalStore } from "react";

export interface ExternalStore<T> {
  getState: () => T;
  setState: (updater: T | ((state: T) => T)) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createExternalStore<T>(initialState: T): ExternalStore<T> {
  let state = initialState;
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    setState: (updater) => {
      const nextState = typeof updater === "function"
        ? (updater as (state: T) => T)(state)
        : updater;

      if (Object.is(nextState, state)) {
        return;
      }

      state = nextState;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function useStoreSelector<T, S>(
  store: ExternalStore<T>,
  selector: (state: T) => S,
): S {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
}
