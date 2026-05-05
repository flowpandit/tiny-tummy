import { HISTORY_RANGE_OPTIONS } from "../../lib/history-timeline";
import { cn } from "../../lib/cn";

export function HistoryRangeSelector({
  value,
  onChange,
  canUseFullHistory,
}: {
  value: 7 | 14 | 30;
  onChange: (value: 7 | 14 | 30) => void;
  canUseFullHistory: boolean;
}) {
  return (
    <div className="flex shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)]/76 p-1 shadow-[var(--shadow-inner)]">
      {HISTORY_RANGE_OPTIONS.map((option) => {
        const isPremiumRange = option.value > 7;
        const isDisabled = isPremiumRange && !canUseFullHistory;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              if (!isDisabled) onChange(option.value);
            }}
            disabled={isDisabled}
            aria-label={isDisabled ? `${option.label} requires Premium` : option.label}
            className={cn(
              "min-w-11 rounded-full px-3 py-1.5 text-[0.78rem] font-semibold leading-none transition-colors duration-150",
              value === option.value
                ? "bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-[0_6px_14px_rgba(95,74,60,0.16)]"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]",
              isDisabled && "cursor-not-allowed opacity-45 hover:bg-transparent",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
