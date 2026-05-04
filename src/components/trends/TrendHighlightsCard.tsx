import type { TrendDirection, TrendHighlightModel, TrendTone } from "../../lib/trends";
import { cn } from "../../lib/cn";
import { Card, CardContent } from "../ui/card";

function getToneClassName(tone: TrendTone) {
  if (tone === "healthy") return "bg-[var(--color-healthy-bg)] text-[var(--color-healthy)]";
  if (tone === "cta") return "bg-[var(--color-surface-tint)] text-[var(--color-cta-hover)]";
  if (tone === "info") return "bg-[var(--color-info-bg)] text-[var(--color-info)]";
  return "bg-[var(--color-home-empty-surface)] text-[var(--color-text-soft)]";
}

function TrendGlyph({ direction }: { direction: TrendDirection }) {
  if (direction === "up") {
    return (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
        <path d="M4 12.5 8 8.5l3 3L16 6.5" />
        <path d="M12.5 6.5H16v3.5" />
      </svg>
    );
  }

  if (direction === "down") {
    return (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
        <path d="M4 7.5 8 11.5l3-3 5 5" />
        <path d="M12.5 13.5H16V10" />
      </svg>
    );
  }

  if (direction === "steady") {
    return (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
        <path d="M4 10h12" />
        <path d="m13 7 3 3-3 3" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <circle cx="10" cy="10" r="5.5" />
      <path d="M10 7v3.5" />
      <path d="M10 13h.01" />
    </svg>
  );
}

function TrendHighlight({ item }: { item: TrendHighlightModel }) {
  return (
    <div className="flex min-w-0 gap-2.5 rounded-[16px] border border-[var(--color-home-card-border)] bg-[var(--color-tracker-panel-surface)] px-3 py-3">
      <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", getToneClassName(item.tone))}>
        <TrendGlyph direction={item.direction} />
      </span>
      <div className="min-w-0">
        <p className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-soft)] md:text-[0.7rem]">
          {item.label}
        </p>
        <p className="mt-1 text-[0.82rem] font-semibold leading-tight text-[var(--color-text)] md:text-[0.9rem]">
          {item.headline}
        </p>
        <p className="mt-1 text-[0.68rem] leading-snug text-[var(--color-text-secondary)] md:text-[0.74rem]">
          {item.detail}
        </p>
      </div>
    </div>
  );
}

export function TrendHighlightsCard({ highlights }: { highlights: TrendHighlightModel[] }) {
  return (
    <Card
      className="overflow-hidden rounded-[18px] border shadow-[var(--shadow-home-card)] backdrop-blur-sm md:rounded-[24px]"
      style={{
        background: "var(--color-home-card-surface)",
        borderColor: "var(--color-home-card-border)",
      }}
    >
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text)] md:text-[0.74rem]">
              What&apos;s trending
            </p>
            <p className="mt-1 max-w-[44ch] text-[0.74rem] leading-snug text-[var(--color-text-secondary)] md:text-[0.82rem]">
              Recent days compared with the earlier part of this range.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {highlights.map((item) => (
            <TrendHighlight key={item.id} item={item} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
