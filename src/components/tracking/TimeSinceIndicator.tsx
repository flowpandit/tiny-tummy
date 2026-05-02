import { useEffect, useState } from "react";
import type { HealthStatus } from "../../lib/types";
import { timeSinceDetailed } from "../../lib/utils";

interface TimeSinceIndicatorProps {
  timestamp: string | null;
  status?: HealthStatus;
  gradient?: string;
}

const STATUS_GRADIENTS: Record<HealthStatus, string> = {
  healthy: "var(--gradient-status-healthy)",
  caution: "var(--gradient-status-caution)",
  alert: "var(--gradient-status-alert)",
  unknown: "var(--gradient-status-unknown)",
};

export function TimeSinceIndicator({ timestamp, status = "unknown", gradient }: TimeSinceIndicatorProps) {
  const [time, setTime] = useState(
    timestamp ? timeSinceDetailed(timestamp) : null,
  );

  useEffect(() => {
    if (!timestamp) {
      setTime(null);
      return;
    }

    setTime(timeSinceDetailed(timestamp));
    const interval = setInterval(() => {
      setTime(timeSinceDetailed(timestamp));
    }, 60000);

    return () => clearInterval(interval);
  }, [timestamp]);

  const ringGradient = gradient ?? STATUS_GRADIENTS[status];

  return (
    <div
      className="relative mx-auto flex h-[96px] w-[96px] items-center justify-center rounded-full shadow-[var(--shadow-soft)]"
      style={{ background: ringGradient }}
    >
      <div className="absolute inset-[10px] rounded-full bg-[var(--color-surface-strong)] shadow-[var(--shadow-inner)]" />
      <div className="relative z-10 flex flex-col items-center justify-center">
        {time ? (
          <>
            <span className="text-[1.7rem] font-bold text-[var(--color-text)]">
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
