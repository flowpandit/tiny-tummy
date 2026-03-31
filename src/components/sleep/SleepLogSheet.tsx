import { useEffect, useState, type FormEvent } from "react";
import { Sheet } from "../ui/sheet";
import { Button } from "../ui/button";
import { DatePicker } from "../ui/date-picker";
import { TimePicker } from "../ui/time-picker";
import { FieldLabel, Textarea } from "../ui/field";
import { SegmentedControl } from "../ui/segmented-control";
import { useToast } from "../ui/toast";
import { cn } from "../../lib/cn";
import * as db from "../../lib/db";
import type { SleepType } from "../../lib/types";
import {
  formatSleepTimerClock,
  getLocalTimestamp,
  getSleepTimerElapsedMs,
  getSleepTimerSettingKey,
  parseSleepTimerSession,
  type SleepTimerSession,
} from "../../lib/sleep-timer";

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
  const [mode, setMode] = useState<"manual" | "timer">("manual");
  const [sleepType, setSleepType] = useState<SleepType>("nap");
  const [startDate, setStartDate] = useState(getCurrentDate());
  const [startTime, setStartTime] = useState(getCurrentTime());
  const [endDate, setEndDate] = useState(getCurrentDate());
  const [endTime, setEndTime] = useState(getDefaultEndTime());
  const [notes, setNotes] = useState("");
  const [timerSession, setTimerSession] = useState<SleepTimerSession | null>(null);
  const [tick, setTick] = useState(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    db.getSetting(getSleepTimerSettingKey(childId))
      .then((raw) => {
        if (cancelled) return;
        const session = parseSleepTimerSession(raw);
        setTimerSession(session);
        setMode(session ? "timer" : "manual");
        setSleepType(session?.sleepType ?? "nap");
        setStartDate(getCurrentDate());
        setStartTime(getCurrentTime());
        setEndDate(getCurrentDate());
        setEndTime(getDefaultEndTime());
        setNotes(session?.notes ?? "");
        setTick(Date.now());
        setIsSubmitting(false);
      })
      .catch(() => {
        if (cancelled) return;
        setTimerSession(null);
        setMode("manual");
        setSleepType("nap");
        setStartDate(getCurrentDate());
        setStartTime(getCurrentTime());
        setEndDate(getCurrentDate());
        setEndTime(getDefaultEndTime());
        setNotes("");
        setTick(Date.now());
        setIsSubmitting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !timerSession) return;
    const interval = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [open, timerSession]);

  useEffect(() => {
    if (!open) return;

    const refreshTick = () => setTick(Date.now());
    window.addEventListener("focus", refreshTick);
    document.addEventListener("visibilitychange", refreshTick);
    return () => {
      window.removeEventListener("focus", refreshTick);
      document.removeEventListener("visibilitychange", refreshTick);
    };
  }, [open]);

  const persistTimerSession = async (session: SleepTimerSession | null) => {
    await db.setSetting(getSleepTimerSettingKey(childId), session ? JSON.stringify(session) : "");
  };

  const handleStartTimer = async () => {
    const nextSession: SleepTimerSession = {
      sleepType,
      startedAt: getLocalTimestamp(),
      notes,
    };

    setTimerSession(nextSession);
    setTick(Date.now());
    await persistTimerSession(nextSession);
  };

  const handleStopAndSaveTimer = async () => {
    if (!timerSession || isSubmitting) return;

    const endedAt = getLocalTimestamp();
    if (new Date(endedAt).getTime() <= new Date(timerSession.startedAt).getTime()) {
      showError("Sleep timer needs to run for a little longer before saving.");
      return;
    }

    setIsSubmitting(true);
    try {
      await db.createSleepLog({
        child_id: childId,
        sleep_type: timerSession.sleepType,
        started_at: timerSession.startedAt,
        ended_at: endedAt,
        notes: timerSession.notes.trim() || null,
      });
      await persistTimerSession(null);
      setTimerSession(null);
      setNotes("");
      await onLogged();
      showSuccess("Sleep entry saved.");
      onClose();
    } catch {
      showError("Could not save the sleep entry. Please try again.");
    }
    setIsSubmitting(false);
  };

  const handleCancelTimer = async () => {
    await persistTimerSession(null);
    setTimerSession(null);
    setNotes("");
    setMode("manual");
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (mode === "timer") {
      await handleStopAndSaveTimer();
      return;
    }

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

  const handleTimerNotesChange = async (value: string) => {
    setNotes(value);
    if (!timerSession) return;
    const nextSession = { ...timerSession, notes: value };
    setTimerSession(nextSession);
    await persistTimerSession(nextSession);
  };

  const timerElapsedMs = timerSession ? getSleepTimerElapsedMs(timerSession, tick) : 0;

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
                <p className="mt-3 font-[var(--font-display)] text-4xl font-semibold tracking-[-0.04em] text-[var(--color-text)]">
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
                  <DatePicker value={startDate} onChange={setStartDate} max={getCurrentDate()} />
                  <TimePicker value={startTime} onChange={setStartTime} />
                </div>
              </div>

              <div>
                <FieldLabel>End</FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  <DatePicker value={endDate} onChange={setEndDate} />
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
