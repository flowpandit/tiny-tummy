export function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function getAgeLabelFromDob(dob: string): string {
  const birth = parseLocalDate(dob);
  const now = new Date();
  const diffMs = now.getTime() - birth.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "";
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} old`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks !== 1 ? "s" : ""} old`;
  }
  const months = Math.floor(diffDays / 30.44);
  if (months < 24) return `${months} month${months !== 1 ? "s" : ""} old`;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (remainingMonths === 0) return `${years} year${years !== 1 ? "s" : ""} old`;
  return `${years}y ${remainingMonths}m old`;
}

export function timeSince(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function timeSinceDetailed(dateStr: string): { value: number; unit: string } {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 1) return { value: Math.floor(diffMs / (1000 * 60)), unit: "min" };
  if (diffHours < 24) return { value: Math.floor(diffHours), unit: "hr" };
  return { value: Math.round(diffHours / 24 * 10) / 10, unit: "days" };
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function nowISO(): string {
  return new Date().toISOString().replace("Z", "").split(".")[0];
}

export function generateId(): string {
  return crypto.randomUUID();
}
