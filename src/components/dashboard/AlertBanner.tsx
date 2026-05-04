import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import type { Alert } from "../../lib/types";

interface AlertBannerProps {
  alerts: Alert[];
  className?: string;
  onAction?: (alert: Alert) => void;
  onDismiss: (id: string) => void;
}

function getAlertPresentation(severity: Alert["severity"]) {
  if (severity === "urgent") {
    return {
      label: "Important",
      surface: "color-mix(in srgb, var(--color-alert-bg) 42%, var(--color-home-card-surface))",
      border: "color-mix(in srgb, var(--color-alert) 14%, transparent)",
      accent: "color-mix(in srgb, var(--color-alert) 74%, transparent)",
      badgeSurface: "color-mix(in srgb, var(--color-alert-bg) 72%, var(--color-home-card-surface))",
      iconSurface: "color-mix(in srgb, var(--color-alert-bg) 70%, var(--color-home-card-surface))",
      icon: "var(--color-alert)",
    };
  }

  if (severity === "warning") {
    return {
      label: "Watch",
      surface: "color-mix(in srgb, var(--color-caution-bg) 38%, var(--color-home-card-surface))",
      border: "color-mix(in srgb, var(--color-caution) 16%, transparent)",
      accent: "color-mix(in srgb, var(--color-caution) 74%, transparent)",
      badgeSurface: "color-mix(in srgb, var(--color-caution-bg) 72%, var(--color-home-card-surface))",
      iconSurface: "color-mix(in srgb, var(--color-caution-bg) 68%, var(--color-home-card-surface))",
      icon: "var(--color-caution)",
    };
  }

  return {
    label: "Note",
    surface: "color-mix(in srgb, var(--color-info-bg) 34%, var(--color-home-card-surface))",
    border: "color-mix(in srgb, var(--color-info) 16%, transparent)",
    accent: "color-mix(in srgb, var(--color-info) 70%, transparent)",
    badgeSurface: "color-mix(in srgb, var(--color-info-bg) 70%, var(--color-home-card-surface))",
    iconSurface: "color-mix(in srgb, var(--color-info-bg) 66%, var(--color-home-card-surface))",
    icon: "var(--color-info)",
  };
}

function getAlertDisplayCopy(alert: Alert) {
  if (alert.alert_type === "red_flag_color") {
    return {
      title: alert.title,
      description: "Check with your doctor if this repeats or your baby seems unwell.",
    };
  }

  return {
    title: alert.title,
    description: alert.message,
  };
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M12 8.25v4.25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 16h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path
        d="M10.52 5.24c.65-1.08 2.31-1.08 2.96 0l6.55 10.94c.68 1.14-.16 2.57-1.48 2.57H5.45c-1.32 0-2.16-1.43-1.48-2.57L10.52 5.24Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SwipeableAlert({
  alert,
  alertCount,
  onAction,
  onDismiss,
}: {
  alert: Alert;
  alertCount: number;
  onAction?: (alert: Alert) => void;
  onDismiss: (id: string) => void;
}) {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-150, -80, 0, 80, 150], [0.3, 1, 1, 1, 0.3]);
  const presentation = getAlertPresentation(alert.severity);
  const copy = getAlertDisplayCopy(alert);

  return (
    <motion.div
      data-no-page-swipe="true"
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.3}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 100 || Math.abs(info.velocity.x) > 500) {
          onDismiss(alert.id);
        }
      }}
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.18 } }}
      className="pointer-events-auto relative cursor-grab touch-pan-y overflow-hidden rounded-xl border px-4 py-3 shadow-[0_10px_24px_rgba(180,146,117,0.08)] active:cursor-grabbing"
      style={{
        background: presentation.surface,
        borderColor: presentation.border,
        x,
        opacity,
      }}
    >
      <span
        className="absolute inset-y-3 left-0 w-1 rounded-r-full"
        style={{ background: presentation.accent }}
        aria-hidden="true"
      />
      <div className="flex items-start gap-3 pr-8 sm:pr-36">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ background: presentation.iconSurface, color: presentation.icon }}
        >
          <AlertIcon />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.12em]"
              style={{ background: presentation.badgeSurface, color: presentation.icon }}
            >
              {alert.severity === "urgent" ? "Important" : presentation.label}
            </span>
            {alertCount > 1 && (
              <span className="text-xs font-medium text-[var(--color-text-soft)]">
                {alertCount} alerts
              </span>
            )}
          </div>
          <p className="mt-1 text-base font-medium leading-snug text-[var(--color-text)]">
            {copy.title}
          </p>
          <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-[var(--color-text-secondary)]">
            {copy.description}
          </p>
          {onAction && (
            <div className="mt-2 sm:absolute sm:right-12 sm:top-3 sm:mt-0">
              <button
                type="button"
                onClick={() => onAction(alert)}
                className="min-h-9 cursor-pointer rounded-full px-2.5 text-sm font-semibold text-[var(--color-alert)] transition-colors hover:bg-[var(--color-home-hover-surface)]"
              >
                What to do
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(alert.id)}
          className="absolute right-2 top-2 flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-full text-[var(--color-muted)] transition-colors hover:bg-[var(--color-home-hover-surface)] hover:text-[var(--color-text-secondary)] sm:static sm:shrink-0"
          aria-label={`Dismiss ${presentation.label.toLowerCase()} alert`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

export function AlertBanner({ alerts, className = "", onAction, onDismiss }: AlertBannerProps) {
  if (alerts.length === 0) return null;
  const alert = alerts[0];
  if (!alert) return null;

  return (
    <div className={`pointer-events-none ${className}`}>
      <AnimatePresence>
        <SwipeableAlert
          key={alert.id}
          alert={alert}
          alertCount={alerts.length}
          onAction={onAction}
          onDismiss={onDismiss}
        />
      </AnimatePresence>
    </div>
  );
}
