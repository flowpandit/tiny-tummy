import { useEffect, useState, type FormEvent } from "react";
import { Sheet } from "../ui/sheet";
import { Button } from "../ui/button";
import { DatePicker } from "../ui/date-picker";
import { TimePicker } from "../ui/time-picker";
import { useToast } from "../ui/toast";
import { cn } from "../../lib/cn";
import { MILESTONE_OPTIONS } from "../../lib/milestone-constants";
import { combineLocalDateAndTimeToUtcIso, getCurrentLocalDate, getCurrentLocalTime } from "../../lib/utils";
import * as db from "../../lib/db";
import type { MilestoneType } from "../../lib/types";

interface MilestoneLogSheetProps {
  open: boolean;
  onClose: () => void;
  childId: string;
  onLogged: () => Promise<void> | void;
}

export function MilestoneLogSheet({ open, onClose, childId, onLogged }: MilestoneLogSheetProps) {
  const { showError, showSuccess } = useToast();
  const [milestoneType, setMilestoneType] = useState<MilestoneType>("started_solids");
  const [logDate, setLogDate] = useState(getCurrentLocalDate());
  const [logTime, setLogTime] = useState(getCurrentLocalTime());
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMilestoneType("started_solids");
    setLogDate(getCurrentLocalDate());
    setLogTime(getCurrentLocalTime());
    setNotes("");
    setIsSubmitting(false);
  }, [open]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await db.createMilestoneLog({
        child_id: childId,
        milestone_type: milestoneType,
        logged_at: combineLocalDateAndTimeToUtcIso(logDate, logTime),
        notes: notes.trim() || null,
      });
      await onLogged();
      showSuccess("Milestone saved.");
      onClose();
    } catch {
      showError("Could not save the milestone. Please try again.");
    }
    setIsSubmitting(false);
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <form onSubmit={handleSubmit} className="px-5 pb-8">
        <h2 className="mb-2 text-center font-[var(--font-display)] text-lg font-semibold text-[var(--color-text)]">
          Add milestone
        </h2>
        <p className="mb-5 text-center text-sm text-[var(--color-text-secondary)]">
          Use milestones only when they help explain changes in feeding, sleep, or bowel patterns.
        </p>

        <div className="flex flex-col gap-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">
              Milestone type
            </label>
            <div className="flex flex-col gap-2">
              {MILESTONE_OPTIONS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setMilestoneType(item.value)}
                  className={cn(
                    "rounded-[var(--radius-md)] border px-4 py-3 text-left transition-colors",
                    milestoneType === item.value
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                      : "border-[var(--color-border)] bg-[var(--color-surface)]",
                  )}
                >
                  <p className="text-sm font-medium text-[var(--color-text)]">{item.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">{item.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">When</label>
            <div className="grid grid-cols-2 gap-2">
              <DatePicker value={logDate} onChange={setLogDate} max={getCurrentLocalDate()} />
              <TimePicker value={logTime} onChange={setLogTime} />
            </div>
          </div>

          <div>
            <label htmlFor="milestone-notes" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
              Notes (optional)
            </label>
            <textarea
              id="milestone-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="What changed, what you noticed, or why this might matter for later."
              className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>
        </div>

        <Button type="submit" variant="cta" size="lg" className="mt-6 w-full" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Milestone"}
        </Button>
      </form>
    </Sheet>
  );
}
