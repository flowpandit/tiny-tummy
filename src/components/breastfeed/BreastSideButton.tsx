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
      className={`relative min-w-0 rounded-[24px] border px-3 pb-11 pt-3 text-left transition-all duration-200 ${isActive ? "border-[var(--color-primary)] shadow-[var(--shadow-medium)]" : "border-[var(--color-border)] shadow-[var(--shadow-soft)]"}`}
      style={{ background: tone.cardBg }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-[var(--shadow-soft)]" style={{ background: tone.chipBg }}>
            <span
              aria-hidden="true"
              className="inline-block h-4.5 w-4.5"
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
              <span className="mt-1.5 inline-flex rounded-full border border-[var(--color-border)] bg-white/55 px-2 py-0.5 text-[9px] font-semibold text-[var(--color-text-secondary)]">
                Used last
              </span>
            )}
          </div>
        </div>
        {isActive && <span className="shrink-0 rounded-full bg-white/70 px-2 py-0.5 text-[9px] font-semibold text-[var(--color-text)]">Running</span>}
      </div>

      <div className="px-0.5 pb-0 pt-1 text-center">
        <p className="text-[2.55rem] font-semibold tracking-[-0.06em] leading-none text-[var(--color-text)]">
          {formatBreastfeedingClock(durationMs)}
        </p>
        <p className="mt-2 text-[0.82rem] leading-tight text-[var(--color-text-secondary)]">
          {isActive ? "Tap to keep timing." : "Tap to start."}
        </p>
      </div>

      <button
        type="button"
        onClick={onClick}
        className="absolute bottom-[-14px] left-1/2 flex h-[56px] w-[56px] -translate-x-1/2 items-center justify-center rounded-full text-white shadow-[var(--shadow-medium)] transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
        style={{ background: tone.buttonBg }}
        aria-label={isActive ? `Continue timing ${sideLabel}` : `Start ${sideLabel}`}
      >
        {isActive ? (
          <span className="flex items-center gap-1.5">
            <span className="h-6 w-2 rounded-full bg-white" />
            <span className="h-6 w-2 rounded-full bg-white" />
          </span>
        ) : (
          <span
            className="ml-0.5 h-0 w-0 border-b-[11px] border-l-[18px] border-t-[11px] border-b-transparent border-l-white border-t-transparent"
            aria-hidden="true"
          />
        )}
      </button>
    </div>
  );
}
