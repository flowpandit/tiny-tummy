import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useActiveChild, useChildActions, useChildren } from "../contexts/ChildContext";
import { usePoopLogs } from "../hooks/usePoopLogs";
import { useDiaperLogs } from "../hooks/useDiaperLogs";
import { useFeedingLogs } from "../hooks/useFeedingLogs";
import { useSleepLogs } from "../hooks/useSleepLogs";
import { useAlerts } from "../hooks/useAlerts";
import { useEpisodes } from "../hooks/useEpisodes";
import { useSymptoms } from "../hooks/useSymptoms";
import { useEliminationPreference } from "../hooks/useEliminationPreference";
import { useChildWorkflowActions } from "../hooks/useChildWorkflowActions";
import { useHomePageState } from "../hooks/useHomePageState";
import { useHomeBreastfeedingState } from "../hooks/useHomeBreastfeedingState";
import { useHomeStickyChildBar } from "../hooks/useHomeStickyChildBar";
import { useHomeEffects } from "../hooks/useHomeEffects";
import { buildChildDailySummary } from "../lib/child-summary";
import { buildHomeSleepSummary } from "../lib/home-insights";
import { HomeTopSection } from "../components/home/HomeTopSection";
import { RecentActivity } from "../components/home/RecentActivity";
import { CareToolsSection } from "../components/care/CareToolsSection";
import { HomeQuickActions } from "../components/home/HomeQuickActions";
import { HomeSheets } from "../components/home/HomeSheets";
import { AlertBanner } from "../components/dashboard/AlertBanner";
import { NoLogsYet } from "../components/home/NoLogsYet";
import { CompactChildNav } from "../components/layout/CompactChildNav";

export function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const navigateWithOrigin = (path: string) => navigate(path, { state: { origin: location.pathname } });
  const activeChild = useActiveChild();
  const children = useChildren();
  const { setActiveChildId } = useChildActions();
  const { experience } = useEliminationPreference(activeChild);
  const { logs, lastRealPoop, refresh: refreshLogs } = usePoopLogs(activeChild?.id ?? null);
  const {
    logs: diaperLogs,
    refresh: refreshDiaperLogs,
  } = useDiaperLogs(activeChild?.id ?? null);
  const { logs: feedingLogs, refresh: refreshFeedingLogs } = useFeedingLogs(activeChild?.id ?? null);
  const { logs: sleepLogs, refresh: refreshSleepLogs } = useSleepLogs(activeChild?.id ?? null);
  const { activeEpisode, events: episodeEvents, refresh: refreshEpisodes } = useEpisodes(activeChild?.id ?? null);
  const { logs: symptomLogs, refresh: refreshSymptoms } = useSymptoms(activeChild?.id ?? null);
  const { alerts, refresh: refreshAlerts, dismiss } = useAlerts(activeChild?.id ?? null);
  const { refreshChildAlerts, syncChildReminders, runPostLogActions } = useChildWorkflowActions(activeChild, refreshAlerts);
  const homeState = useHomePageState();
  const hasDiaperLogs = diaperLogs.length > 0;
  const hasLogs = experience.mode === "diaper" ? hasDiaperLogs : logs.length > 0;
  const { activeBreastfeedingSide } = useHomeBreastfeedingState(activeChild, refreshFeedingLogs);
  const { avatarAnchorRef, showStickyChildBar } = useHomeStickyChildBar(activeChild, hasLogs);

  useHomeEffects({
    activeChild,
    activeEpisode,
    children,
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
  const sleepSummary = useMemo(() => buildHomeSleepSummary(sleepLogs), [sleepLogs]);

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
  const lastFeed = summary.lastFeed;
  const showBreastfeedAction = activeChild.feeding_type === "breast" || activeChild.feeding_type === "mixed";
  const episodeActionLabel = activeEpisode ? "Add episode update" : "Start episode";
  const otherChildren = children.filter((child) => child.id !== activeChild.id);
  const eliminationActionLabel = experience.mode === "diaper" ? "Log diaper" : "Log poop";
  const handleOpenBreastfeedAction = () => {
    if (showBreastfeedAction) {
      navigateWithOrigin("/breastfeed");
      return;
    }
    navigateWithOrigin("/feed");
  };

  return (
    <div className="flex flex-col gap-3 pb-2 pt-0.5">
      <AlertBanner alerts={alerts} onDismiss={dismiss} />
      {hasLogs && (
        <div
          className={`pointer-events-none fixed inset-x-0 z-30 transition-all duration-200 ${showStickyChildBar ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"}`}
          style={{
            top: 0,
            height: "calc(var(--safe-area-top) + 74px)",
            background: "var(--gradient-home-sticky-overlay)",
            backdropFilter: "blur(24px) saturate(1.02)",
            WebkitBackdropFilter: "blur(24px) saturate(1.02)",
          }}
        >
          <div
            className="mx-auto flex max-w-[600px] items-center justify-between gap-3 bg-transparent px-4 py-3"
            style={{ marginTop: "calc(var(--safe-area-top) + 16px)" }}
          >
            <CompactChildNav
              activeChild={activeChild}
              otherChildren={otherChildren}
              onSelectChild={setActiveChildId}
              className="flex w-full items-center justify-between gap-3"
            />
          </div>
        </div>
      )}

      {hasLogs ? (
        <HomeTopSection
          activeChild={activeChild}
          summary={summary}
          sleepSummaryLabel={sleepSummary.label}
          sleepSummaryHoursValue={sleepSummary.hoursValue}
          sleepNapCount={sleepSummary.napCount}
          avatarAnchorRef={avatarAnchorRef}
          otherChildren={otherChildren}
          onSelectChild={setActiveChildId}
        />
      ) : (
        <NoLogsYet
          childName={activeChild.name}
          onLogFirst={() => experience.mode === "diaper" ? openDiaperForm({ diaper_type: "wet", urine_color: "normal" }) : openPoopForm()}
        />
      )}

      <HomeQuickActions
        activeBreastfeedingSide={activeBreastfeedingSide}
        canOpenBreastfeedAction={showBreastfeedAction || Boolean(lastFeed)}
        eliminationActionLabel={eliminationActionLabel}
        episodeActionLabel={episodeActionLabel}
        showBreastfeedAction={showBreastfeedAction}
        onLogElimination={() => experience.mode === "diaper" ? openDiaperForm({ diaper_type: "wet", urine_color: "normal" }) : openPoopForm()}
        onLogFeed={() => openFeedingForm()}
        onOpenBreastfeed={handleOpenBreastfeedAction}
        onOpenSleep={() => setSleepSheetOpen(true)}
        onOpenEpisode={() => openEpisodeSheet(activeEpisode ? "update" : "start")}
        onOpenSymptom={() => setSymptomSheetOpen(true)}
      />

      {(logs.length > 0 || feedingLogs.length > 0) && (
        <RecentActivity
          poopLogs={experience.mode === "diaper" ? [] : logs}
          diaperLogs={experience.mode === "diaper" ? diaperLogs : []}
          feedingLogs={feedingLogs}
          onEditPoop={setEditingPoop}
          onEditDiaper={setEditingDiaper}
          onEditMeal={setEditingMeal}
        />
      )}

      <CareToolsSection />

      <HomeSheets
        activeChildId={activeChild.id}
        activeEpisode={activeEpisode}
        diaperDraft={diaperDraft}
        diaperFormOpen={diaperFormOpen}
        editingDiaper={editingDiaper}
        editingMeal={editingMeal}
        editingPoop={editingPoop}
        episodeEvents={episodeEvents}
        episodeSheetMode={episodeSheetMode}
        episodeSheetOpen={episodeSheetOpen}
        feedingDraft={feedingDraft}
        feedingFormOpen={feedingFormOpen}
        logFormOpen={logFormOpen}
        poopDraft={poopDraft}
        sleepSheetOpen={sleepSheetOpen}
        symptomSheetOpen={symptomSheetOpen}
        onCloseDiaperForm={closeDiaperForm}
        onCloseEpisodeSheet={closeEpisodeSheet}
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
