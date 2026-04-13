import { DietLogForm } from "../logging/DietLogForm";
import { DiaperLogForm } from "../logging/DiaperLogForm";
import { EditDiaperSheet } from "../logging/EditDiaperSheet";
import { EditMealSheet } from "../logging/EditMealSheet";
import { EditPoopSheet } from "../logging/EditPoopSheet";
import { LogForm } from "../logging/LogForm";
import { EpisodeSheet } from "../episodes/EpisodeSheet";
import { SymptomSheet } from "../symptoms/SymptomSheet";
import { SleepLogSheet } from "../sleep/SleepLogSheet";
import type { DiaperEntry, DiaperLogDraft, FeedingEntry, FeedingLogDraft, PoopEntry, PoopLogDraft, Episode, EpisodeEvent } from "../../lib/types";

interface HomeSheetsProps {
  activeChildId: string;
  activeEpisode: Episode | null;
  diaperDraft: Partial<DiaperLogDraft> | null;
  diaperFormOpen: boolean;
  editingDiaper: DiaperEntry | null;
  editingMeal: FeedingEntry | null;
  editingPoop: PoopEntry | null;
  episodeEvents: EpisodeEvent[];
  episodeSheetMode: "default" | "start" | "update";
  episodeSheetOpen: boolean;
  feedingDraft: Partial<FeedingLogDraft> | null;
  feedingFormOpen: boolean;
  logFormOpen: boolean;
  poopDraft: Partial<PoopLogDraft> | null;
  sleepSheetOpen: boolean;
  symptomSheetOpen: boolean;
  onCloseDiaperForm: () => void;
  onCloseEpisodeSheet: () => void;
  onCloseFeedingForm: () => void;
  onClosePoopForm: () => void;
  onCloseSleepSheet: () => void;
  onCloseSymptomSheet: () => void;
  onDiaperLogged: () => Promise<void>;
  onEditDiaper: (entry: DiaperEntry | null) => void;
  onEditMeal: (entry: FeedingEntry | null) => void;
  onEditPoop: (entry: PoopEntry | null) => void;
  onEpisodeUpdated: () => Promise<void>;
  onFeedingLogged: () => Promise<void>;
  onPoopLogged: () => Promise<void>;
  onSleepLogged: () => Promise<void>;
  onSymptomLogged: () => Promise<void>;
  refreshFeedingLogs: () => Promise<void>;
  refreshLogs: () => Promise<void>;
}

export function HomeSheets({
  activeChildId,
  activeEpisode,
  diaperDraft,
  diaperFormOpen,
  editingDiaper,
  editingMeal,
  editingPoop,
  episodeEvents,
  episodeSheetMode,
  episodeSheetOpen,
  feedingDraft,
  feedingFormOpen,
  logFormOpen,
  poopDraft,
  sleepSheetOpen,
  symptomSheetOpen,
  onCloseDiaperForm,
  onCloseEpisodeSheet,
  onCloseFeedingForm,
  onClosePoopForm,
  onCloseSleepSheet,
  onCloseSymptomSheet,
  onDiaperLogged,
  onEditDiaper,
  onEditMeal,
  onEditPoop,
  onEpisodeUpdated,
  onFeedingLogged,
  onPoopLogged,
  onSleepLogged,
  onSymptomLogged,
  refreshFeedingLogs,
  refreshLogs,
}: HomeSheetsProps) {
  return (
    <>
      <LogForm
        open={logFormOpen}
        onClose={onClosePoopForm}
        childId={activeChildId}
        onLogged={onPoopLogged}
        initialDraft={poopDraft}
      />

      <DiaperLogForm
        open={diaperFormOpen}
        onClose={onCloseDiaperForm}
        childId={activeChildId}
        onLogged={onDiaperLogged}
        initialDraft={diaperDraft}
      />

      <DietLogForm
        open={feedingFormOpen}
        onClose={onCloseFeedingForm}
        childId={activeChildId}
        onLogged={onFeedingLogged}
        initialDraft={feedingDraft}
      />

      <EpisodeSheet
        open={episodeSheetOpen}
        onClose={onCloseEpisodeSheet}
        childId={activeChildId}
        activeEpisode={activeEpisode}
        events={episodeEvents}
        onUpdated={onEpisodeUpdated}
        initialMode={episodeSheetMode}
      />

      <SymptomSheet
        open={symptomSheetOpen}
        onClose={onCloseSymptomSheet}
        childId={activeChildId}
        activeEpisode={activeEpisode}
        onLogged={onSymptomLogged}
      />

      <SleepLogSheet
        open={sleepSheetOpen}
        onClose={onCloseSleepSheet}
        childId={activeChildId}
        onLogged={onSleepLogged}
      />

      {editingPoop && (
        <EditPoopSheet
          key={editingPoop.id}
          entry={editingPoop}
          open={!!editingPoop}
          onClose={() => onEditPoop(null)}
          onSaved={() => { refreshLogs(); refreshFeedingLogs(); }}
          onDeleted={() => { refreshLogs(); refreshFeedingLogs(); }}
        />
      )}
      {editingDiaper && (
        <EditDiaperSheet
          key={editingDiaper.id}
          entry={editingDiaper}
          open={!!editingDiaper}
          onClose={() => onEditDiaper(null)}
          onSaved={() => { onEditDiaper(null); void onDiaperLogged(); }}
          onDeleted={() => { onEditDiaper(null); void onDiaperLogged(); }}
        />
      )}
      {editingMeal && (
        <EditMealSheet
          key={editingMeal.id}
          entry={editingMeal}
          open={!!editingMeal}
          onClose={() => onEditMeal(null)}
          onSaved={() => { refreshLogs(); refreshFeedingLogs(); }}
          onDeleted={() => { refreshLogs(); refreshFeedingLogs(); }}
        />
      )}
    </>
  );
}
