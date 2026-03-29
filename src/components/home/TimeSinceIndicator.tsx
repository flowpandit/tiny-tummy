import { useEffect, useState } from "react";
import type { HealthStatus } from "../../lib/types";
import { timeSinceDetailed } from "../../lib/utils";

interface TimeSinceIndicatorProps {
  lastPoopAt: string | null;
  status: HealthStatus;
}

const STATUS_GRADIENTS: Record<HealthStatus, string> = {
  healthy: "var(--gradient-status-healthy)",
  caution: "var(--gradient-status-caution)",
  alert: "var(--gradient-status-alert)",
  unknown: "var(--gradient-status-unknown)",
};

export function TimeSinceIndicator({ lastPoopAt, status }: TimeSinceIndicatorProps) {
  const [time, setTime] = useState(
    lastPoopAt ? timeSinceDetailed(lastPoopAt) : null,
  );

  useEffect(() => {
    if (!lastPoopAt) return;
    setTime(timeSinceDetailed(lastPoopAt));
    const interval = setInterval(() => {
      setTime(timeSinceDetailed(lastPoopAt));
    }, 60000);
    return () => clearInterval(interval);
  }, [lastPoopAt]);

  const gradient = STATUS_GRADIENTS[status];

  return (
    <div
      className="relative mx-auto flex h-[108px] w-[108px] items-center justify-center rounded-full shadow-[var(--shadow-soft)]"
      style={{ background: gradient }}
    >
      <div className="absolute inset-[11px] rounded-full bg-[var(--color-surface-strong)] shadow-[var(--shadow-inner)]" />
      <div className="relative z-10 flex flex-col items-center justify-center">
        {time ? (
          <>
            <span className="text-[2rem] font-bold text-[var(--color-text)]" style={{ fontFamily: "var(--font-display)" }}>
              {time.value}
            </span>
            <span className="text-xs text-[var(--color-text-secondary)]">{time.unit}</span>
          </>
        ) : (
          <span className="text-sm text-[var(--color-muted)]">No data</span>
        )}
      </div>
    </div>
  );
}
