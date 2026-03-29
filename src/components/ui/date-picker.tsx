import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/cn";

interface DatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (date: string) => void;
  max?: string;
  min?: string;
  label?: string;
  dismissOnDocumentClick?: boolean;
  overlayOffsetY?: number;
  usePortal?: boolean;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type PickerView = "calendar" | "year" | "month";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

export function DatePicker({
  value,
  onChange,
  max,
  min,
  label,
  dismissOnDocumentClick = false,
  overlayOffsetY = 0,
  usePortal = false,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [pickerView, setPickerView] = useState<PickerView>("calendar");
  const rootRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => {
    const [y, m, d] = value.split("-").map(Number);
    return { year: y, month: m - 1, day: d };
  }, [value]);

  const [viewYear, setViewYear] = useState(selected.year);
  const [viewMonth, setViewMonth] = useState(selected.month);

  // Keep view in sync when value changes externally (e.g. component reuse)
  useEffect(() => {
    setViewYear(selected.year);
    setViewMonth(selected.month);
  }, [selected.year, selected.month]);

  const maxDate = max ? new Date(max + "T23:59:59") : null;
  const minDate = min ? new Date(min + "T00:00:00") : null;

  // Year range: from minDate year (or 10 years back) to maxDate year (or current)
  const maxYear = maxDate ? maxDate.getFullYear() : new Date().getFullYear();
  const minYear = minDate ? minDate.getFullYear() : maxYear - 100;

  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = maxYear; y >= minYear; y--) arr.push(y);
    return arr;
  }, [minYear, maxYear]);

  const days = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    // Pad to 42 cells (6 rows) so calendar height stays constant across months
    while (cells.length < 42) cells.push(null);

    return cells;
  }, [viewYear, viewMonth]);

  const goToPrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const isPrevDisabled = minDate
    ? new Date(viewYear, viewMonth, 0) < minDate
    : false;

  const isNextDisabled = maxDate
    ? new Date(viewYear, viewMonth + 1, 1) > maxDate
    : false;

  const selectDay = (day: number) => {
    onChange(toDateStr(viewYear, viewMonth, day));
    setOpen(false);
    setPickerView("calendar");
  };

  const isSelected = (day: number) =>
    viewYear === selected.year && viewMonth === selected.month && day === selected.day;

  const isDisabled = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    if (maxDate && d > maxDate) return true;
    if (minDate && d < minDate) return true;
    return false;
  };

  const isToday = (day: number) => {
    const now = new Date();
    return viewYear === now.getFullYear() && viewMonth === now.getMonth() && day === now.getDate();
  };

  const isMonthDisabled = (monthIdx: number) => {
    if (maxDate && new Date(viewYear, monthIdx, 1) > maxDate) return true;
    if (minDate && new Date(viewYear, monthIdx + 1, 0) < minDate) return true;
    return false;
  };

  const isYearDisabled = (year: number) => {
    if (maxDate && new Date(year, 0, 1) > maxDate) return true;
    if (minDate && new Date(year, 11, 31) < minDate) return true;
    return false;
  };

  const displayValue = new Date(value + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const handleOpen = () => {
    setViewYear(selected.year);
    setViewMonth(selected.month);
    setPickerView("calendar");
    setOpen(!open);
  };

  const handleClose = () => {
    setOpen(false);
    setPickerView("calendar");
  };

  const overlayContent = (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={handleClose} />
      <motion.div
        ref={overlayRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className={cn(
          "fixed left-4 right-4 top-1/2 -translate-y-1/2 bg-[var(--color-surface-strong)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] border border-[var(--color-border)] p-4 max-w-sm mx-auto",
          usePortal ? "z-[120]" : "z-50",
        )}
        style={{ top: `calc(50% + ${overlayOffsetY}px)` }}
      >
        {pickerView === "calendar" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={goToPrev}
                disabled={isPrevDisabled}
                className={cn(
                  "w-10 h-10 flex items-center justify-center rounded-full cursor-pointer text-[var(--color-text-secondary)]",
                  isPrevDisabled ? "opacity-30 cursor-not-allowed" : "hover:bg-[var(--color-bg)]",
                )}
                aria-label="Previous month"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setPickerView("year")}
                className="text-base font-semibold text-[var(--color-text)] cursor-pointer hover:text-[var(--color-primary)] transition-colors flex items-center gap-1"
              >
                {MONTHS[viewMonth]} {viewYear}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0l-4.25-4.25a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                type="button"
                onClick={goToNext}
                disabled={isNextDisabled}
                className={cn(
                  "w-10 h-10 flex items-center justify-center rounded-full cursor-pointer text-[var(--color-text-secondary)]",
                  isNextDisabled ? "opacity-30 cursor-not-allowed" : "hover:bg-[var(--color-bg)]",
                )}
                aria-label="Next month"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-7 mb-2">
              {WEEKDAYS.map((wd) => (
                <div key={wd} className="text-center text-xs font-semibold text-[var(--color-muted)] py-1">
                  {wd}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1">
              {days.map((day, i) => (
                <div key={i} className="flex items-center justify-center">
                  {day ? (
                    <button
                      type="button"
                      onClick={() => selectDay(day)}
                      disabled={isDisabled(day)}
                      className={cn(
                        "w-10 h-10 rounded-full text-sm flex items-center justify-center cursor-pointer transition-colors duration-150",
                        isSelected(day)
                          ? "bg-[var(--color-primary)] text-[var(--color-on-primary)] font-bold shadow-[var(--shadow-soft)]"
                          : isToday(day)
                            ? "border-2 border-[var(--color-primary)] text-[var(--color-primary)] font-semibold"
                            : "text-[var(--color-text)] hover:bg-[var(--color-bg)]",
                        isDisabled(day) && "opacity-25 cursor-not-allowed",
                      )}
                    >
                      {day}
                    </button>
                  ) : (
                    <div className="w-10 h-10" />
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                const now = new Date();
                onChange(toDateStr(now.getFullYear(), now.getMonth(), now.getDate()));
                setOpen(false);
                setPickerView("calendar");
              }}
              className="w-full mt-3 py-2 text-sm font-medium text-[var(--color-primary)] cursor-pointer rounded-[var(--radius-sm)] hover:bg-[var(--color-primary)]/5 transition-colors"
            >
              Today
            </button>
          </>
        )}

        {pickerView === "year" && (
          <>
            <p className="text-base font-semibold text-[var(--color-text)] text-center mb-3">
              Select Year
            </p>
            <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  disabled={isYearDisabled(y)}
                  onClick={() => {
                    setViewYear(y);
                    setPickerView("month");
                  }}
                  className={cn(
                    "py-2.5 rounded-[var(--radius-md)] text-sm font-medium cursor-pointer transition-colors duration-150",
                    y === viewYear
                      ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                      : "text-[var(--color-text)] hover:bg-[var(--color-bg)]",
                    isYearDisabled(y) && "opacity-25 cursor-not-allowed",
                  )}
                >
                  {y}
                </button>
              ))}
            </div>
          </>
        )}

        {pickerView === "month" && (
          <>
            <button
              type="button"
              onClick={() => setPickerView("year")}
              className="text-base font-semibold text-[var(--color-text)] text-center mb-3 w-full cursor-pointer hover:text-[var(--color-primary)] transition-colors flex items-center justify-center gap-1"
            >
              {viewYear}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0l-4.25-4.25a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </button>
            <div className="grid grid-cols-3 gap-2">
              {MONTHS_SHORT.map((m, i) => (
                <button
                  key={m}
                  type="button"
                  disabled={isMonthDisabled(i)}
                  onClick={() => {
                    setViewMonth(i);
                    setPickerView("calendar");
                  }}
                  className={cn(
                    "py-2.5 rounded-[var(--radius-md)] text-sm font-medium cursor-pointer transition-colors duration-150",
                    i === viewMonth && viewYear === selected.year
                      ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                      : "text-[var(--color-text)] hover:bg-[var(--color-bg)]",
                    isMonthDisabled(i) && "opacity-25 cursor-not-allowed",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </>
  );

  useEffect(() => {
    if (!open || !dismissOnDocumentClick) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target)) return;
      if (overlayRef.current?.contains(target)) return;
      handleClose();
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [open, dismissOnDocumentClick]);

  return (
    <div ref={rootRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          "w-full h-11 px-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]",
          "text-[var(--color-text)] text-sm text-left cursor-pointer transition-colors",
          "hover:border-[var(--color-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 outline-none",
          "flex items-center justify-between",
        )}
        aria-label={label ?? "Select date"}
      >
        <span>{displayValue}</span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="var(--color-muted)" className="w-4 h-4">
          <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Full-width calendar overlay */}
      {usePortal ? (
        open ? createPortal(overlayContent, document.body) : null
      ) : (
        <AnimatePresence>{open && overlayContent}</AnimatePresence>
      )}
    </div>
  );
}
