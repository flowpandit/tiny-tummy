import { Card, CardContent } from "../ui/card";
import type { HealthStatus } from "../../lib/types";
import { timeSince } from "../../lib/utils";

interface StatusCardProps {
  status: HealthStatus;
  normalDescription: string;
  childName: string;
  lastPoopAt: string | null;
}

const STATUS_CONFIG: Record<HealthStatus, { bg: string; icon: string; color: string }> = {
  healthy: { bg: "var(--color-healthy-bg)", icon: "check", color: "var(--color-healthy)" },
  caution: { bg: "var(--color-caution-bg)", icon: "eye", color: "var(--color-caution)" },
  alert: { bg: "var(--color-alert-bg)", icon: "alert", color: "var(--color-alert)" },
  unknown: { bg: "var(--color-info-bg)", icon: "info", color: "var(--color-info)" },
};

export function StatusCard({ status, normalDescription, childName, lastPoopAt }: StatusCardProps) {
  const config = STATUS_CONFIG[status];

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
    <Card className="mx-4" style={{ borderLeftWidth: 3, borderLeftColor: config.color }}>
      <CardContent className="py-3">
        <p className="text-sm text-[var(--color-text)] leading-relaxed">{getMessage()}</p>
        <p className="text-xs text-[var(--color-muted)] mt-1">{normalDescription}</p>
      </CardContent>
    </Card>
  );
}
