import type { ColorCount } from "../../lib/types";
import { STOOL_COLORS } from "../../lib/constants";

interface ColorDistributionProps {
  data: ColorCount[];
}

export function ColorDistribution({ data }: ColorDistributionProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) return null;

  return (
    <div>
      <div className="flex h-7 gap-1 overflow-hidden rounded-full bg-[var(--color-surface-strong)] p-1">
        {data.map((item) => {
          const info = STOOL_COLORS.find((c) => c.value === item.color);
          const pct = (item.count / total) * 100;
          return (
            <div
              key={item.color}
              className="h-full transition-all duration-300"
              style={{
                width: `${pct}%`,
                backgroundColor: info?.hex ?? "var(--color-muted)",
                minWidth: pct > 0 ? 8 : 0,
                borderRadius: "999px",
              }}
              title={`${info?.label ?? item.color}: ${item.count} (${Math.round(pct)}%)`}
            />
          );
        })}
      </div>
      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {data.map((item) => {
          const info = STOOL_COLORS.find((c) => c.value === item.color);
          return (
            <div key={item.color} className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full border border-[var(--color-border)]"
                style={{ backgroundColor: info?.hex ?? "var(--color-muted)" }}
              />
              <span className="text-xs text-[var(--color-text-secondary)]">
                {info?.label ?? item.color} ({item.count})
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
