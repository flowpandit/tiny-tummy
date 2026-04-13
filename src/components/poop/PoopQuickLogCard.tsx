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
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Quick log</p>
            {repeatablePoop && (
              <p className="mt-1 text-[12px] text-[var(--color-text-soft)]">Last safe pattern ready to repeat.</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {repeatablePoop && (
              <button
                type="button"
                onClick={onRepeatLastPoop}
                className="rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-3 py-1.5 text-[11px] font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/15"
              >
                Repeat
              </button>
            )}
            <button
              type="button"
              onClick={onEditPresets}
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-white/70"
            >
              Edit
            </button>
          </div>
        </div>

        <div className="mt-2 overflow-x-auto pb-1">
          <div className="flex w-max gap-3 pr-2">
            {quickPoopPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onQuickPreset(preset)}
                className="flex min-h-[50px] min-w-[50px] flex-col items-center justify-center gap-0.25 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-2.5 py-0.5 text-center transition-colors hover:bg-white/70"
              >
                <PoopPresetIcon draft={preset.draft} className="h-10 w-10" />
                <p className="pb-2 text-[0.72rem] font-medium leading-none text-[var(--color-text)]">{preset.label}</p>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
