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
      <div className="flex gap-1 h-6 rounded-[var(--radius-sm)] overflow-hidden">
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
              }}
              title={`${info?.label ?? item.color}: ${item.count} (${Math.round(pct)}%)`}
            />
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {data.map((item) => {
          const info = STOOL_COLORS.find((c) => c.value === item.color);
          return (
            <div key={item.color} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full border border-[var(--color-border)]"
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
