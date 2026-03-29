import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { useToast } from "../components/ui/toast";
import { useChildContext } from "../contexts/ChildContext";
import { usePoopLogs } from "../hooks/usePoopLogs";
import { useDietLogs } from "../hooks/useDietLogs";
import { useAlerts } from "../hooks/useAlerts";
import { useEpisodes } from "../hooks/useEpisodes";
import { getDietEntryDisplayLabel } from "../lib/feeding";
import { buildHandoffSummary, getLastFeedSummary, getLastPoopSummary, getStatusLabel } from "../lib/handoff";
import { getEpisodeEventTypeLabel, getEpisodeTypeLabel } from "../lib/episode-constants";
import { getChildStatus } from "../lib/tauri";
import { formatDate } from "../lib/utils";
import * as db from "../lib/db";
import type { HealthStatus } from "../lib/types";

function todayKey(): string {
  return new Date().toISOString().split("T")[0];
}

export function Handoff() {
  const { activeChild } = useChildContext();
  const { logs, lastRealPoop } = usePoopLogs(activeChild?.id ?? null);
  const { logs: dietLogs } = useDietLogs(activeChild?.id ?? null);
  const { alerts } = useAlerts(activeChild?.id ?? null);
  const { activeEpisode, events: episodeEvents } = useEpisodes(activeChild?.id ?? null);
  const { showError, showSuccess } = useToast();

  const [status, setStatus] = useState<HealthStatus>("healthy");
  const [normalDesc, setNormalDesc] = useState("");
  const [handoffNote, setHandoffNote] = useState("");
  const [savedNote, setSavedNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!activeChild) return;

    getChildStatus(
      activeChild.date_of_birth,
      activeChild.feeding_type,
      lastRealPoop?.logged_at ?? null,
    ).then(([nextStatus, desc]) => {
      setStatus(nextStatus);
      setNormalDesc(desc);
    });

    db.getSetting(`handoff_note:${activeChild.id}`).then((value) => {
      const note = value ?? "";
      setHandoffNote(note);
      setSavedNote(note);
    });
  }, [activeChild, lastRealPoop]);

  if (!activeChild) return null;

  const latestFeed = dietLogs[0] ?? null;
  const latestEpisodeUpdate = episodeEvents[0] ?? null;
  const currentDay = todayKey();
  const todayPoops = logs.filter((log) => log.logged_at.startsWith(currentDay) && log.is_no_poop === 0).length;
  const todayFeeds = dietLogs.filter((log) => log.logged_at.startsWith(currentDay)).length;
  const hasNoPoopDay = logs.some((log) => log.logged_at.startsWith(currentDay) && log.is_no_poop === 1);

  const summaryText = buildHandoffSummary({
    childName: activeChild.name,
    status,
    normalDescription: normalDesc,
    alerts,
    lastPoop: lastRealPoop,
    lastFeed: latestFeed,
    activeEpisode,
    latestEpisodeUpdate,
    todayPoops,
    todayFeeds,
    hasNoPoopDay,
    handoffNote: savedNote || null,
  });

  const handleSaveNote = async () => {
    setIsSaving(true);
    await db.setSetting(`handoff_note:${activeChild.id}`, handoffNote.trim());
    setSavedNote(handoffNote.trim());
    setIsSaving(false);
    showSuccess("Handoff note saved.");
  };

  const handleShare = async () => {
    try {
      if ("share" in navigator && typeof navigator.share === "function") {
        await navigator.share({
          title: `${activeChild.name} handoff`,
          text: summaryText,
        });
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(summaryText);
        showSuccess("Handoff summary copied.");
        return;
      }

      showError("Sharing is not available on this device.");
    } catch {
      showError("Could not share the handoff summary.");
    }
  };

  return (
    <div className="px-4 py-5">
      <div className="my-5 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)] backdrop-blur-xl">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Caregiver</p>
        <h2 className="mt-2 font-[var(--font-display)] text-3xl font-semibold text-[var(--color-text)]">
          Handoff
        </h2>
        <p className="mt-3 text-base leading-relaxed text-[var(--color-text-secondary)]">
          A quick summary for your partner, nanny, grandparent, or daycare handoff.
        </p>
      </div>

      <Card className="mb-4">
        <CardContent className="py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">{activeChild.name}</p>
              <p className="mt-1 text-xs text-[var(--color-text-soft)]">{getStatusLabel(status)}</p>
            </div>
            <Badge variant={status === "healthy" ? "healthy" : status === "caution" ? "caution" : "alert"}>
              {status === "healthy" ? "Normal" : status === "caution" ? "Watch" : "Attention"}
            </Badge>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">{normalDesc}</p>
          <Button variant="cta" className="mt-4 w-full" onClick={handleShare}>
            Copy or Share Handoff
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-soft)]">Last poop</p>
            <p className="mt-2 text-sm font-medium text-[var(--color-text)]">{getLastPoopSummary(lastRealPoop)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-soft)]">Last feed</p>
            <p className="mt-2 text-sm font-medium text-[var(--color-text)]">{getLastFeedSummary(latestFeed)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-[var(--radius-md)] bg-[var(--color-bg)] p-3 text-center">
              <p className="text-xl font-semibold text-[var(--color-text)]">{todayPoops}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Poops</p>
            </div>
            <div className="rounded-[var(--radius-md)] bg-[var(--color-bg)] p-3 text-center">
              <p className="text-xl font-semibold text-[var(--color-text)]">{todayFeeds}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Feeds</p>
            </div>
            <div className="rounded-[var(--radius-md)] bg-[var(--color-bg)] p-3 text-center">
              <p className="text-xl font-semibold text-[var(--color-text)]">{hasNoPoopDay ? "Yes" : "No"}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">No-poop day</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Current Concerns</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-soft)]">Alerts</p>
            {alerts.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">No active alerts.</p>
            ) : (
              <div className="mt-2 flex flex-col gap-2">
                {alerts.slice(0, 3).map((alert) => (
                  <div key={alert.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2">
                    <p className="text-sm font-medium text-[var(--color-text)]">{alert.title}</p>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{alert.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-[var(--color-border)] pt-3">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-soft)]">Episode</p>
            {!activeEpisode ? (
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">No active episode.</p>
            ) : (
              <div className="mt-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">
                      {getEpisodeTypeLabel(activeEpisode.episode_type)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      Started {formatDate(activeEpisode.started_at)}
                    </p>
                  </div>
                  <Badge variant="info">Active</Badge>
                </div>
                {activeEpisode.summary && (
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                    {activeEpisode.summary}
                  </p>
                )}
                {latestEpisodeUpdate && (
                  <div className="mt-3 border-t border-[var(--color-border)] pt-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-soft)]">Latest update</p>
                    <p className="mt-2 text-sm font-medium text-[var(--color-text)]">
                      {latestEpisodeUpdate.title}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      {getEpisodeEventTypeLabel(latestEpisodeUpdate.event_type)} · {formatDate(latestEpisodeUpdate.logged_at)}
                    </p>
                    {latestEpisodeUpdate.notes && (
                      <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                        {latestEpisodeUpdate.notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Note For Next Caregiver</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={handoffNote}
            onChange={(event) => setHandoffNote(event.target.value)}
            placeholder="e.g. Offer more water at lunch, watch for another poop this afternoon."
            rows={4}
            className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
          <div className="mt-3 flex gap-3">
            <Button variant="primary" className="flex-1" onClick={handleSaveNote} disabled={isSaving || handoffNote.trim() === savedNote.trim()}>
              {isSaving ? "Saving..." : "Save Note"}
            </Button>
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => setHandoffNote(savedNote)}
              disabled={handoffNote === savedNote}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {latestFeed && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Most Recent Feed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-[var(--color-text)]">{getDietEntryDisplayLabel(latestFeed)}</p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{formatDate(latestFeed.logged_at)}</p>
            {latestFeed.reaction_notes && (
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">{latestFeed.reaction_notes}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
