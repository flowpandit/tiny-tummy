import type { FormEvent } from "react";
import { Sheet, type SheetVisibilityProps } from "../ui/sheet";
import { Button } from "../ui/button";
import { DatePicker } from "../ui/date-picker";
import { TimePicker } from "../ui/time-picker";
import { FieldLabel, Textarea } from "../ui/field";
import { SegmentedControl } from "../ui/segmented-control";
import { useToast } from "../ui/toast";
import { useSleepLogSheetState } from "../../hooks/useSleepLogSheetState";
import { cn } from "../../lib/cn";
import type { SleepType } from "../../lib/types";
import {
  formatSleepTimerClock,
} from "../../lib/sleep-timer";
import { getCurrentLocalDate } from "../../lib/utils";

interface SleepLogSheetProps extends SheetVisibilityProps {
  childId: string;
  initialMode?: "manual" | "timer";
  initialSleepType?: SleepType;
  onLogged: () => Promise<void> | void;
}

const SLEEP_TYPES: Array<{ value: SleepType; label: string; description: string }> = [
  { value: "nap", label: "Nap", description: "Daytime sleep or shorter rest." },
  { value: "night", label: "Night", description: "Overnight sleep block." },
];

export function SleepLogSheet({
  open,
  onClose,
  childId,
  initialMode = "manual",
  initialSleepType = "nap",
  onLogged,
}: SleepLogSheetProps) {
  const { showError, showSuccess } = useToast();
  const {
    mode,
    setMode,
    sleepType,
    setSleepType,
    startDate,
    setStartDate,
    startTime,
    setStartTime,
    endDate,
    setEndDate,
    endTime,
    setEndTime,
    notes,
    setNotes,
    timerSession,
    timerElapsedMs,
    isSubmitting,
    handleStartTimer,
    handleStopAndSaveTimer,
    handleCancelTimer,
    handleSaveManual,
    handleTimerNotesChange,
  } = useSleepLogSheetState({
    open,
    childId,
    initialMode,
    initialSleepType,
    onLogged,
    onClose,
    onError: showError,
    onSuccess: showSuccess,
  });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (mode === "timer") {
      await handleStopAndSaveTimer();
      return;
    }
    await handleSaveManual();
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <form onSubmit={handleSubmit} className="px-5 pb-8">
        <h2 className="mb-2 text-center text-lg font-semibold text-[var(--color-text)]">
          Add sleep log
        </h2>
        <p className="mb-5 text-center text-sm text-[var(--color-text-secondary)]">
          Keep it light: nap or night, start and end, optional note.
        </p>

        <div className="flex flex-col gap-5">
          <div>
            <FieldLabel>Entry mode</FieldLabel>
            <SegmentedControl
              value={mode}
              onChange={(value) => {
                if (timerSession) {
                  setMode("timer");
                  return;
                }
                setMode(value);
              }}
              options={[
                { value: "timer", label: "Timer" },
                { value: "manual", label: "Manual" },
              ]}
              gridClassName="grid-cols-2"
            />
          </div>

          <div>
            <FieldLabel>Sleep type</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              {SLEEP_TYPES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setSleepType(item.value)}
                  disabled={Boolean(timerSession)}
                  className={cn(
                    "rounded-[var(--radius-md)] border px-4 py-3 text-left transition-colors",
                    timerSession && "cursor-not-allowed opacity-60",
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

          {mode === "timer" ? (
            <>
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-5 text-center">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">
                  {timerSession ? `${timerSession.sleepType === "night" ? "Night" : "Nap"} timer running` : "Sleep timer"}
                </p>
                <p className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-[var(--color-text)]">
                  {formatSleepTimerClock(timerElapsedMs)}
                </p>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                  {timerSession
                    ? `Started ${new Date(timerSession.startedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`
                    : "Start the timer when baby falls asleep, then stop it when they wake up."}
                </p>
              </div>

              <div>
                <FieldLabel htmlFor="sleep-timer-notes">Notes (optional)</FieldLabel>
                <Textarea
                  id="sleep-timer-notes"
                  rows={3}
                  value={notes}
                  onChange={(event) => {
                    void handleTimerNotesChange(event.target.value);
                  }}
                  placeholder="Car nap, contact nap, woke once, easy settle, or any lightweight context."
                />
              </div>

              {timerSession ? (
                <div className="flex gap-3">
                  <Button type="submit" variant="cta" size="lg" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Stop & Save"}
                  </Button>
                  <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={() => { void handleCancelTimer(); }}>
                    Cancel timer
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="cta" size="lg" className="w-full" onClick={() => { void handleStartTimer(); }}>
                  Start Sleep Timer
                </Button>
              )}
            </>
          ) : (
            <>
              <div>
                <FieldLabel>Start</FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  <DatePicker value={startDate} onChange={setStartDate} max={getCurrentLocalDate()} />
                  <TimePicker value={startTime} onChange={setStartTime} />
                </div>
              </div>

              <div>
                <FieldLabel>End</FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  <DatePicker value={endDate} onChange={setEndDate} max={getCurrentLocalDate()} />
                  <TimePicker value={endTime} onChange={setEndTime} />
                </div>
              </div>

              <div>
                <FieldLabel htmlFor="sleep-notes">Notes (optional)</FieldLabel>
                <Textarea
                  id="sleep-notes"
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Woke once, car nap, very unsettled, easy bedtime, or any lightweight context."
                />
              </div>
            </>
          )}
        </div>

        {mode === "manual" && (
          <Button type="submit" variant="cta" size="lg" className="mt-6 w-full" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Sleep Log"}
          </Button>
        )}
      </form>
    </Sheet>
  );
}
