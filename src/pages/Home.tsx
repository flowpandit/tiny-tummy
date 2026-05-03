import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useActiveChild } from "../contexts/ChildContext";
import { usePoopLogs } from "../hooks/usePoopLogs";
import { useDiaperLogs } from "../hooks/useDiaperLogs";
import { useFeedingLogs } from "../hooks/useFeedingLogs";
import { useSleepLogs } from "../hooks/useSleepLogs";
import { useAlerts } from "../hooks/useAlerts";
import { useEpisodes } from "../hooks/useEpisodes";
import { useSymptoms } from "../hooks/useSymptoms";
import { useChildWorkflowActions } from "../hooks/useChildWorkflowActions";
import { useEliminationPreference } from "../hooks/useEliminationPreference";
import { useHomePageState } from "../hooks/useHomePageState";
import { useHomeEffects } from "../hooks/useHomeEffects";
import { buildChildDailySummary } from "../lib/child-summary";
import { buildHomeAssistantModel, type HomeInsightCard } from "../lib/home-insights";
import { HomeTopSection } from "../components/home/HomeTopSection";
import { RecentActivity } from "../components/home/RecentActivity";
import { CareToolsSection } from "../components/care/CareToolsSection";
import { HomeQuickActions } from "../components/home/HomeQuickActions";
import { HomeHealthActions } from "../components/home/HomeHealthActions";
import { HomeActiveEpisodes } from "../components/home/HomeActiveEpisodes";
import { HomeSheets } from "../components/home/HomeSheets";
import { AlertBanner } from "../components/dashboard/AlertBanner";
import { HomeActionBottleIcon, HomeActionSleepIcon } from "../components/ui/icons";
import type { Episode } from "../lib/types";

function RecommendationBottleArt() {
  return (
    <div className="pointer-events-none absolute bottom-2 right-20 hidden h-24 w-24 rotate-12 md:block" aria-hidden="true">
      <svg viewBox="0 0 96 96" className="h-full w-full">
        <path d="M41 19h18c3 0 5 2 5 5v9H36v-9c0-3 2-5 5-5Z" fill="#fb8b55" />
        <path d="M44 9c7 2 13 7 14 14H42c0-6 0-10 2-14Z" fill="#f47a43" />
        <path d="M33 32h34c5 0 9 4 9 9v36c0 7-5 12-12 12H36c-7 0-12-5-12-12V41c0-5 4-9 9-9Z" fill="#fff8ed" stroke="#ded8df" strokeWidth="4" />
        <path d="M36 42h28M36 56h20M36 70h26" stroke="#bfb8d3" strokeWidth="3" strokeLinecap="round" />
        <path d="M33 32h34v13H33z" fill="#d8d0ff" opacity=".72" />
      </svg>
    </div>
  );
}

export function Home() {
  const navigate = useNavigate();
  const activeChild = useActiveChild();
  const { logs, lastRealPoop, refresh: refreshLogs } = usePoopLogs(activeChild?.id ?? null);
  const {
    logs: diaperLogs,
    refresh: refreshDiaperLogs,
  } = useDiaperLogs(activeChild?.id ?? null);
  const { logs: feedingLogs, refresh: refreshFeedingLogs } = useFeedingLogs(activeChild?.id ?? null);
  const { logs: sleepLogs, refresh: refreshSleepLogs } = useSleepLogs(activeChild?.id ?? null);
  const {
    activeEpisode,
    activeEpisodes,
    activeEpisodeEventsById,
    events: episodeEvents,
    refresh: refreshEpisodes,
  } = useEpisodes(activeChild?.id ?? null);
  const { logs: symptomLogs, refresh: refreshSymptoms } = useSymptoms(activeChild?.id ?? null);
  const { alerts, refresh: refreshAlerts, dismiss } = useAlerts(activeChild?.id ?? null);
  const { refreshChildAlerts, syncChildReminders, runPostLogActions } = useChildWorkflowActions(activeChild, refreshAlerts);
  const { experience: eliminationExperience } = useEliminationPreference(activeChild);
  const homeState = useHomePageState();
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null);

  useHomeEffects({
    activeChild,
    activeEpisode,
    episodeEvents,
    feedingLogs,
    lastRealPoop,
    refreshChildAlerts,
    refreshLogs,
    syncChildReminders,
  });

  const {
    diaperDraft,
    diaperFormOpen,
    editingDiaper,
    editingMeal,
    editingPoop,
    episodeSheetMode,
    episodeSheetOpen,
    feedingDraft,
    feedingFormOpen,
    logFormOpen,
    poopDraft,
    sleepSheetOpen,
    symptomSheetOpen,
    closeDiaperForm,
    closeEpisodeSheet,
    closeFeedingForm,
    closePoopForm,
    openDiaperForm,
    openEpisodeSheet,
    openFeedingForm,
    openPoopForm,
    setEditingDiaper,
    setEditingMeal,
    setEditingPoop,
    setSleepSheetOpen,
    setSymptomSheetOpen,
  } = homeState;

  const handleLogged = async () => {
    await runPostLogActions({
      refresh: [refreshLogs, refreshDiaperLogs],
      alerts: true,
      reminders: true,
    });
  };

  const handleFeedingLogged = async () => {
    await runPostLogActions({
      refresh: [refreshFeedingLogs],
      reminders: true,
    });
  };

  const handleEpisodeUpdated = async () => {
    await runPostLogActions({
      refresh: [refreshEpisodes],
      reminders: true,
    });
  };

  const handleSymptomLogged = async () => {
    await refreshSymptoms();
    await refreshEpisodes();
  };

  const handleSleepLogged = async () => {
    await refreshSleepLogs();
  };

  const selectedEpisode = selectedEpisodeId
    ? activeEpisodes.find((episode) => episode.id === selectedEpisodeId) ?? null
    : null;
  const sheetEpisode = episodeSheetMode === "start" ? null : selectedEpisode ?? activeEpisode;
  const sheetEpisodeEvents = sheetEpisode
    ? activeEpisodeEventsById[sheetEpisode.id] ?? []
    : episodeEvents;

  const handleOpenEpisode = (episode: Episode) => {
    setSelectedEpisodeId(episode.id);
    openEpisodeSheet("update");
  };

  const handleStartEpisode = () => {
    setSelectedEpisodeId(null);
    openEpisodeSheet("start");
  };

  const handleCloseEpisodeSheet = () => {
    setSelectedEpisodeId(null);
    closeEpisodeSheet();
  };

  const summary = activeChild
    ? buildChildDailySummary({
      poopLogs: logs,
      diaperLogs,
      feedingLogs,
      alerts,
      activeEpisode,
      episodeEvents,
      symptomLogs,
    })
    : null;
  const assistantModel = useMemo(() => {
    if (!activeChild || !summary) return null;

    return buildHomeAssistantModel({
      child: activeChild,
      summary,
      poopLogs: logs,
      diaperLogs,
      feedingLogs,
      sleepLogs,
      alerts,
      includeHydration: eliminationExperience.mode === "diaper",
    });
  }, [activeChild, alerts, diaperLogs, eliminationExperience.mode, feedingLogs, logs, sleepLogs, summary]);

  if (!activeChild || !summary || !assistantModel) return null;

  const handleInsightSelect = (insight: HomeInsightCard) => {
    if (insight.accent === "sleep") {
      navigate("/sleep");
      return;
    }

    navigate(eliminationExperience.route);
  };

  const recommendationIcon = assistantModel.recommendation.accent === "sleep"
    ? <HomeActionSleepIcon className="h-6 w-6 text-[var(--color-home-recommendation-sleep-icon)] md:h-8 md:w-8" />
    : <HomeActionBottleIcon className="h-6 w-6 text-[var(--color-home-recommendation-feed-icon)] md:h-8 md:w-8" />;

  return (
    <div className="flex flex-col gap-3 pb-3 pt-0 md:gap-7 md:pb-4 md:pt-0.5">
      <AlertBanner alerts={alerts} onDismiss={dismiss} />
      <HomeTopSection
        status={assistantModel.status}
        insights={assistantModel.insights}
        onInsightSelect={handleInsightSelect}
      />

      <HomeQuickActions
        onLogDiaper={() => openDiaperForm({ diaper_type: "wet", urine_color: "normal" })}
        onLogPoop={() => openPoopForm()}
        onLogFeed={() => openFeedingForm()}
        onOpenSleep={() => setSleepSheetOpen(true)}
      />

      <HomeHealthActions
        onLogSymptoms={() => setSymptomSheetOpen(true)}
        onOpenEpisode={handleStartEpisode}
        onOpenHealth={() => navigate("/health", { state: { origin: "/" } })}
      />

      <HomeActiveEpisodes
        episodes={activeEpisodes}
        onSelectEpisode={handleOpenEpisode}
      />

      <div className="px-4 md:px-10">
        <div
          className="relative flex min-h-[82px] items-center gap-3 overflow-hidden rounded-[18px] border px-3.5 py-3 shadow-[0_16px_34px_rgba(211,174,103,0.1)] md:min-h-[154px] md:gap-4 md:rounded-[28px] md:px-8 md:py-5"
          style={{
            background: "var(--gradient-home-recommendation)",
            borderColor: "var(--color-home-recommendation-border)",
          }}
        >
          <div className="absolute right-[92px] top-5 text-lg text-[var(--color-home-recommendation-star)] md:right-[250px] md:top-7 md:text-2xl">✦</div>
          <div className="absolute bottom-4 right-[52px] text-2xl text-[var(--color-home-recommendation-star)] md:bottom-7 md:right-[192px] md:text-3xl">✦</div>
          <RecommendationBottleArt />
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-[var(--shadow-inner)] md:h-14 md:w-14" style={{ background: "var(--color-home-recommendation-icon-surface)" }}>
            {recommendationIcon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-home-recommendation-label)] md:text-[0.85rem]">
              Recommended next
            </p>
            <p className="mt-1 text-[1.06rem] font-semibold leading-tight tracking-[-0.03em] text-[var(--color-text)] md:mt-1.5 md:text-[1.45rem]">
              {assistantModel.recommendation.title}
            </p>
            <p className="mt-1 text-[0.85rem] leading-snug text-[var(--color-text-secondary)] md:mt-2 md:text-[1.06rem] md:leading-relaxed">
              {assistantModel.recommendation.detail}
            </p>
          </div>
          <button
            type="button"
            aria-label="Open recommendation"
            className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[1.6rem] leading-none shadow-[0_10px_28px_rgba(145,112,79,0.14)] md:h-14 md:w-14 md:text-[2rem]"
            style={{
              background: "var(--color-home-recommendation-button-bg)",
              color: "var(--color-home-recommendation-button-text)",
            }}
          >
            ›
          </button>
        </div>
      </div>

      <RecentActivity
        timeline={assistantModel.timeline}
        glanceStats={assistantModel.glanceStats}
      />

      <CareToolsSection className="px-4 md:px-10" palette="soft" />

      <HomeSheets
        activeChildId={activeChild.id}
        activeEpisode={sheetEpisode}
        diaperDraft={diaperDraft}
        diaperFormOpen={diaperFormOpen}
        editingDiaper={editingDiaper}
        editingMeal={editingMeal}
        editingPoop={editingPoop}
        episodeEvents={sheetEpisodeEvents}
        episodeSheetMode={episodeSheetMode}
        episodeSheetOpen={episodeSheetOpen}
        feedingDraft={feedingDraft}
        feedingFormOpen={feedingFormOpen}
        logFormOpen={logFormOpen}
        poopDraft={poopDraft}
        sleepSheetOpen={sleepSheetOpen}
        symptomSheetOpen={symptomSheetOpen}
        onCloseDiaperForm={closeDiaperForm}
        onCloseEpisodeSheet={handleCloseEpisodeSheet}
        onCloseFeedingForm={closeFeedingForm}
        onClosePoopForm={closePoopForm}
        onCloseSleepSheet={() => setSleepSheetOpen(false)}
        onCloseSymptomSheet={() => setSymptomSheetOpen(false)}
        onDiaperLogged={handleLogged}
        onEditDiaper={setEditingDiaper}
        onEditMeal={setEditingMeal}
        onEditPoop={setEditingPoop}
        onEpisodeUpdated={handleEpisodeUpdated}
        onFeedingLogged={handleFeedingLogged}
        onPoopLogged={handleLogged}
        onSleepLogged={handleSleepLogged}
        onSymptomLogged={handleSymptomLogged}
        refreshFeedingLogs={refreshFeedingLogs}
        refreshLogs={refreshLogs}
      />
    </div>
  );
}
