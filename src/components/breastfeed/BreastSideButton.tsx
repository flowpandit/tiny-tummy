import { breastfeedIcon } from "../../assets/icons";
import { formatBreastfeedingClock } from "../../lib/breastfeeding";

export function BreastSideButton({
  side,
  isActive,
  isLastUsed,
  durationMs,
  onClick,
}: {
  side: "left" | "right";
  isActive: boolean;
  isLastUsed: boolean;
  durationMs: number;
  onClick: () => void;
}) {
  const sideLabel = side === "left" ? "Left" : "Right";
  const tone = side === "left"
    ? {
      chipBg: "linear-gradient(135deg, #de5c9f 0%, #c84c89 100%)",
      cardBg: "color-mix(in srgb, var(--color-surface-strong) 84%, #de5c9f 16%)",
      buttonBg: "linear-gradient(135deg, #de5c9f 0%, #ca4d8e 100%)",
    }
    : {
      chipBg: "linear-gradient(135deg, #84a7ff 0%, #6f8df0 100%)",
      cardBg: "color-mix(in srgb, var(--color-surface-strong) 84%, #84a7ff 16%)",
      buttonBg: "linear-gradient(135deg, #84a7ff 0%, #6f8df0 100%)",
    };

  return (
    <div
      className={`relative min-w-0 rounded-[16px] border px-2.5 pb-9 pt-2.5 text-left transition-all duration-200 md:rounded-[18px] md:px-3 md:pb-10 md:pt-3 ${isActive ? "border-[var(--color-primary)] shadow-[var(--shadow-medium)]" : "border-[var(--color-home-card-border)] shadow-[0_10px_22px_rgba(172,139,113,0.07)]"}`}
      style={{ background: tone.cardBg }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow-[var(--shadow-soft)] md:h-9 md:w-9" style={{ background: tone.chipBg }}>
            <span
              aria-hidden="true"
              className="inline-block h-4 w-4 md:h-4.5 md:w-4.5"
              style={{
                backgroundColor: "white",
                transform: side === "right" ? "scaleX(-1)" : undefined,
                WebkitMaskImage: `url(${breastfeedIcon})`,
                WebkitMaskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                WebkitMaskSize: "contain",
                maskImage: `url(${breastfeedIcon})`,
                maskRepeat: "no-repeat",
                maskPosition: "center",
                maskSize: "contain",
              }}
            />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[1rem] font-semibold tracking-[-0.03em] text-[var(--color-text)]">{sideLabel}</p>
            {isLastUsed && !isActive && (
              <span className="mt-1.5 inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-tracker-chip-surface)] px-2 py-0.5 text-[9px] font-semibold text-[var(--color-tracker-chip-text)]">
                Used last
              </span>
            )}
          </div>
        </div>
        {isActive && <span className="shrink-0 rounded-full bg-[var(--color-tracker-panel-strong)] px-2 py-0.5 text-[9px] font-semibold text-[var(--color-text)]">Running</span>}
      </div>

      <div className="px-0.5 pb-0 pt-1.5 text-center">
        <p className="text-[2rem] font-semibold leading-none tracking-[-0.06em] text-[var(--color-text)] md:text-[2.25rem]">
          {formatBreastfeedingClock(durationMs)}
        </p>
        <p className="mt-1.5 text-[0.72rem] leading-tight text-[var(--color-text-secondary)] md:text-[0.8rem]">
          {isActive ? "Tap to keep timing." : "Tap to start."}
        </p>
      </div>

      <button
        type="button"
        onClick={onClick}
        className="absolute bottom-[-12px] left-1/2 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full text-white shadow-[var(--shadow-medium)] transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] md:h-[52px] md:w-[52px]"
        style={{ background: tone.buttonBg }}
        aria-label={isActive ? `Continue timing ${sideLabel}` : `Start ${sideLabel}`}
      >
        {isActive ? (
          <span className="flex items-center gap-1.5">
            <span className="h-5 w-1.5 rounded-full bg-white md:h-6 md:w-2" />
            <span className="h-5 w-1.5 rounded-full bg-white md:h-6 md:w-2" />
          </span>
        ) : (
          <span
            className="ml-0.5 h-0 w-0 border-b-[10px] border-l-[16px] border-t-[10px] border-b-transparent border-l-white border-t-transparent"
            aria-hidden="true"
          />
        )}
      </button>
    </div>
  );
}
