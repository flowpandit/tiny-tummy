import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { HealthStatus } from "../../lib/types";
import { timeSinceDetailed } from "../../lib/utils";

interface TimeSinceIndicatorProps {
  lastPoopAt: string | null;
  status: HealthStatus;
}

const STATUS_COLORS: Record<HealthStatus, string> = {
  healthy: "var(--color-healthy)",
  caution: "var(--color-caution)",
  alert: "var(--color-alert)",
  unknown: "var(--color-muted)",
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

  const color = STATUS_COLORS[status];
  const circumference = 2 * Math.PI * 54;
  const progress = status === "healthy" ? 0.3 : status === "caution" ? 0.65 : 0.95;

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        {/* Background ring */}
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="6"
        />
        {/* Progress ring */}
        <motion.circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - progress) }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {time ? (
          <>
            <span className="text-3xl font-bold text-[var(--color-text)]" style={{ fontFamily: "var(--font-display)" }}>
              {time.value}
            </span>
            <span className="text-sm text-[var(--color-text-secondary)]">{time.unit}</span>
          </>
        ) : (
          <span className="text-sm text-[var(--color-muted)]">No data</span>
        )}
      </div>
      {/* Pulse for healthy */}
      {status === "healthy" && lastPoopAt && (
        <motion.div
          className="absolute inset-0 rounded-full border-2"
          style={{ borderColor: color }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}
