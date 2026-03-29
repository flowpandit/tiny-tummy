import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { PageIntro } from "../components/ui/page-intro";
import { useToast } from "../components/ui/toast";
import { useChildContext } from "../contexts/ChildContext";
import { usePoopLogs } from "../hooks/usePoopLogs";
import { useDietLogs } from "../hooks/useDietLogs";
import { useAlerts } from "../hooks/useAlerts";
import { useEpisodes } from "../hooks/useEpisodes";
import { useSymptoms } from "../hooks/useSymptoms";
import { useCaregiverNote } from "../hooks/useCaregiverNote";
import { buildChildDailySummary } from "../lib/child-summary";
import { getDietEntryDisplayLabel } from "../lib/feeding";
import { buildHandoffSummary, getLastFeedSummary, getLastPoopSummary, getStatusLabel } from "../lib/handoff";
import { getEpisodeEventTypeLabel, getEpisodeTypeLabel } from "../lib/episode-constants";
import { getSymptomSeverityBadgeVariant, getSymptomSeverityLabel, getSymptomTypeLabel } from "../lib/symptom-constants";
import { getChildStatus } from "../lib/tauri";
import { formatDate } from "../lib/utils";
import type { HealthStatus } from "../lib/types";

export function Handoff() {
  const navigate = useNavigate();
  const { activeChild } = useChildContext();
  const { logs, lastRealPoop } = usePoopLogs(activeChild?.id ?? null);
  const { logs: dietLogs } = useDietLogs(activeChild?.id ?? null);
  const { alerts } = useAlerts(activeChild?.id ?? null);
  const { activeEpisode, events: episodeEvents } = useEpisodes(activeChild?.id ?? null);
  const { logs: symptomLogs } = useSymptoms(activeChild?.id ?? null);
  const { showError, showSuccess } = useToast();
  const {
    note: handoffNote,
    setNote: setHandoffNote,
    savedNote,
    isSaving,
    hasChanges,
    save: saveHandoffNote,
    reset: resetHandoffNote,
  } = useCaregiverNote(activeChild?.id ?? null);

  const [status, setStatus] = useState<HealthStatus>("healthy");
  const [normalDesc, setNormalDesc] = useState("");

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
  }, [activeChild, lastRealPoop]);

  if (!activeChild) return null;

  const summary = buildChildDailySummary({
    poopLogs: logs,
    dietLogs,
    alerts,
    activeEpisode,
    episodeEvents,
    symptomLogs,
  });

  const summaryText = buildHandoffSummary({
    childName: activeChild.name,
    status,
    normalDescription: normalDesc,
    alerts,
    lastPoop: lastRealPoop,
    lastFeed: summary.lastFeed,
    activeEpisode: summary.activeEpisode,
    latestEpisodeUpdate: summary.latestEpisodeUpdate,
    recentSymptoms: summary.recentSymptoms,
    todayPoops: summary.todayPoops,
    todayFeeds: summary.todayFeeds,
    hasNoPoopDay: summary.hasNoPoopDay,
    handoffNote: savedNote || null,
  });

  const handleSaveNote = async () => {
    try {
      await saveHandoffNote();
      showSuccess("Handoff note saved.");
    } catch {
      showError("Could not save the handoff note.");
    }
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
      <button
        onClick={() => navigate("/settings")}
        className="my-4 flex items-center gap-1 text-sm text-[var(--color-primary)] cursor-pointer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
        </svg>
        Back to Settings
      </button>

      <PageIntro
        eyebrow="Caregiver"
        title="Handoff"
        description="A plain-language update for your partner, nanny, grandparent, or daycare handoff."
      />

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
            Copy or Share Update
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
            <p className="mt-2 text-sm font-medium text-[var(--color-text)]">{getLastFeedSummary(summary.lastFeed)}</p>
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
              <p className="text-xl font-semibold text-[var(--color-text)]">{summary.todayPoops}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Poops</p>
            </div>
            <div className="rounded-[var(--radius-md)] bg-[var(--color-bg)] p-3 text-center">
              <p className="text-xl font-semibold text-[var(--color-text)]">{summary.todayFeeds}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Feeds</p>
            </div>
            <div className="rounded-[var(--radius-md)] bg-[var(--color-bg)] p-3 text-center">
              <p className="text-xl font-semibold text-[var(--color-text)]">{summary.hasNoPoopDay ? "Yes" : "No"}</p>
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
                {summary.visibleAlerts.map((alert) => (
                  <div key={alert.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2">
                    <p className="text-sm font-medium text-[var(--color-text)]">{alert.title}</p>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{alert.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-[var(--color-border)] pt-3">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-soft)]">Symptoms</p>
            {summary.recentSymptoms.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">No recent symptoms logged.</p>
            ) : (
              <div className="mt-2 flex flex-col gap-2">
                {summary.recentSymptoms.map((symptom) => (
                  <div key={symptom.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text)]">
                          {getSymptomTypeLabel(symptom.symptom_type)}
                        </p>
                        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                          {formatDate(symptom.logged_at)}
                        </p>
                      </div>
                      <Badge variant={getSymptomSeverityBadgeVariant(symptom.severity)}>
                        {getSymptomSeverityLabel(symptom.severity)}
                      </Badge>
                    </div>
                    {symptom.notes && (
                      <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                        {symptom.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-[var(--color-border)] pt-3">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-soft)]">Episode</p>
            {!summary.activeEpisode ? (
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">No active episode.</p>
            ) : (
              <div className="mt-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">
                      {getEpisodeTypeLabel(summary.activeEpisode.episode_type)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      Started {formatDate(summary.activeEpisode.started_at)}
                    </p>
                  </div>
                  <Badge variant="info">Active</Badge>
                </div>
                {summary.activeEpisode.summary && (
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                    {summary.activeEpisode.summary}
                  </p>
                )}
                {summary.latestEpisodeUpdate && (
                  <div className="mt-3 border-t border-[var(--color-border)] pt-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-soft)]">Latest update</p>
                    <p className="mt-2 text-sm font-medium text-[var(--color-text)]">
                      {summary.latestEpisodeUpdate.title}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      {getEpisodeEventTypeLabel(summary.latestEpisodeUpdate.event_type)} · {formatDate(summary.latestEpisodeUpdate.logged_at)}
                    </p>
                    {summary.latestEpisodeUpdate.notes && (
                      <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                        {summary.latestEpisodeUpdate.notes}
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
              onClick={resetHandoffNote}
              disabled={!hasChanges}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {summary.lastFeed && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Most Recent Feed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-[var(--color-text)]">{getDietEntryDisplayLabel(summary.lastFeed)}</p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{formatDate(summary.lastFeed.logged_at)}</p>
            {summary.lastFeed.reaction_notes && (
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">{summary.lastFeed.reaction_notes}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
