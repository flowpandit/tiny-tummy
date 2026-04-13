import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BreastSideButton } from "../components/breastfeed/BreastSideButton";
import { BreastfeedPatternCard } from "../components/breastfeed/BreastfeedPatternCard";
import { BreastfeedRecentHistorySection } from "../components/breastfeed/BreastfeedRecentHistorySection";
import { Button } from "../components/ui/button";
import { CareToolsSection } from "../components/care/CareToolsSection";
import { ScenicHero } from "../components/layout/ScenicHero";
import { InsetPanel, PageBody } from "../components/ui/page-layout";
import { TrackerMetricRing } from "../components/tracking/TrackerPrimitives";
import { DietLogForm } from "../components/logging/DietLogForm";
import { useToast } from "../components/ui/toast";
import { useChildContext } from "../contexts/ChildContext";
import { useBreastfeedingTimerState } from "../hooks/useBreastfeedingTimerState";
import { useChildWorkflowActions } from "../hooks/useChildWorkflowActions";
import { getDurationRingDisplay } from "../lib/breastfeed-insights";
import type { FeedingLogDraft } from "../lib/types";

export function Breastfeed() {
  const navigate = useNavigate();
  const { activeChild, refreshChildren } = useChildContext();
  const { showError, showSuccess } = useToast();
  const { runPostLogActions } = useChildWorkflowActions(activeChild);
  const [selectedPatternLogId, setSelectedPatternLogId] = useState<string | null>(null);
  const [showTransitionConfirm, setShowTransitionConfirm] = useState(false);
  const [feedingFormOpen, setFeedingFormOpen] = useState(false);
  const [feedingDraft, setFeedingDraft] = useState<Partial<FeedingLogDraft> | null>(null);
  const supportsBreastfeeding = activeChild?.feeding_type === "breast" || activeChild?.feeding_type === "mixed";
  const patternSectionRef = useRef<HTMLDivElement | null>(null);
  const {
    activeSide,
    canShowSolidTransition,
    displayRecentHistory,
    handleConfirmSolidTransition,
    handleFeedLogged,
    handlePause,
    handleSave,
    handleStartSide,
    isSaving,
    isTransitioningToMixed,
    lastUsedSide,
    leftDuration,
    patternLogs,
    rightDuration,
    suggestedStartSide,
    totalDuration,
  } = useBreastfeedingTimerState({
    activeChild,
    refreshChildren,
    runPostLogActions,
    onError: showError,
    onSuccess: showSuccess,
  });

  useEffect(() => {
    if (!selectedPatternLogId) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!patternSectionRef.current?.contains(event.target as Node)) {
        setSelectedPatternLogId(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [selectedPatternLogId]);
  const selectedPatternLog = useMemo(
    () => patternLogs.find((log) => log.id === selectedPatternLogId) ?? null,
    [patternLogs, selectedPatternLogId],
  );

  if (!activeChild) return null;

  const openFeedingForm = (draft?: Partial<FeedingLogDraft> | null) => {
    setFeedingDraft(draft ?? null);
    setFeedingFormOpen(true);
  };

  const currentSessionRing = getDurationRingDisplay(totalDuration, "var(--gradient-status-caution)");
  const leftRing = getDurationRingDisplay(leftDuration, "var(--gradient-status-healthy)");
  const rightRing = getDurationRingDisplay(rightDuration, "var(--gradient-status-head)");

  return (
    <PageBody className="mt-0 space-y-0 px-0 py-0">
      {showTransitionConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 px-4 pb-[calc(var(--safe-area-bottom)+108px)] pt-10" onClick={() => setShowTransitionConfirm(false)}>
          <div
            className="w-full max-w-[420px] rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-5 shadow-[var(--shadow-lg)]"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="solid-transition-title"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-text-secondary)]">
              Solids transition
            </p>
            <h2 id="solid-transition-title" className="mt-2 text-xl font-semibold text-[var(--color-text)]">
              Switch to mixed feeding?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              Switch this child to mixed feeding once they are having both breastfeeds and other foods. The Feed page will let you log
              breastfeeding alongside solids, bottles, and other feeds.
            </p>
            <div className="mt-5 flex gap-3">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setShowTransitionConfirm(false)}
                disabled={isTransitioningToMixed}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                className="flex-1"
                onClick={() => {
                  void handleConfirmSolidTransition().then((didSwitch) => {
                    if (!didSwitch) return;
                    setShowTransitionConfirm(false);
                    navigate("/feed", { replace: true });
                  });
                }}
                disabled={isTransitioningToMixed}
              >
                {isTransitioningToMixed ? "Switching..." : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
      <ScenicHero
        child={activeChild}
        title="Breastfeed"
        description="Tap left or right to start. Switching sides pauses the other side."
        action={(
          <Button variant="cta" size="sm" onClick={handleSave} disabled={totalDuration < 1000 || isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        )}
        className="-mx-4 overflow-hidden md:-mx-6 lg:-mx-8"
        scene="breastfeed"
      />

      <div className="space-y-4 px-4 py-5 md:px-6 lg:px-8">
        {!supportsBreastfeeding ? (
          <InsetPanel>
            <p className="text-sm font-medium text-[var(--color-text)]">Breastfeeding timer is hidden for this child profile.</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              Change the feeding type in Settings if this child is breastfed or mixed fed.
            </p>
          </InsetPanel>
        ) : (
          <>
            <div className="-mt-32 relative z-10 grid grid-cols-3 gap-3 px-4 pt-4">
              <TrackerMetricRing
                value={leftRing.value}
                unit={leftRing.unit}
                label="Left total"
                gradient={leftRing.gradient}
              />
              <TrackerMetricRing
                value={currentSessionRing.value}
                unit={currentSessionRing.unit}
                label="Current session"
                gradient={currentSessionRing.gradient}
              />
              <TrackerMetricRing
                value={rightRing.value}
                unit={rightRing.unit}
                label="Right total"
                gradient={rightRing.gradient}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <BreastSideButton
                side="left"
                isActive={activeSide === "left"}
                isLastUsed={lastUsedSide === "left"}
                durationMs={leftDuration}
                onClick={() => { void (activeSide === "left" ? handlePause() : handleStartSide("left")); }}
              />
              <BreastSideButton
                side="right"
                isActive={activeSide === "right"}
                isLastUsed={lastUsedSide === "right"}
                durationMs={rightDuration}
                onClick={() => { void (activeSide === "right" ? handlePause() : handleStartSide("right")); }}
              />
            </div>

            <InsetPanel className="space-y-4">
              {lastUsedSide && !activeSide && (
                <div className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-bg-elevated)]/72 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-soft)]">Next suggested side</p>
                  <p className="mt-2 text-sm font-medium text-[var(--color-text)]">
                    Start on the {suggestedStartSide} side.
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                    Last feed finished on the {lastUsedSide} side, so the {suggestedStartSide} side should be fuller.
                  </p>
                </div>
              )}
              <Button
                variant="cta"
                className="w-full"
                onClick={handleSave}
                disabled={totalDuration < 1000 || isSaving}
              >
                {isSaving ? "Saving..." : "Save breastfeeding session"}
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => openFeedingForm()}
              >
                Log bottle, formula, or other feed
              </Button>
            </InsetPanel>

            {displayRecentHistory.length > 0 && <BreastfeedRecentHistorySection logs={displayRecentHistory} />}

            <div ref={patternSectionRef}>
              <BreastfeedPatternCard
                patternLogs={patternLogs}
                selectedPatternLog={selectedPatternLog}
                onToggleLog={(logId) => setSelectedPatternLogId((current) => (current === logId ? null : logId))}
              />
            </div>

            {canShowSolidTransition && (
              <section className="px-1">
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => setShowTransitionConfirm(true)}
                >
                  Start solids transition
                </Button>
              </section>
            )}

            <CareToolsSection className="px-1" />
          </>
        )}
      </div>
      <DietLogForm
        open={feedingFormOpen}
        onClose={() => {
          setFeedingFormOpen(false);
          setFeedingDraft(null);
        }}
        childId={activeChild.id}
        initialDraft={feedingDraft}
        onLogged={() => void handleFeedLogged()}
      />
    </PageBody>
  );
}
