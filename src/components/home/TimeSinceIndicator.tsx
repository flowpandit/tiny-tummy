import { useEffect, useState } from "react";
import type { HealthStatus } from "../../lib/types";
import { timeSinceDetailed } from "../../lib/utils";

interface TimeSinceIndicatorProps {
  lastPoopAt: string | null;
  status: HealthStatus;
}

const STATUS_GRADIENTS: Record<HealthStatus, string> = {
  healthy: "conic-gradient(from 210deg, #ff9c7c 0deg, #efc45c 120deg, #94d6bb 280deg, #ff9c7c 360deg)",
  caution: "conic-gradient(from 210deg, #ff9c7c 0deg, #efc45c 170deg, #efc45c 360deg)",
  alert: "conic-gradient(from 210deg, #ff9c7c 0deg, #ef8c7a 200deg, #d95f52 360deg)",
  unknown: "conic-gradient(from 210deg, #cfd7e5 0deg, #9aabc4 360deg)",
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
