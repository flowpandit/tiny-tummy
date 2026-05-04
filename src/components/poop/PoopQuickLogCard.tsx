import { Card, CardContent } from "../ui/card";
import { PoopPresetIcon } from "./PoopPresetIcon";
import type { QuickPoopPreset } from "../../lib/quick-presets";
import type { PoopEntry } from "../../lib/types";

export function PoopQuickLogCard({
  quickPoopPresets,
  repeatablePoop,
  onEditPresets,
  onRepeatLastPoop,
  onQuickPreset,
}: {
  quickPoopPresets: QuickPoopPreset[];
  repeatablePoop: PoopEntry | null;
  onEditPresets: () => void;
  onRepeatLastPoop: () => void;
  onQuickPreset: (preset: QuickPoopPreset) => void;
}) {
  return (
    <Card
      className="h-full overflow-hidden rounded-[18px] border shadow-[var(--shadow-home-card)] backdrop-blur-sm md:rounded-[24px]"
      style={{
        background: "var(--color-home-card-surface)",
        borderColor: "var(--color-home-card-border)",
      }}
    >
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text)] md:text-[0.74rem]">
              Quick log
            </p>
            <p className="mt-1 max-w-[34ch] text-[0.74rem] leading-snug text-[var(--color-text-secondary)] md:text-[0.82rem]">
              Start with the closest poop pattern.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {repeatablePoop && (
              <button
                type="button"
                onClick={onRepeatLastPoop}
                className="rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-3 py-1.5 text-[0.68rem] font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/15 md:text-[0.74rem]"
              >
                Repeat
              </button>
            )}
            <button
              type="button"
              onClick={onEditPresets}
              className="rounded-full border border-[var(--color-home-card-border)] bg-[var(--color-tracker-pill-surface)] px-3 py-1.5 text-[0.68rem] font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-tracker-pill-surface-hover)] md:text-[0.74rem]"
            >
              Edit
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {quickPoopPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onQuickPreset(preset)}
              className="flex min-h-[68px] flex-col items-center justify-center gap-1.5 rounded-[14px] border border-[var(--color-home-card-border)] bg-[var(--color-tracker-tile-surface)] px-2 py-2 text-center text-[0.78rem] font-semibold text-[var(--color-text)] shadow-[var(--shadow-tracker-tile)] transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--color-tracker-tile-surface-hover)] active:translate-y-0 md:min-h-[82px] md:rounded-[18px] md:text-[0.88rem]"
            >
              <PoopPresetIcon draft={preset.draft} className="h-8 w-8 md:h-9 md:w-9" />
              <span className="max-w-full truncate">{preset.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-3 text-[0.68rem] leading-snug text-[var(--color-text-soft)] md:text-[0.74rem]">
          {repeatablePoop ? (
            <p>Last safe pattern is ready to repeat.</p>
          ) : (
            <p>Edit presets to keep your most common patterns close.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
