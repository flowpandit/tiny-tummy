import { getDiaperTypeLabel, getUrineColorLabel } from "../../lib/diaper";
import { getStoolShortLabel } from "../../lib/diaper-insights";
import { Card, CardContent } from "../ui/card";
import type { DiaperEntry, DiaperLogDraft } from "../../lib/types";

export function DiaperQuickLogCard({
  lastDiaper,
  onPresetSelect,
}: {
  lastDiaper: DiaperEntry | null;
  onPresetSelect: (draft: Partial<DiaperLogDraft>) => void;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Quick diaper start</p>
            <p className="mt-2 max-w-[34ch] text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
              Start with the most likely diaper event, then fill in stool or urine detail only when it matters.
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onPresetSelect({ diaper_type: "wet", urine_color: "normal" })}
              className="rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-3 py-2 text-[12px] font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/15"
            >
              Wet diaper
            </button>
            <button
              type="button"
              onClick={() => onPresetSelect({ diaper_type: "dirty" })}
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-3 py-2 text-[12px] font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-white/70"
            >
              Dirty diaper
            </button>
            <button
              type="button"
              onClick={() => onPresetSelect({ diaper_type: "mixed", urine_color: "normal" })}
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-3 py-2 text-[12px] font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-white/70"
            >
              Mixed diaper
            </button>
          </div>
        </div>

        {lastDiaper && (
          <p className="mt-3 text-[12px] text-[var(--color-text-soft)]">
            Last logged: {getDiaperTypeLabel(lastDiaper.diaper_type)}
            {lastDiaper.urine_color ? ` · ${getUrineColorLabel(lastDiaper.urine_color)}` : ""}
            {getStoolShortLabel(lastDiaper.stool_type) ? ` · ${getStoolShortLabel(lastDiaper.stool_type)}` : ""}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
