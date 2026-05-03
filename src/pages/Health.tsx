import { useMemo, useState } from "react";
import { ScenicHero } from "../components/layout/ScenicHero";
import { EpisodeSheet } from "../components/episodes/EpisodeSheet";
import { SymptomSheet } from "../components/symptoms/SymptomSheet";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { EmptyState, PageBody, StatGrid, StatTile } from "../components/ui/page-layout";
import { HomeActionEpisodeIcon, HomeActionSymptomIcon } from "../components/ui/icons";
import { useActiveChild } from "../contexts/ChildContext";
import { useUnits } from "../contexts/UnitsContext";
import { useEpisodes } from "../hooks/useEpisodes";
import { useSymptoms } from "../hooks/useSymptoms";
import { getEpisodeTypeLabel } from "../lib/episode-constants";
import {
  getSymptomSeverityBadgeVariant,
  getSymptomSeverityLabel,
  getSymptomTypeLabel,
} from "../lib/symptom-constants";
import type { Episode } from "../lib/types";
import { formatTemperatureValue } from "../lib/units";
import { formatDate } from "../lib/utils";

export function Health() {
  const activeChild = useActiveChild();
  const { temperatureUnit } = useUnits();
  const {
    activeEpisode,
    activeEpisodes,
    activeEpisodeEventsById,
    events,
    recentEpisodes,
    refresh: refreshEpisodes,
  } = useEpisodes(activeChild?.id ?? null);
  const { logs: symptomLogs, refresh: refreshSymptoms } = useSymptoms(activeChild?.id ?? null);
  const [symptomSheetOpen, setSymptomSheetOpen] = useState(false);
  const [episodeSheetOpen, setEpisodeSheetOpen] = useState(false);
  const [episodeSheetMode, setEpisodeSheetMode] = useState<"start" | "update">("start");
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null);

  const recentSymptoms = useMemo(() => symptomLogs.slice(0, 6), [symptomLogs]);
  const severeRecentSymptoms = useMemo(
    () => symptomLogs.filter((log) => log.severity === "severe").length,
    [symptomLogs],
  );
  const latestSymptom = symptomLogs[0] ?? null;
  const selectedEpisode = selectedEpisodeId
    ? activeEpisodes.find((episode) => episode.id === selectedEpisodeId) ?? null
    : null;
  const sheetEpisode = episodeSheetMode === "start" ? null : selectedEpisode ?? activeEpisode;
  const sheetEvents = sheetEpisode ? activeEpisodeEventsById[sheetEpisode.id] ?? [] : events;

  if (!activeChild) return null;

  const refreshHealth = async () => {
    await Promise.all([refreshSymptoms(), refreshEpisodes()]);
  };

  const openEpisode = (episode: Episode) => {
    setSelectedEpisodeId(episode.id);
    setEpisodeSheetMode("update");
    setEpisodeSheetOpen(true);
  };

  const startEpisode = () => {
    setSelectedEpisodeId(null);
    setEpisodeSheetMode("start");
    setEpisodeSheetOpen(true);
  };

  return (
    <PageBody className="-mt-8 space-y-0 px-0 py-0">
      <ScenicHero
        child={activeChild}
        title="Health"
        description="Track symptoms, fevers, and health episodes in one doctor-ready timeline."
        action={<Button variant="cta" size="sm" onClick={() => setSymptomSheetOpen(true)}>Log symptom</Button>}
        className="-mx-4 overflow-hidden md:-mx-6 lg:-mx-8"
        showChildInfo={false}
      />

      <div className="space-y-3 px-4 py-3 md:space-y-5 md:px-10 md:py-5">
        <StatGrid>
          <StatTile
            eyebrow="Active"
            value={activeEpisodes.length}
            description={activeEpisodes.length === 1 ? "episode open" : "episodes open"}
            tone={activeEpisodes.length > 0 ? "cta" : "default"}
          />
          <StatTile
            eyebrow="Symptoms"
            value={symptomLogs.length}
            description="recent symptom logs"
            tone="info"
          />
          <StatTile
            eyebrow="Severe"
            value={severeRecentSymptoms}
            description="marked severe"
            tone={severeRecentSymptoms > 0 ? "cta" : "healthy"}
          />
        </StatGrid>

        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
          <button
            type="button"
            onClick={() => setSymptomSheetOpen(true)}
            className="flex min-h-[86px] items-center gap-3 rounded-[18px] border border-[var(--color-home-card-border)] bg-[var(--color-home-card-surface)] px-4 py-3 text-left shadow-[var(--shadow-home-card)] transition-transform hover:-translate-y-0.5"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-info-bg)] text-[var(--color-info)]">
              <HomeActionSymptomIcon className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-[1rem] font-semibold text-[var(--color-text)]">Log symptom</span>
              <span className="mt-1 block text-sm text-[var(--color-text-secondary)]">Fever, cough, appetite, rash, gut signs</span>
            </span>
          </button>

          <button
            type="button"
            onClick={startEpisode}
            className="flex min-h-[86px] items-center gap-3 rounded-[18px] border border-[var(--color-home-card-border)] bg-[var(--color-home-card-surface)] px-4 py-3 text-left shadow-[var(--shadow-home-card)] transition-transform hover:-translate-y-0.5"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-cta)]/12 text-[var(--color-cta)]">
              <HomeActionEpisodeIcon className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-[1rem] font-semibold text-[var(--color-text)]">Start episode</span>
              <span className="mt-1 block text-sm text-[var(--color-text-secondary)]">Track fever, illness, rash, gut issues</span>
            </span>
          </button>
        </div>

        <section>
          <div className="mb-2.5 flex items-center justify-between px-1">
            <h3 className="text-[0.76rem] font-bold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">Active episodes</h3>
            <span className="text-xs font-semibold text-[var(--color-text-soft)]">{activeEpisodes.length}</span>
          </div>

          {activeEpisodes.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={<HomeActionEpisodeIcon className="h-7 w-7 text-[var(--color-text-soft)]" />}
                  title="No active episodes"
                  description="Start one when a fever, illness, rash, or gut issue needs a running timeline."
                  action={<Button variant="secondary" size="sm" onClick={startEpisode}>Start episode</Button>}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 md:gap-3">
              {activeEpisodes.map((episode) => (
                <button
                  key={episode.id}
                  type="button"
                  onClick={() => openEpisode(episode)}
                  className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-left shadow-[var(--shadow-home-card)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[1rem] font-semibold text-[var(--color-text)]">{getEpisodeTypeLabel(episode.episode_type)}</p>
                      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Started {formatDate(episode.started_at)}</p>
                    </div>
                    <Badge variant="caution">active</Badge>
                  </div>
                  {episode.summary && (
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">{episode.summary}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-2.5 flex items-center justify-between px-1">
            <h3 className="text-[0.76rem] font-bold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">Recent symptoms</h3>
            {latestSymptom && <span className="text-xs font-semibold text-[var(--color-text-soft)]">{formatDate(latestSymptom.logged_at)}</span>}
          </div>

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {recentSymptoms.length === 0 ? (
                <EmptyState
                  icon={<HomeActionSymptomIcon className="h-7 w-7 text-[var(--color-text-soft)]" />}
                  title="No symptoms yet"
                  description="Log symptoms here when you want a clear health timeline."
                  action={<Button variant="secondary" size="sm" onClick={() => setSymptomSheetOpen(true)}>Log symptom</Button>}
                />
              ) : (
                recentSymptoms.map((symptom, index) => {
                  const temperatureLabel = symptom.temperature_c !== null
                    ? formatTemperatureValue(symptom.temperature_c, temperatureUnit)
                    : null;

                  return (
                    <div key={symptom.id} className={index > 0 ? "border-t border-[var(--color-border)]" : undefined}>
                      <div className="flex min-h-[64px] items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-[0.95rem] font-semibold text-[var(--color-text)]">{getSymptomTypeLabel(symptom.symptom_type)}</p>
                          <p className="mt-0.5 truncate text-sm text-[var(--color-text-secondary)]">
                            {[temperatureLabel, symptom.notes].filter(Boolean).join(" • ") || formatDate(symptom.logged_at)}
                          </p>
                        </div>
                        <Badge variant={getSymptomSeverityBadgeVariant(symptom.severity)}>
                          {getSymptomSeverityLabel(symptom.severity)}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </section>

        {recentEpisodes.length > activeEpisodes.length && (
          <section>
            <h3 className="mb-2.5 px-1 text-[0.76rem] font-bold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">Recent resolved</h3>
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                {recentEpisodes.filter((episode) => episode.status === "resolved").slice(0, 3).map((episode, index) => (
                  <div key={episode.id} className={index > 0 ? "border-t border-[var(--color-border)]" : undefined}>
                    <div className="flex min-h-[60px] items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-[0.95rem] font-semibold text-[var(--color-text)]">{getEpisodeTypeLabel(episode.episode_type)}</p>
                        <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">Resolved {episode.ended_at ? formatDate(episode.ended_at) : "recently"}</p>
                      </div>
                      <Badge variant="healthy">resolved</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        )}
      </div>

      <SymptomSheet
        open={symptomSheetOpen}
        onClose={() => setSymptomSheetOpen(false)}
        childId={activeChild.id}
        activeEpisode={activeEpisode}
        onLogged={refreshHealth}
      />
      <EpisodeSheet
        open={episodeSheetOpen}
        onClose={() => {
          setEpisodeSheetOpen(false);
          setSelectedEpisodeId(null);
        }}
        childId={activeChild.id}
        activeEpisode={sheetEpisode}
        events={sheetEvents}
        initialMode={episodeSheetMode}
        onUpdated={refreshHealth}
      />
    </PageBody>
  );
}
