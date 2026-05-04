import { useEffect, useMemo, useState } from "react";
import { ScenicHero } from "../components/layout/ScenicHero";
import { EpisodeSheet } from "../components/episodes/EpisodeSheet";
import { SymptomSheet } from "../components/symptoms/SymptomSheet";
import { Button } from "../components/ui/button";
import { PageBody } from "../components/ui/page-layout";
import {
  HealthActiveEpisodeCard,
  HealthInsightCard,
  HealthQuickActionsCard,
  HealthRecentHistoryCard,
  HealthRecentSymptomsCard,
  HealthSummaryStats,
} from "../components/health/HealthPageSections";
import { useActiveChild } from "../contexts/ChildContext";
import { useUnits } from "../contexts/UnitsContext";
import { useEpisodes } from "../hooks/useEpisodes";
import { useSymptoms } from "../hooks/useSymptoms";
import { buildHealthInsight, buildHealthTimeline } from "../lib/health-view-model";
import type { Episode } from "../lib/types";

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

  const recentSymptoms = useMemo(() => symptomLogs.slice(0, 3), [symptomLogs]);
  const severeRecentSymptoms = useMemo(
    () => symptomLogs.filter((log) => log.severity === "severe").length,
    [symptomLogs],
  );
  const activeHealthEpisode = activeEpisode ?? activeEpisodes[0] ?? null;
  const activeEpisodeSymptoms = useMemo(
    () => activeHealthEpisode
      ? symptomLogs.filter((log) => log.episode_id === activeHealthEpisode.id).slice(0, 3)
      : [],
    [activeHealthEpisode, symptomLogs],
  );
  const healthHistory = useMemo(
    () => buildHealthTimeline({
      episodes: recentEpisodes,
      episodeEvents: events,
      symptomLogs,
      temperatureUnit,
      limit: 4,
    }),
    [events, recentEpisodes, symptomLogs, temperatureUnit],
  );
  const healthInsight = useMemo(
    () => buildHealthInsight({
      symptomLogs,
      activeEpisodes,
      temperatureUnit,
    }),
    [activeEpisodes, symptomLogs, temperatureUnit],
  );
  const selectedEpisode = selectedEpisodeId
    ? activeEpisodes.find((episode) => episode.id === selectedEpisodeId) ?? null
    : null;
  const sheetEpisode = episodeSheetMode === "start" ? null : selectedEpisode ?? activeEpisode;
  const sheetEvents = sheetEpisode ? activeEpisodeEventsById[sheetEpisode.id] ?? [] : events;

  useEffect(() => {
    setSymptomSheetOpen(false);
    setEpisodeSheetOpen(false);
    setSelectedEpisodeId(null);
  }, [activeChild?.id]);

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
        description="Track symptoms, fevers, and episodes in one place."
        action={<Button variant="cta" size="sm" onClick={() => setSymptomSheetOpen(true)}>Add</Button>}
        className="-mx-4 overflow-hidden md:-mx-6 lg:-mx-8"
        showChildInfo={false}
      />

      <div className="px-4 md:px-10">
        <HealthSummaryStats
          className="-mt-36 md:-mt-32"
          activeEpisodeCount={activeEpisodes.length}
          recentSymptomCount={recentSymptoms.length}
          severeMarkerCount={severeRecentSymptoms}
        />
      </div>

      <div className="space-y-3 px-4 py-3 md:space-y-5 md:px-10 md:py-5">
        <HealthQuickActionsCard
          onLogSymptom={() => setSymptomSheetOpen(true)}
          onStartEpisode={startEpisode}
        />

        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
          <HealthActiveEpisodeCard
            episode={activeHealthEpisode}
            linkedSymptoms={activeEpisodeSymptoms}
            onOpenEpisode={openEpisode}
            onStartEpisode={startEpisode}
          />
          <HealthRecentSymptomsCard
            symptoms={recentSymptoms}
            temperatureUnit={temperatureUnit}
            onLogSymptom={() => setSymptomSheetOpen(true)}
          />
        </div>

        <HealthInsightCard
          insight={healthInsight}
          onLogSymptom={() => setSymptomSheetOpen(true)}
          onStartEpisode={startEpisode}
        />

        <HealthRecentHistoryCard items={healthHistory} />
      </div>

      <SymptomSheet
        open={symptomSheetOpen}
        onClose={() => setSymptomSheetOpen(false)}
        childId={activeChild.id}
        childName={activeChild.name}
        childDateOfBirth={activeChild.date_of_birth}
        activeEpisode={activeEpisode}
        activeEpisodes={activeEpisodes}
        recentSymptoms={symptomLogs}
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
        recentSymptoms={symptomLogs}
        initialMode={episodeSheetMode}
        onUpdated={refreshHealth}
      />
    </PageBody>
  );
}
