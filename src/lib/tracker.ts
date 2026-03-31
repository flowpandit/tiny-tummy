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
