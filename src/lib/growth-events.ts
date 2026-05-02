export const GROWTH_LOGS_CHANGED_EVENT = "tiny-tummy:growth-logs-changed";

export function notifyGrowthLogsChanged(childId: string) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent(GROWTH_LOGS_CHANGED_EVENT, {
    detail: { childId },
  }));
}
