import { Card, CardContent } from "../ui/card";
import { getFeedingEntryDetailParts, getFeedingEntryPrimaryLabel } from "../../lib/feeding";
import { HomeActionBottleIcon, HomeActionBreastfeedIcon, MealIcon } from "../ui/icons";
import type { FeedingEntry, UnitSystem } from "../../lib/types";
import type { QuickFeedPreset } from "../../lib/quick-presets";

function FeedPresetIcon({ preset }: { preset: QuickFeedPreset }) {
  const foodType = preset.draft.food_type;

  if (foodType === "breast_milk" || foodType === "pumping") {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ffe8f3] text-[#de5c9f] md:h-9 md:w-9">
        <HomeActionBreastfeedIcon className="h-4.5 w-4.5" />
      </span>
    );
  }

  if (foodType === "solids" || foodType === "other") {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ffefe4] text-[#a86235] md:h-9 md:w-9">
        <MealIcon className="h-4.5 w-4.5" />
      </span>
    );
  }

  if (foodType === "water") {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eaefff] text-[#6f8df0] md:h-9 md:w-9">
        <HomeActionBottleIcon className="h-4.5 w-4.5" />
      </span>
    );
  }

  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#dff8ec] text-[#13a970] md:h-9 md:w-9">
      <HomeActionBottleIcon className="h-4.5 w-4.5" />
    </span>
  );
}

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
    <Card
      className="h-full overflow-hidden rounded-[18px] border shadow-[var(--shadow-home-card)] backdrop-blur-sm md:rounded-[24px]"
      style={{
        background: "var(--color-home-card-surface)",
        borderColor: "var(--color-home-card-border)",
      }}
    >
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text)] md:text-[0.74rem]">
              Quick log
            </p>
            <p className="mt-1 max-w-[34ch] text-[0.74rem] leading-snug text-[var(--color-text-secondary)] md:text-[0.82rem]">
              Start with the closest feed type.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            {lastFeed && (
              <button
                type="button"
                onClick={onRepeatLastFeed}
                className="rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-3 py-1.5 text-[0.68rem] font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/15 md:text-[0.74rem]"
              >
                Repeat
              </button>
            )}
            <button
              type="button"
              onClick={onEditTiles}
              className="rounded-full border border-[var(--color-home-card-border)] bg-[var(--color-tracker-pill-surface)] px-3 py-1.5 text-[0.68rem] font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-tracker-pill-surface-hover)] md:text-[0.74rem]"
            >
              Edit
            </button>
            {showBreastfeedAction && (
              <button
                type="button"
                onClick={onNavigateToBreastfeed}
                className="flex items-center gap-1.5 rounded-full border border-[var(--color-home-card-border)] bg-[var(--color-tracker-pill-surface)] px-3 py-1.5 text-[0.68rem] font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-tracker-pill-surface-hover)] md:text-[0.74rem]"
              >
                <span>Timer</span>
                {activeBreastfeedingSide && (
                  <span
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--color-primary)] text-[0.62rem] font-semibold text-[var(--color-primary)]"
                    aria-label={activeBreastfeedingSide === "left" ? "Left breastfeeding timer running" : "Right breastfeeding timer running"}
                  >
                    {activeBreastfeedingSide === "left" ? "L" : "R"}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {quickFeedPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onQuickPreset(preset)}
              className="flex min-h-[68px] flex-col items-center justify-center gap-1.5 rounded-[14px] border border-[var(--color-home-card-border)] bg-[var(--color-tracker-tile-surface)] px-2 py-2 text-center text-[0.78rem] font-semibold text-[var(--color-text)] shadow-[var(--shadow-tracker-tile)] transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--color-tracker-tile-surface-hover)] active:translate-y-0 md:min-h-[82px] md:rounded-[18px] md:text-[0.88rem]"
            >
              <FeedPresetIcon preset={preset} />
              <span className="max-w-full truncate">{preset.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-3 text-[0.68rem] leading-snug text-[var(--color-text-soft)] md:text-[0.74rem]">
          {lastFeed ? (
            <p>
              Last logged: {getFeedingEntryPrimaryLabel(lastFeed)}
              {getFeedingEntryDetailParts(lastFeed, unitSystem).length > 0 ? ` · ${getFeedingEntryDetailParts(lastFeed, unitSystem).join(" · ")}` : ""}
            </p>
          ) : (
            <p>Edit presets to keep the feeds you use most close.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
