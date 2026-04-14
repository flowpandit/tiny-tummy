export function getRelativeDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  if (target.getTime() === today.getTime()) return "Today";
  if (target.getTime() === yesterday.getTime()) return "Yesterday";

  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);
  if (diffDays > 1) return `${diffDays} days ago`;

  return target.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
