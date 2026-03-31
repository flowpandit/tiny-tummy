import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/cn";
import { useTheme } from "../../contexts/ThemeContext";

interface TimePickerProps {
  value: string; // "HH:MM"
  onChange: (time: string) => void;
  label?: string;
  nightMode?: boolean;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatDisplay(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${pad(m)} ${ampm}`;
}

export function TimePicker({ value, onChange, label, nightMode = false }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const { resolved } = useTheme();
  const isNight = nightMode || resolved === "night";
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);

  const { hour, minute } = useMemo(() => {
    const [h, m] = value.split(":").map(Number);
    return { hour: h, minute: m };
  }, [value]);

  // Scroll to selected values when opened
  useEffect(() => {
    if (!open) return;
    setTimeout(() => {
      hourRef.current?.querySelector("[data-selected]")?.scrollIntoView({ block: "center" });
      minuteRef.current?.querySelector("[data-selected]")?.scrollIntoView({ block: "center" });
    }, 50);
  }, [open]);

  const setHour = (h: number) => {
    onChange(`${pad(h)}:${pad(minute)}`);
  };

  const setMinute = (m: number) => {
    onChange(`${pad(hour)}:${pad(m)}`);
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <div>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          isNight
            ? "w-full h-11 px-3 rounded-[var(--radius-md)] border border-slate-700 bg-slate-900/90"
            : "w-full h-11 px-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]",
          isNight
            ? "text-slate-100 text-sm text-left cursor-pointer transition-colors hover:border-slate-500 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 outline-none"
            : "text-[var(--color-text)] text-sm text-left cursor-pointer transition-colors hover:border-[var(--color-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 outline-none",
          "flex items-center justify-between",
        )}
        aria-label={label ?? "Select time"}
      >
        <span>{formatDisplay(value)}</span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill={isNight ? "#94a3b8" : "var(--color-muted)"} className="w-4 h-4">
          <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Full-width time overlay */}
      <AnimatePresence>
        {open && (
          <>
            <div className={cn("fixed inset-0 z-40", isNight ? "bg-[#020617]/75" : "bg-black/20")} onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "fixed z-50 left-4 right-4 top-1/2 -translate-y-1/2 rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] p-4 max-w-sm mx-auto",
                isNight
                  ? "bg-[#0f172a] border border-slate-700/70"
                  : "bg-[var(--color-surface-strong)] border border-[var(--color-border)]",
              )}
            >
              <p className={cn("text-base font-semibold text-center mb-3", isNight ? "text-slate-100" : "text-[var(--color-text)]")}>
                Select Time
              </p>

              <div className="flex gap-3">
                {/* Hours column */}
                <div className="flex-1">
                  <p className={cn("text-xs font-medium text-center mb-2", isNight ? "text-slate-400" : "text-[var(--color-muted)]")}>Hour</p>
                  <div ref={hourRef} className={cn("h-52 overflow-y-auto rounded-[var(--radius-md)]", isNight ? "bg-slate-900/90" : "bg-[var(--color-bg)]")}>
                    {hours.map((h) => {
                      const ampm = h >= 12 ? "PM" : "AM";
                      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                      const isActive = hour === h;
                      return (
                        <button
                          key={h}
                          type="button"
                          data-selected={isActive || undefined}
                          onClick={() => setHour(h)}
                          className={cn(
                            "w-full py-2.5 text-sm text-center cursor-pointer transition-colors duration-100 rounded-[var(--radius-sm)]",
                            isActive
                              ? "bg-[var(--color-primary)] text-[var(--color-on-primary)] font-semibold"
                              : isNight
                                ? "text-slate-100 hover:bg-slate-800"
                                : "text-[var(--color-text)] hover:bg-[var(--color-border)]",
                          )}
                        >
                          {h12} {ampm}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Minutes column */}
                <div className="flex-1">
                  <p className={cn("text-xs font-medium text-center mb-2", isNight ? "text-slate-400" : "text-[var(--color-muted)]")}>Minute</p>
                  <div ref={minuteRef} className={cn("h-52 overflow-y-auto rounded-[var(--radius-md)]", isNight ? "bg-slate-900/90" : "bg-[var(--color-bg)]")}>
                    {minutes.map((m) => {
                      const isActive = minute === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          data-selected={isActive || undefined}
                          onClick={() => setMinute(m)}
                          className={cn(
                            "w-full py-2.5 text-sm text-center cursor-pointer transition-colors duration-100 rounded-[var(--radius-sm)]",
                            isActive
                              ? "bg-[var(--color-primary)] text-[var(--color-on-primary)] font-semibold"
                              : isNight
                                ? "text-slate-100 hover:bg-slate-800"
                                : "text-[var(--color-text)] hover:bg-[var(--color-border)]",
                          )}
                        >
                          :{pad(m)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Current selection + Done */}
              <div className="mt-3 flex items-center justify-between">
                <span className={cn("text-sm", isNight ? "text-slate-300" : "text-[var(--color-text-secondary)]")}>
                  {formatDisplay(value)}
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "px-5 text-sm font-medium bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-[var(--radius-md)] cursor-pointer hover:bg-[var(--color-primary-hover)] transition-colors",
                    "py-2",
                  )}
                >
                  Done
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
