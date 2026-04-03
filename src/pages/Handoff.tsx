import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/field";
import { PageIntro } from "../components/ui/page-intro";
import { InsetPanel, PageBody, SectionHeading, StatGrid, StatTile } from "../components/ui/page-layout";
import { useToast } from "../components/ui/toast";
import { useChildContext } from "../contexts/ChildContext";
import { useUnits } from "../contexts/UnitsContext";
import { usePoopLogs } from "../hooks/usePoopLogs";
import { useDiaperLogs } from "../hooks/useDiaperLogs";
import { useFeedingLogs } from "../hooks/useFeedingLogs";
import { useAlerts } from "../hooks/useAlerts";
import { useEpisodes } from "../hooks/useEpisodes";
import { useSymptoms } from "../hooks/useSymptoms";
import { useCaregiverNote } from "../hooks/useCaregiverNote";
import { buildChildDailySummary } from "../lib/child-summary";
import { getFeedingEntryDisplayLabel } from "../lib/feeding";
import { buildHandoffSummary, getLastFeedSummary, getLastPoopSummary, getStatusLabel } from "../lib/handoff";
import { getEpisodeEventTypeLabel, getEpisodeTypeLabel } from "../lib/episode-constants";
import { getSymptomSeverityBadgeVariant, getSymptomSeverityLabel, getSymptomTypeLabel } from "../lib/symptom-constants";
import { getChildStatus } from "../lib/tauri";
import { formatDate } from "../lib/utils";
import type { HealthStatus } from "../lib/types";

export function Handoff() {
  const { activeChild } = useChildContext();
  const { unitSystem } = useUnits();
  const { logs, lastRealPoop } = usePoopLogs(activeChild?.id ?? null);
  const { logs: diaperLogs } = useDiaperLogs(activeChild?.id ?? null);
  const { logs: feedingLogs } = useFeedingLogs(activeChild?.id ?? null);
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
    if (!activeChild) {
      setStatus("healthy");
      setNormalDesc("");
      return;
    }

    let cancelled = false;

    getChildStatus(
      activeChild.date_of_birth,
      activeChild.feeding_type,
      lastRealPoop?.logged_at ?? null,
    ).then(([nextStatus, desc]) => {
      if (!cancelled) {
        setStatus(nextStatus);
        setNormalDesc(desc);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeChild, lastRealPoop]);

  if (!activeChild) return null;

  const summary = buildChildDailySummary({
    poopLogs: logs,
    diaperLogs,
    feedingLogs,
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
    unitSystem,
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
    <PageBody>
      <PageIntro
        eyebrow="Caregiver"
        title="Handoff"
        description="A plain-language update for your partner, nanny, grandparent, or daycare handoff."
      />

      <Card>
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <InsetPanel>
          <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-soft)]">Last poop</p>
          <p className="mt-2 text-sm font-medium text-[var(--color-text)]">{getLastPoopSummary(lastRealPoop)}</p>
        </InsetPanel>
        <InsetPanel>
          <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-soft)]">Last feed</p>
          <p className="mt-2 text-sm font-medium text-[var(--color-text)]">{getLastFeedSummary(summary.lastFeed, unitSystem)}</p>
        </InsetPanel>
      </div>

      <StatGrid>
        <StatTile eyebrow="Wet today" value={summary.todayWetDiapers} description="Wet or mixed diapers logged so far." tone="healthy" />
        <StatTile eyebrow="Dirty today" value={summary.todayDirtyDiapers} description="Dirty or mixed diapers logged so far." />
        <StatTile eyebrow="Poops today" value={summary.todayPoops} description="Logged bowel movements so far." />
        <StatTile eyebrow="Feeds today" value={summary.todayFeeds} description="Logged feeds so far." tone="cta" />
        <StatTile eyebrow="No-poop day" value={summary.hasNoPoopDay ? "Yes" : "No"} description="Whether a no-poop day marker was added." tone="info" />
      </StatGrid>

      <Card>
        <CardHeader>
          <SectionHeading
            title="Current concerns"
            description="Alerts, recent symptoms, and the current episode in one scan."
          />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-soft)]">Alerts</p>
            {alerts.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">No active alerts.</p>
            ) : (
              <div className="mt-2 flex flex-col gap-2">
                {summary.visibleAlerts.map((alert) => (
                  <InsetPanel key={alert.id} className="px-3 py-2">
                    <p className="text-sm font-medium text-[var(--color-text)]">{alert.title}</p>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{alert.message}</p>
                  </InsetPanel>
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
                  <InsetPanel key={symptom.id} className="px-3 py-3">
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
                  </InsetPanel>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-[var(--color-border)] pt-3">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-soft)]">Episode</p>
            {!summary.activeEpisode ? (
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">No active episode.</p>
            ) : (
              <InsetPanel className="mt-2 px-3 py-3">
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
              </InsetPanel>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionHeading
            title="Note for next caregiver"
            description="Keep this short and practical so the next handoff is immediate."
          />
        </CardHeader>
        <CardContent>
          <Textarea
            value={handoffNote}
            onChange={(event) => setHandoffNote(event.target.value)}
            placeholder="e.g. Offer more water at lunch, watch for another poop this afternoon."
            rows={4}
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
        <Card>
          <CardHeader>
            <SectionHeading
              title="Most recent feed"
              description="Useful if another caregiver is taking over soon."
            />
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-[var(--color-text)]">{getFeedingEntryDisplayLabel(summary.lastFeed, unitSystem)}</p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{formatDate(summary.lastFeed.logged_at)}</p>
            {summary.lastFeed.reaction_notes && (
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">{summary.lastFeed.reaction_notes}</p>
            )}
          </CardContent>
        </Card>
      )}
    </PageBody>
  );
}
