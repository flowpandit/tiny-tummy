export const DAYS_IN_WEEK = 7;

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function formatWeekLabel(startDate: Date, endDate: Date): string {
  const sameMonth = startDate.getMonth() === endDate.getMonth();
  const startLabel = startDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const endLabel = endDate.toLocaleDateString(undefined, sameMonth ? { day: "numeric" } : { month: "short", day: "numeric" });
  return `${startLabel} - ${endLabel}`;
}

export function formatHoursLong(hours: number): string {
  const roundedHours = Math.round(hours);
  if (roundedHours < 24) return `${roundedHours} hour${roundedHours === 1 ? "" : "s"}`;
  const days = Math.round((hours / 24) * 10) / 10;
  return `${days} day${days === 1 ? "" : "s"}`;
}

export function formatHoursCompact(hours: number): string {
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.round((hours / 24) * 10) / 10;
  return `${days}d`;
}

export function getEarliestLoggedDate<T>(
  logs: T[],
  getTimestamp: (log: T) => string,
): Date | null {
  if (logs.length === 0) return null;
  return startOfDay(new Date(getTimestamp(logs[logs.length - 1])));
}

export function getMaxWeekOffset(earliestLoggedDate: Date | null, referenceDate: Date = new Date()): number {
  if (!earliestLoggedDate) return 0;
  const today = startOfDay(referenceDate);
  const diffDays = Math.floor((today.getTime() - earliestLoggedDate.getTime()) / 86400000);
  return Math.max(0, Math.floor(diffDays / DAYS_IN_WEEK));
}

export function getWeekRange(weekOffset: number, referenceDate: Date = new Date()) {
  const endDate = addDays(startOfDay(referenceDate), -weekOffset * DAYS_IN_WEEK);
  const startDate = addDays(endDate, -(DAYS_IN_WEEK - 1));
  return { startDate, endDate };
}
