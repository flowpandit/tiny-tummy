import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useActiveChild } from "../contexts/ChildContext";
import { usePoopLogs } from "../hooks/usePoopLogs";
import { useDiaperLogs } from "../hooks/useDiaperLogs";
import { useFeedingLogs } from "../hooks/useFeedingLogs";
import { useSleepLogs } from "../hooks/useSleepLogs";
import { useSleepQuickTimer } from "../hooks/useSleepQuickTimer";
import { useBreastfeedingSessionPreview } from "../hooks/useBreastfeedingSessionPreview";
import { useAlerts } from "../hooks/useAlerts";
import { useEpisodes } from "../hooks/useEpisodes";
import { useSymptoms } from "../hooks/useSymptoms";
import { useChildWorkflowActions } from "../hooks/useChildWorkflowActions";
import { useEliminationPreference } from "../hooks/useEliminationPreference";
import { useHomePageState } from "../hooks/useHomePageState";
import { useHomeEffects } from "../hooks/useHomeEffects";
import { buildChildDailySummary } from "../lib/child-summary";
import {
  buildActiveBreastfeedingInsight,
  buildActiveSleepInsight,
  buildHomeAssistantModel,
  elevateActiveFeedInsight,
  elevateActiveSleepInsight,
  type HomeInsightCard,
  type HomeTimelineItem,
} from "../lib/home-insights";
import { HomeTopSection } from "../components/home/HomeTopSection";
import { RecentActivity } from "../components/home/RecentActivity";
import { CareToolsSection } from "../components/care/CareToolsSection";
import { HomeQuickActions } from "../components/home/HomeQuickActions";
import { HomeHealthActions } from "../components/home/HomeHealthActions";
import { HomeActiveEpisodes } from "../components/home/HomeActiveEpisodes";
import { HomeSheets } from "../components/home/HomeSheets";
import { AlertBanner } from "../components/dashboard/AlertBanner";
import { HomeActionBottleIcon, HomeActionDiaperIcon, HomeActionSleepIcon } from "../components/ui/icons";
import { useToast } from "../components/ui/toast";
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
  const { showError, showSuccess } = useToast();
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
  const [recommendationIndex, setRecommendationIndex] = useState(0);
  const [recommendationDirection, setRecommendationDirection] = useState(1);
  const shouldReduceMotion = useReducedMotion();

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
  const {
    timerSession: sleepTimerSession,
    timerElapsedMs: sleepTimerElapsedMs,
    isSubmitting: isSleepTimerActionPending,
    handleStopAndSaveTimer: handleStopSleepTimer,
  } = useSleepQuickTimer({
    activeChild,
    refreshKey: sleepSheetOpen,
    onLogged: handleSleepLogged,
    onError: showError,
    onSuccess: showSuccess,
  });
  const {
    activeSide: activeBreastfeedingSide,
    elapsedMs: activeBreastfeedingElapsedMs,
  } = useBreastfeedingSessionPreview(activeChild, feedingFormOpen);

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

  useEffect(() => {
    setSelectedEpisodeId(null);
    closeEpisodeSheet();
    setSymptomSheetOpen(false);
  }, [activeChild?.id, closeEpisodeSheet, setSymptomSheetOpen]);

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
  const displayedInsights = useMemo(() => {
    if (!activeChild || !assistantModel) {
      return assistantModel?.insights ?? [];
    }

    const sleepInsight = sleepTimerSession
      ? buildActiveSleepInsight({
        childName: activeChild.name,
        startedAt: sleepTimerSession.startedAt,
        elapsedMs: sleepTimerElapsedMs,
        actionDisabled: isSleepTimerActionPending,
      })
      : null;
    const feedInsight = activeBreastfeedingSide
      ? buildActiveBreastfeedingInsight({
        childName: activeChild.name,
        activeSide: activeBreastfeedingSide,
        elapsedMs: activeBreastfeedingElapsedMs,
      })
      : null;

    return elevateActiveFeedInsight(
      elevateActiveSleepInsight(assistantModel.insights, sleepInsight),
      feedInsight,
    );
  }, [
    activeBreastfeedingElapsedMs,
    activeBreastfeedingSide,
    activeChild,
    assistantModel,
    isSleepTimerActionPending,
    sleepTimerElapsedMs,
    sleepTimerSession,
  ]);
  const recommendationSignature = assistantModel?.recommendations
    .map((item) => `${item.title}:${item.detail}:${item.action}`)
    .join("|") ?? "";
  const recommendationCount = assistantModel?.recommendations.length ?? 0;

  useEffect(() => {
    setRecommendationIndex(0);
    setRecommendationDirection(1);
  }, [activeChild?.id, recommendationSignature]);

  useEffect(() => {
    if (recommendationCount <= 1) return undefined;

    const interval = window.setInterval(() => {
      setRecommendationDirection(1);
      setRecommendationIndex((current) => (current + 1) % recommendationCount);
    }, 7000);

    return () => window.clearInterval(interval);
  }, [recommendationCount, recommendationSignature]);

  if (!activeChild || !summary || !assistantModel) return null;

  const recommendations = assistantModel.recommendations.length > 0
    ? assistantModel.recommendations
    : [assistantModel.recommendation];
  const activeRecommendationIndex = Math.min(recommendationIndex, recommendations.length - 1);
  const activeRecommendation = recommendations[activeRecommendationIndex] ?? assistantModel.recommendation;

  const handleRecommendationDotSelect = (index: number) => {
    if (index === activeRecommendationIndex) return;
    setRecommendationDirection(index > activeRecommendationIndex ? 1 : -1);
    setRecommendationIndex(index);
  };

  const handleInsightSelect = (insight: HomeInsightCard) => {
    if (insight.id === "feed-active") {
      navigate("/breastfeed");
      return;
    }

    if (insight.accent === "feed") {
      navigate("/feed");
      return;
    }

    if (insight.accent === "sleep") {
      navigate("/sleep");
      return;
    }

    navigate(eliminationExperience.route);
  };
  const handleInsightAction = (insight: HomeInsightCard) => {
    if (insight.id === "sleep-active") {
      void handleStopSleepTimer();
    }
  };

  const handleTimelineItemSelect = (item: HomeTimelineItem) => {
    if (item.kind === "poop") {
      const log = logs.find((entry) => entry.id === item.sourceId);
      if (log) setEditingPoop(log);
      return;
    }

    if (item.kind === "diaper") {
      const log = diaperLogs.find((entry) => entry.id === item.sourceId);
      if (log) setEditingDiaper(log);
      return;
    }

    if (item.kind === "sleep") {
      navigate("/sleep");
      return;
    }

    const log = feedingLogs.find((entry) => entry.id === item.sourceId);
    if (log) setEditingMeal(log);
  };

  const handleAlertGuidance = () => {
    navigate("/guidance", { state: { guidanceTopicId: "when-to-call", origin: "/" } });
  };

  const recommendationIcon = activeRecommendation.accent === "sleep"
    ? <HomeActionSleepIcon className="h-6 w-6 text-[var(--color-home-recommendation-sleep-icon)] md:h-8 md:w-8" />
    : activeRecommendation.accent === "hydration"
      ? <HomeActionDiaperIcon className="h-6 w-6 text-[var(--color-home-recommendation-feed-icon)] md:h-8 md:w-8" />
      : <HomeActionBottleIcon className="h-6 w-6 text-[var(--color-home-recommendation-feed-icon)] md:h-8 md:w-8" />;

  return (
    <div className="flex flex-col gap-3 pb-3 pt-0 md:gap-7 md:pb-4 md:pt-0.5">
      <HomeTopSection
        alertSlot={<AlertBanner alerts={alerts} onAction={handleAlertGuidance} onDismiss={dismiss} />}
        status={assistantModel.status}
        insights={displayedInsights}
        onInsightSelect={handleInsightSelect}
        onInsightAction={handleInsightAction}
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
          className="relative flex min-h-[92px] items-center gap-3 overflow-hidden rounded-[18px] border px-3.5 py-3 pb-5 shadow-[0_16px_34px_rgba(211,174,103,0.1)] md:min-h-[154px] md:gap-4 md:rounded-[28px] md:px-8 md:py-5 md:pb-7"
          style={{
            background: "var(--gradient-home-recommendation)",
            borderColor: "var(--color-home-recommendation-border)",
          }}
        >
          <div className="absolute right-[92px] top-5 text-lg text-[var(--color-home-recommendation-star)] md:right-[250px] md:top-7 md:text-2xl">✦</div>
          <div className="absolute bottom-4 right-[52px] text-2xl text-[var(--color-home-recommendation-star)] md:bottom-7 md:right-[192px] md:text-3xl">✦</div>
          <RecommendationBottleArt />
          <div className="relative z-10 min-w-0 flex-1 overflow-hidden">
            <AnimatePresence initial={false} custom={recommendationDirection} mode="popLayout">
              <motion.div
                key={`${activeRecommendation.title}-${activeRecommendation.detail}-${activeRecommendation.action}`}
                custom={recommendationDirection}
                initial={shouldReduceMotion ? false : { x: recommendationDirection * 36, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { x: recommendationDirection * -36, opacity: 0 }}
                transition={{ duration: shouldReduceMotion ? 0.01 : 0.34, ease: [0.22, 1, 0.36, 1] }}
                className="flex min-w-0 items-center gap-3 md:gap-4"
                aria-live="polite"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-[var(--shadow-inner)] md:h-14 md:w-14" style={{ background: "var(--color-home-recommendation-icon-surface)" }}>
                  {recommendationIcon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-home-recommendation-label)] md:text-[0.85rem]">
                    Recommended next
                  </p>
                  <p className="mt-1 text-[1.06rem] font-semibold leading-tight tracking-[-0.03em] text-[var(--color-text)] md:mt-1.5 md:text-[1.45rem]">
                    {activeRecommendation.title}
                  </p>
                  <p className="mt-1 text-[0.85rem] leading-snug text-[var(--color-text-secondary)] md:mt-2 md:text-[1.06rem] md:leading-relaxed">
                    {activeRecommendation.detail}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          {recommendations.length > 1 && (
            <div
              className="absolute bottom-2.5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 md:bottom-3.5"
              aria-label="Recommendation carousel"
            >
              {recommendations.map((recommendation, index) => {
                const isActive = index === activeRecommendationIndex;
                return (
                  <button
                    key={`${recommendation.title}-${recommendation.action}-${index}`}
                    type="button"
                    aria-label={`Show recommendation ${index + 1}`}
                    aria-current={isActive ? "true" : undefined}
                    onClick={() => handleRecommendationDotSelect(index)}
                    className="h-1.5 w-1.5 rounded-full transition-colors md:h-2 md:w-2"
                    style={{
                      backgroundColor: isActive
                        ? "var(--color-cta)"
                        : "color-mix(in srgb, var(--color-text-soft) 52%, var(--color-home-recommendation-button-bg))",
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      <RecentActivity
        timeline={assistantModel.timeline}
        glanceStats={assistantModel.glanceStats}
        onTimelineItemSelect={handleTimelineItemSelect}
      />

      <CareToolsSection className="px-4 md:px-10" palette="soft" />

      <HomeSheets
        activeChildId={activeChild.id}
        activeChildName={activeChild.name}
        activeChildDateOfBirth={activeChild.date_of_birth}
        activeEpisode={sheetEpisode}
        activeEpisodes={activeEpisodes}
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
        symptomLogs={symptomLogs}
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
