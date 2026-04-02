import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import type { Alert } from "../../lib/types";

interface AlertBannerProps {
  alerts: Alert[];
  onDismiss: (id: string) => void;
}

function SwipeableAlert({
  alert,
  onDismiss,
}: {
  alert: Alert;
  onDismiss: (id: string) => void;
}) {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-150, -80, 0, 80, 150], [0.3, 1, 1, 1, 0.3]);

  const bgColor =
    alert.severity === "urgent"
      ? "var(--color-alert-bg)"
      : alert.severity === "warning"
        ? "var(--color-caution-bg)"
        : "var(--color-info-bg)";
  const borderColor =
    alert.severity === "urgent"
      ? "var(--color-alert)"
      : alert.severity === "warning"
        ? "var(--color-caution)"
        : "var(--color-info)";

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.3}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 100 || Math.abs(info.velocity.x) > 500) {
          onDismiss(alert.id);
        }
      }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -200, transition: { duration: 0.3 } }}
      className="pointer-events-auto rounded-[24px] border p-3.5 shadow-[var(--shadow-soft)] backdrop-blur-xl cursor-grab touch-pan-y active:cursor-grabbing"
      style={{ backgroundColor: bgColor, borderLeftColor: borderColor, x, opacity }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--color-text)]">{alert.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">{alert.message}</p>
        </div>
        <button
          onClick={() => onDismiss(alert.id)}
          className="text-[var(--color-muted)] hover:text-[var(--color-text-secondary)] cursor-pointer p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Dismiss alert"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

export function AlertBanner({ alerts, onDismiss }: AlertBannerProps) {
  const location = useLocation();
  const hideHeaderPaths = new Set(["/", "/guidance", "/settings"]);
  const showHeader = !hideHeaderPaths.has(location.pathname);

  if (alerts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[40] px-4"
      style={{
        top: showHeader
          ? "calc(var(--safe-area-top) + 92px)"
          : "calc(var(--safe-area-top) + 12px)",
      }}
    >
      <div className="mx-auto flex max-w-[600px] flex-col gap-2">
        <AnimatePresence>
          {alerts.map((alert) => (
            <SwipeableAlert key={alert.id} alert={alert} onDismiss={onDismiss} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
