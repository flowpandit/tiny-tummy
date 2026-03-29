import { useEffect, useState, type FormEvent } from "react";
import { Sheet } from "../ui/sheet";
import { Button } from "../ui/button";
import { DatePicker } from "../ui/date-picker";
import { TimePicker } from "../ui/time-picker";
import { useToast } from "../ui/toast";
import { cn } from "../../lib/cn";
import * as db from "../../lib/db";
import type { SleepType } from "../../lib/types";

interface SleepLogSheetProps {
  open: boolean;
  onClose: () => void;
  childId: string;
  onLogged: () => Promise<void> | void;
}

const SLEEP_TYPES: Array<{ value: SleepType; label: string; description: string }> = [
  { value: "nap", label: "Nap", description: "Daytime sleep or shorter rest." },
  { value: "night", label: "Night", description: "Overnight sleep block." },
];

function getCurrentDate(): string {
  return new Date().toISOString().split("T")[0];
}

function getCurrentTime(): string {
  return new Date().toTimeString().slice(0, 5);
}

function combineToISO(date: string, time: string): string {
  return `${date}T${time}:00`;
}

function getDefaultEndTime(): string {
  const date = new Date();
  date.setHours(date.getHours() + 1);
  return date.toTimeString().slice(0, 5);
}

export function SleepLogSheet({ open, onClose, childId, onLogged }: SleepLogSheetProps) {
  const { showError, showSuccess } = useToast();
  const [sleepType, setSleepType] = useState<SleepType>("nap");
  const [startDate, setStartDate] = useState(getCurrentDate());
  const [startTime, setStartTime] = useState(getCurrentTime());
  const [endDate, setEndDate] = useState(getCurrentDate());
  const [endTime, setEndTime] = useState(getDefaultEndTime());
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSleepType("nap");
    setStartDate(getCurrentDate());
    setStartTime(getCurrentTime());
    setEndDate(getCurrentDate());
    setEndTime(getDefaultEndTime());
    setNotes("");
    setIsSubmitting(false);
  }, [open]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    const startedAt = combineToISO(startDate, startTime);
    const endedAt = combineToISO(endDate, endTime);

    if (new Date(endedAt).getTime() <= new Date(startedAt).getTime()) {
      showError("End time needs to be after the start time.");
      return;
    }

    setIsSubmitting(true);
    try {
      await db.createSleepLog({
        child_id: childId,
        sleep_type: sleepType,
        started_at: startedAt,
        ended_at: endedAt,
        notes: notes.trim() || null,
      });
      await onLogged();
      showSuccess("Sleep entry saved.");
      onClose();
    } catch {
      showError("Could not save the sleep entry. Please try again.");
    }
    setIsSubmitting(false);
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <form onSubmit={handleSubmit} className="px-5 pb-8">
        <h2 className="mb-2 text-center font-[var(--font-display)] text-lg font-semibold text-[var(--color-text)]">
          Add sleep log
        </h2>
        <p className="mb-5 text-center text-sm text-[var(--color-text-secondary)]">
          Keep it light: nap or night, start and end, optional note.
        </p>

        <div className="flex flex-col gap-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">
              Sleep type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SLEEP_TYPES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setSleepType(item.value)}
                  className={cn(
                    "rounded-[var(--radius-md)] border px-4 py-3 text-left transition-colors",
                    sleepType === item.value
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                      : "border-[var(--color-border)] bg-[var(--color-surface)]",
                  )}
                >
                  <p className="text-sm font-medium text-[var(--color-text)]">{item.label}</p>
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{item.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Start</label>
            <div className="grid grid-cols-2 gap-2">
              <DatePicker value={startDate} onChange={setStartDate} max={getCurrentDate()} />
              <TimePicker value={startTime} onChange={setStartTime} />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">End</label>
            <div className="grid grid-cols-2 gap-2">
              <DatePicker value={endDate} onChange={setEndDate} />
              <TimePicker value={endTime} onChange={setEndTime} />
            </div>
          </div>

          <div>
            <label htmlFor="sleep-notes" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
              Notes (optional)
            </label>
            <textarea
              id="sleep-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Woke once, car nap, very unsettled, easy bedtime, or any lightweight context."
              className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>
        </div>

        <Button type="submit" variant="cta" size="lg" className="mt-6 w-full" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Sleep Log"}
        </Button>
      </form>
    </Sheet>
  );
}
