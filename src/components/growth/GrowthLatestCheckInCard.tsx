import { cn } from "../../lib/cn";
import type { ReactNode } from "react";
import { countGrowthMeasures, formatCompactGrowthSummary } from "../../lib/growth-view";
import type { GrowthEntry, UnitSystem } from "../../lib/types";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";

function GrowthChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-[var(--color-home-card-border)] bg-[var(--color-tracker-chip-surface)] px-2.5 py-1 text-[0.68rem] font-medium text-[var(--color-tracker-chip-text)]">
      {children}
    </span>
  );
}

function formatCheckInDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatCheckInTime(value: string): string {
  return new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function GrowthLatestCheckInCard({
  childName,
  className,
  growthReference,
  latest,
  sexMissing,
  unitSystem,
  onAdd,
  onEdit,
}: {
  childName: string;
  className?: string;
  growthReference: string;
  latest: GrowthEntry | null;
  sexMissing: boolean;
  unitSystem: UnitSystem;
  onAdd: () => void;
  onEdit: (log: GrowthEntry) => void;
}) {
  const latestMeta = latest ? `${formatCheckInDate(latest.measured_at)} at ${formatCheckInTime(latest.measured_at)}` : "No saved check-in yet";
  const measureCount = countGrowthMeasures(latest);

  return (
    <Card
      className={cn("h-full overflow-hidden rounded-[18px] border shadow-[var(--shadow-home-card)] backdrop-blur-sm md:rounded-[20px]", className)}
      style={{
        background: "var(--color-home-card-surface)",
        borderColor: "var(--color-home-card-border)",
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.76rem] font-medium text-[var(--color-text-secondary)]">Latest check-in</p>
          </div>
          <p className="shrink-0 text-[0.68rem] text-[var(--color-text-soft)]">{latestMeta}</p>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="min-w-0 text-[1.24rem] font-semibold leading-tight tracking-[-0.03em] text-[var(--color-text)] md:text-[1.28rem]">
            {latest ? formatCompactGrowthSummary(latest, unitSystem) : "Add a first growth check-in"}
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="h-8 shrink-0 px-3 text-xs"
            onClick={() => {
              if (latest) {
                onEdit(latest);
                return;
              }

              onAdd();
            }}
          >
            {latest ? "Edit" : "Add"}
          </Button>
        </div>

        <p className="mt-2 max-w-[42ch] text-[0.78rem] leading-snug text-[var(--color-text-secondary)] md:text-[0.8rem]">
          {sexMissing
            ? "Set child sex in Settings to compare measurements with the right growth chart."
            : latest
              ? `${childName}'s measurements are following a healthy percentile path.`
              : "Save weight, length, head size, or whichever measures you have today."}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <GrowthChip>{growthReference} reference</GrowthChip>
          <GrowthChip>{measureCount} measures</GrowthChip>
          <GrowthChip>{sexMissing ? "Needs profile" : latest ? "On track" : "Ready"}</GrowthChip>
        </div>
      </CardContent>
    </Card>
  );
}
