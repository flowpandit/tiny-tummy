import { TrackerMetricRing } from "../tracking/TrackerPrimitives";
import type { TrendSummaryTileModel } from "../../lib/trends";
import { cn } from "../../lib/cn";

export function TrendSummaryTile({
  tile,
  isActive,
  onClick,
}: {
  tile: TrendSummaryTileModel;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-[20px] border px-2 py-2 transition-colors duration-200",
        isActive
          ? "border-[var(--color-primary)] bg-[var(--color-bg-elevated)]"
          : "border-transparent bg-transparent",
      )}
    >
      <TrackerMetricRing
        value={tile.value}
        unit={tile.unit}
        label={tile.label}
        detail={tile.detail}
        gradient={tile.gradient}
        size="sm"
      />
    </button>
  );
}
