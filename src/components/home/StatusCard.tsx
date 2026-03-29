import { Card, CardContent } from "../ui/card";
import type { HealthStatus } from "../../lib/types";
import { timeSince } from "../../lib/utils";

interface StatusCardProps {
  status: HealthStatus;
  normalDescription: string;
  childName: string;
  lastPoopAt: string | null;
}

export function StatusCard({ status, normalDescription, childName, lastPoopAt }: StatusCardProps) {
  const getMessage = () => {
    if (!lastPoopAt) return `Start tracking ${childName}'s poops to see patterns.`;
    const ago = timeSince(lastPoopAt);
    switch (status) {
      case "healthy":
        return `Everything looks great! Last poop was ${ago}.`;
      case "caution":
        return `It's been ${ago} since the last poop — still within normal range.`;
      case "alert":
        return `It's been ${ago}. Consider the tips in our Guidance section.`;
      default:
        return normalDescription;
    }
  };

  return (
    <Card className="mx-0 overflow-hidden bg-transparent shadow-none border-0">
      <CardContent className="p-0">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">
          Time Since Last Poop
        </p>
        <p className="mt-2 text-2xl font-semibold text-[var(--color-text)]">
          {status === "healthy" ? `Still in ${childName}'s usual range` : getMessage()}
        </p>
        <p className="mt-3 text-lg leading-relaxed text-[var(--color-text-secondary)]">
          {status === "healthy"
            ? "Meals, stool type, and color are all easy to review at a glance."
            : getMessage()}
        </p>
        <p className="mt-3 text-xs text-[var(--color-text-soft)]">{normalDescription}</p>
      </CardContent>
    </Card>
  );
}
