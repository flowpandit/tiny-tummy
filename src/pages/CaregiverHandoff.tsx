import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CaregiverHandoffPanel } from "../components/handoff/CaregiverHandoffPanel";
import { Button } from "../components/ui/button";
import { PageBody } from "../components/ui/page-layout";
import { useToast } from "../components/ui/toast";
import { useActiveChild } from "../contexts/ChildContext";
import { useCaregiverHandoff } from "../hooks/useCaregiverHandoff";
import { formatHandoffSummaryText } from "../lib/handoff-summary";

function HandoffLoadingState() {
  return (
    <div className="rounded-[22px] border border-[var(--color-home-card-border)] bg-[var(--color-home-card-surface)] px-4 py-5 shadow-[var(--shadow-home-card)] md:rounded-[28px] md:px-6 md:py-6">
      <div className="h-4 w-28 rounded-full bg-[var(--color-home-empty-surface)]" />
      <div className="mt-3 h-8 w-44 rounded-full bg-[var(--color-home-empty-surface)]" />
      <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-[74px] rounded-[16px] bg-[var(--color-home-empty-surface)] md:h-[92px]" />
        ))}
      </div>
      <div className="mt-5 space-y-2">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-14 rounded-[16px] bg-[var(--color-home-empty-surface)]" />
        ))}
      </div>
    </div>
  );
}

export function CaregiverHandoff() {
  const activeChild = useActiveChild();
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const { summary, isLoading, error, refresh } = useCaregiverHandoff(activeChild);
  const [parentNote, setParentNote] = useState("");
  const [isCopying, setIsCopying] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const canUseNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const displaySummary = useMemo(() => {
    if (!summary) return null;
    return {
      ...summary,
      parentNote: parentNote.trim() || null,
    };
  }, [parentNote, summary]);
  const handoffText = useMemo(() => (
    displaySummary ? formatHandoffSummaryText(displaySummary) : ""
  ), [displaySummary]);

  const copyHandoffText = async (showToast = true) => {
    if (!handoffText) return;

    setIsCopying(true);
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard is not available on this device.");
      }
      await navigator.clipboard.writeText(handoffText);
      if (showToast) showSuccess("Caregiver handoff copied.");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      showError(`Could not copy handoff: ${message}`);
    } finally {
      setIsCopying(false);
    }
  };

  const handleCopy = () => {
    void copyHandoffText();
  };

  const handleShare = async () => {
    if (!displaySummary || !handoffText || isSharing) return;

    if (!canUseNativeShare) {
      void copyHandoffText();
      return;
    }

    setIsSharing(true);
    try {
      await navigator.share({
        title: `Tiny Tummy handoff for ${displaySummary.child.name}`,
        text: handoffText,
      });
      showSuccess("Caregiver handoff shared.");
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") {
        return;
      }
      const message = caught instanceof Error ? caught.message : String(caught);
      showError(`Could not share handoff: ${message}`);
    } finally {
      setIsSharing(false);
    }
  };

  if (!activeChild) return null;

  return (
    <PageBody className="space-y-4 px-4 py-3 md:px-10 md:py-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="min-h-10 rounded-full px-1 text-[0.9rem] font-semibold text-[var(--color-home-link)]"
        >
          Back
        </button>
      </div>

      {error && (
        <div className="rounded-[18px] border border-[var(--color-alert)]/25 bg-[var(--color-alert)]/8 px-4 py-3 text-[0.88rem] leading-relaxed text-[var(--color-text)]">
          {error}
        </div>
      )}

      {isLoading && !displaySummary ? (
        <HandoffLoadingState />
      ) : displaySummary ? (
        <CaregiverHandoffPanel
          summary={displaySummary}
          parentNote={parentNote}
          canUseNativeShare={canUseNativeShare}
          isCopying={isCopying}
          isSharing={isSharing}
          onParentNoteChange={setParentNote}
          onCopy={handleCopy}
          onShare={() => { void handleShare(); }}
          onRefresh={() => { void refresh(); }}
        />
      ) : (
        <div className="rounded-[22px] border border-[var(--color-home-card-border)] bg-[var(--color-home-card-surface)] px-4 py-6 text-center shadow-[var(--shadow-home-card)]">
          <p className="text-lg font-semibold text-[var(--color-text)]">Handoff is not ready</p>
          <p className="mx-auto mt-2 max-w-[32ch] text-sm leading-relaxed text-[var(--color-text-secondary)]">
            Tiny Tummy could not prepare the local summary.
          </p>
          <Button type="button" variant="secondary" className="mt-4" onClick={() => { void refresh(); }}>
            Try again
          </Button>
        </div>
      )}
    </PageBody>
  );
}
