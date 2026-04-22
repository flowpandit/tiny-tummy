import { cn } from "../../lib/cn";
import type { TrendsTab } from "../../lib/trends";

const TABS: Array<{ id: TrendsTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "feed", label: "Feed" },
  { id: "sleep", label: "Sleep" },
  { id: "diaper", label: "Diaper" },
  { id: "poop", label: "Poop" },
];

export function TrendSegmentedControl({
  value,
  onChange,
}: {
  value: TrendsTab;
  onChange: (value: TrendsTab) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" data-no-page-swipe="true">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-200",
            value === tab.id
              ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]"
              : "border-[var(--color-border)] bg-[var(--color-surface-strong)] text-[var(--color-text-secondary)]",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
