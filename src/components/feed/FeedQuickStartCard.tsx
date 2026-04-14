import { Card, CardContent } from "../ui/card";
import { getFeedingEntryDetailParts, getFeedingEntryPrimaryLabel } from "../../lib/feeding";
import type { FeedingEntry, UnitSystem } from "../../lib/types";
import type { QuickFeedPreset } from "../../lib/quick-presets";

export function FeedQuickStartCard({
  activeBreastfeedingSide,
  lastFeed,
  quickFeedPresets,
  showBreastfeedAction,
  unitSystem,
  onEditTiles,
  onNavigateToBreastfeed,
  onQuickPreset,
  onRepeatLastFeed,
}: {
  activeBreastfeedingSide: "left" | "right" | null;
  lastFeed: FeedingEntry | null;
  quickFeedPresets: QuickFeedPreset[];
  showBreastfeedAction: boolean;
  unitSystem: UnitSystem;
  onEditTiles: () => void;
  onNavigateToBreastfeed: () => void;
  onQuickPreset: (preset: QuickFeedPreset) => void;
  onRepeatLastFeed: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Quick feed start</p>
            <p className="mt-2 max-w-[34ch] text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
              Start with the type already chosen, then add details only if needed.
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {lastFeed && (
              <button
                type="button"
                onClick={onRepeatLastFeed}
                className="rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-3 py-2 text-[12px] font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/15"
              >
                Repeat last feed
              </button>
            )}
            <button
              type="button"
              onClick={onEditTiles}
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-3 py-2 text-[12px] font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-white/70"
            >
              Edit tiles
            </button>
            {showBreastfeedAction && (
              <button
                type="button"
                onClick={onNavigateToBreastfeed}
                className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-3 py-2 text-[12px] font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-white/70 flex items-center gap-2"
              >
                <span>Breastfeed timer</span>
                {activeBreastfeedingSide && (
                  <span
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-primary)] text-[10px] font-semibold text-[var(--color-primary)]"
                    aria-label={activeBreastfeedingSide === "left" ? "Left breastfeeding timer running" : "Right breastfeeding timer running"}
                  >
                    {activeBreastfeedingSide === "left" ? "L" : "R"}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {lastFeed && (
          <p className="mt-3 text-[12px] text-[var(--color-text-soft)]">
            Last feed: {getFeedingEntryPrimaryLabel(lastFeed)}
            {getFeedingEntryDetailParts(lastFeed, unitSystem).length > 0 ? ` · ${getFeedingEntryDetailParts(lastFeed, unitSystem).join(" · ")}` : ""}
          </p>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          {quickFeedPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onQuickPreset(preset)}
              className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4 py-3 text-left transition-colors hover:bg-white/70"
            >
              <p className="text-[14px] font-medium text-[var(--color-text)]">{preset.label}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-text-soft)]">{preset.description}</p>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
