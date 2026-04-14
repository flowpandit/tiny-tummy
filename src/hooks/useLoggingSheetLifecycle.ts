import { useCallback, useEffect, useRef } from "react";

interface UseLoggingSheetLifecycleOptions {
  onClose: () => void;
  onReset: () => void;
  onLogged: () => void | Promise<void>;
  resetDelayMs?: number;
  successDelayMs?: number;
}

export function useLoggingSheetLifecycle({
  onClose,
  onReset,
  onLogged,
  resetDelayMs = 300,
  successDelayMs = 1200,
}: UseLoggingSheetLifecycleOptions) {
  const timeoutIdsRef = useRef<number[]>([]);

  const clearScheduledTimeouts = useCallback(() => {
    for (const timeoutId of timeoutIdsRef.current) {
      window.clearTimeout(timeoutId);
    }
    timeoutIdsRef.current = [];
  }, []);

  useEffect(() => clearScheduledTimeouts, [clearScheduledTimeouts]);

  const scheduleReset = useCallback(() => {
    const timeoutId = window.setTimeout(() => {
      onReset();
      timeoutIdsRef.current = timeoutIdsRef.current.filter((id) => id !== timeoutId);
    }, resetDelayMs);

    timeoutIdsRef.current.push(timeoutId);
  }, [onReset, resetDelayMs]);

  const handleClose = useCallback(() => {
    onClose();
    scheduleReset();
  }, [onClose, scheduleReset]);

  const handleLoggedSuccess = useCallback(() => {
    const timeoutId = window.setTimeout(() => {
      void onLogged();
      onClose();
      scheduleReset();
      timeoutIdsRef.current = timeoutIdsRef.current.filter((id) => id !== timeoutId);
    }, successDelayMs);

    timeoutIdsRef.current.push(timeoutId);
  }, [onClose, onLogged, scheduleReset, successDelayMs]);

  return {
    clearScheduledTimeouts,
    handleClose,
    handleLoggedSuccess,
  };
}
