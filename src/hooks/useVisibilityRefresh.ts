import { useEffect, useRef } from "react";

export function useVisibilityRefresh(
  onRefresh: () => void | Promise<void>,
  enabled = true,
) {
  const refreshRef = useRef(onRefresh);

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled) return;

    const handleRefresh = () => {
      void refreshRef.current();
    };

    window.addEventListener("focus", handleRefresh);
    document.addEventListener("visibilitychange", handleRefresh);

    return () => {
      window.removeEventListener("focus", handleRefresh);
      document.removeEventListener("visibilitychange", handleRefresh);
    };
  }, [enabled]);
}
