import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { BreastSideButton } from "./BreastSideButton";
import { formatBreastfeedingSummary, getBreastfeedingNextSideReason } from "../../lib/breastfeeding";
import type { BreastSide } from "../../lib/types";

function formatSideLabel(side: BreastSide | null) {
  if (side === "left") return "left";
  if (side === "right") return "right";
  return null;
}

export function BreastfeedQuickTimerCard({
  activeSide,
  isSaving,
  lastUsedSide,
  leftDuration,
  rightDuration,
  suggestedStartSide,
  totalDuration,
  onLogOther,
  onSave,
  onToggleLeft,
  onToggleRight,
}: {
  activeSide: "left" | "right" | null;
  isSaving: boolean;
  lastUsedSide: BreastSide | null;
  leftDuration: number;
  rightDuration: number;
  suggestedStartSide: BreastSide | null;
  totalDuration: number;
  onLogOther: () => void;
  onSave: () => void;
  onToggleLeft: () => void;
  onToggleRight: () => void;
}) {
  const suggestedSideLabel = formatSideLabel(suggestedStartSide);

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
              Quick timer
            </p>
            <p className="mt-1 max-w-[34ch] text-[0.74rem] leading-snug text-[var(--color-text-secondary)] md:text-[0.82rem]">
              Tap a side to start, tap again to pause.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[var(--color-tracker-pill-surface)] px-2.5 py-1 text-[0.66rem] font-semibold text-[var(--color-text-secondary)] md:text-[0.72rem]">
            {totalDuration > 0 ? formatBreastfeedingSummary(totalDuration) : "Ready"}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <BreastSideButton
            side="left"
            isActive={activeSide === "left"}
            isLastUsed={lastUsedSide === "left"}
            durationMs={leftDuration}
            onClick={onToggleLeft}
          />
          <BreastSideButton
            side="right"
            isActive={activeSide === "right"}
            isLastUsed={lastUsedSide === "right"}
            durationMs={rightDuration}
            onClick={onToggleRight}
          />
        </div>

        <div className="mt-6 rounded-[16px] border border-[var(--color-home-card-border)] bg-[var(--color-tracker-panel-surface)] p-3">
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-text)] md:text-[0.7rem]">
            Next suggested side
          </p>
          <p className="mt-1.5 text-[0.9rem] font-semibold text-[var(--color-text)] md:text-[1rem]">
            {activeSide ? `${activeSide === "left" ? "Left" : "Right"} side is running` : suggestedSideLabel ? `Start on ${suggestedSideLabel}` : "Start either side"}
          </p>
          <p className="mt-1 text-[0.68rem] leading-snug text-[var(--color-text-secondary)] md:text-[0.72rem]">
            {getBreastfeedingNextSideReason(lastUsedSide, activeSide)}
          </p>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <Button
            variant="cta"
            className="w-full"
            onClick={onSave}
            disabled={totalDuration < 1000 || isSaving}
          >
            {isSaving ? "Saving..." : "Save session"}
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={onLogOther}
          >
            Log other feed
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
