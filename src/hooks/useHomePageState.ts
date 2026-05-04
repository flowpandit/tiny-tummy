import { useCallback, useState } from "react";
import type { DiaperEntry, DiaperLogDraft, FeedingEntry, FeedingLogDraft, PoopEntry, PoopLogDraft } from "../lib/types";

export function useHomePageState() {
  const [logFormOpen, setLogFormOpen] = useState(false);
  const [poopDraft, setPoopDraft] = useState<Partial<PoopLogDraft> | null>(null);
  const [diaperFormOpen, setDiaperFormOpen] = useState(false);
  const [diaperDraft, setDiaperDraft] = useState<Partial<DiaperLogDraft> | null>(null);
  const [feedingFormOpen, setFeedingFormOpen] = useState(false);
  const [feedingDraft, setFeedingDraft] = useState<Partial<FeedingLogDraft> | null>(null);
  const [sleepSheetOpen, setSleepSheetOpen] = useState(false);
  const [episodeSheetOpen, setEpisodeSheetOpen] = useState(false);
  const [episodeSheetMode, setEpisodeSheetMode] = useState<"default" | "start" | "update">("default");
  const [symptomSheetOpen, setSymptomSheetOpen] = useState(false);
  const [editingPoop, setEditingPoop] = useState<PoopEntry | null>(null);
  const [editingDiaper, setEditingDiaper] = useState<DiaperEntry | null>(null);
  const [editingMeal, setEditingMeal] = useState<FeedingEntry | null>(null);

  const openPoopForm = useCallback((draft?: Partial<PoopLogDraft> | null) => {
    setPoopDraft(draft ?? null);
    setLogFormOpen(true);
  }, []);

  const closePoopForm = useCallback(() => {
    setLogFormOpen(false);
    setPoopDraft(null);
  }, []);

  const openDiaperForm = useCallback((draft?: Partial<DiaperLogDraft> | null) => {
    setDiaperDraft(draft ?? null);
    setDiaperFormOpen(true);
  }, []);

  const closeDiaperForm = useCallback(() => {
    setDiaperFormOpen(false);
    setDiaperDraft(null);
  }, []);

  const openFeedingForm = useCallback((draft?: Partial<FeedingLogDraft> | null) => {
    setFeedingDraft(draft ?? null);
    setFeedingFormOpen(true);
  }, []);

  const closeFeedingForm = useCallback(() => {
    setFeedingFormOpen(false);
    setFeedingDraft(null);
  }, []);

  const openEpisodeSheet = useCallback((mode: "default" | "start" | "update" = "default") => {
    setEpisodeSheetMode(mode);
    setEpisodeSheetOpen(true);
  }, []);

  const closeEpisodeSheet = useCallback(() => {
    setEpisodeSheetOpen(false);
    setEpisodeSheetMode("default");
  }, []);

  return {
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
  };
}
