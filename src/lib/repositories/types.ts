import type {
  Alert,
  Attachment,
  Caregiver,
  Child,
  ChildCaregiver,
  ColorCount,
  ConsistencyPoint,
  DailyFrequency,
  DiaperEntry,
  Episode,
  EpisodeEvent,
  FeedingEntry,
  GrowthEntry,
  MilestoneEntry,
  PoopEntry,
  QuickPresetEntry,
  SleepEntry,
  SymptomEntry,
} from "../types";
import type { ReportOptions, ReportSourceData } from "../reporting";

export type CreateChildInput = {
  name: string;
  date_of_birth: string;
  sex?: Child["sex"];
  feeding_type: string;
  avatar_color?: string;
};

export type UpdateChildInput = Partial<Pick<Child, "name" | "date_of_birth" | "sex" | "feeding_type" | "avatar_color">>;

export interface ChildRepository {
  createChild(input: CreateChildInput): Promise<Child>;
  listActiveChildren(): Promise<Child[]>;
  updateChild(childId: string, updates: UpdateChildInput): Promise<void>;
  deleteChild(childId: string): Promise<void>;
}

export interface CaregiverRepository {
  deleteCaregiver(caregiverId: string): Promise<void>;
  deleteChildCaregiverLink(linkId: string): Promise<void>;
}

export type CreatePoopInput = {
  child_id: string;
  logged_at: string;
  stool_type?: number | null;
  color?: string | null;
  size?: string | null;
  notes?: string | null;
  photo_path?: string | null;
};

export type UpdatePoopInput = {
  logged_at?: string;
  stool_type?: number | null;
  color?: string | null;
  size?: string | null;
  notes?: string | null;
};

export type CreateDiaperInput = {
  child_id: string;
  logged_at: string;
  diaper_type: DiaperEntry["diaper_type"];
  urine_color?: string | null;
  stool_type?: number | null;
  color?: string | null;
  size?: string | null;
  notes?: string | null;
  photo_path?: string | null;
};

export type UpdateDiaperInput = {
  logged_at?: string;
  diaper_type?: DiaperEntry["diaper_type"];
  urine_color?: string | null;
  stool_type?: number | null;
  color?: string | null;
  size?: string | null;
  notes?: string | null;
};

export interface EliminationRepository {
  recordPoop(input: CreatePoopInput): Promise<PoopEntry>;
  markNoPoopDay(childId: string): Promise<PoopEntry>;
  listPoopLogs(childId: string, limit?: number): Promise<PoopEntry[]>;
  listPoopLogsInRange(childId: string, startDate: string, endDate: string): Promise<PoopEntry[]>;
  getLastRealPoop(childId: string): Promise<PoopEntry | null>;
  updatePoop(entryId: string, updates: UpdatePoopInput): Promise<void>;
  deletePoop(entry: Pick<PoopEntry, "id" | "photo_path"> | string): Promise<void>;
  reconcileAutoNoPoopDays(childId: string): Promise<number>;
  recordDiaper(input: CreateDiaperInput): Promise<DiaperEntry>;
  listDiaperLogs(childId: string, limit?: number): Promise<DiaperEntry[]>;
  listDiaperLogsInRange(childId: string, startDate: string, endDate: string): Promise<DiaperEntry[]>;
  getLastDiaper(childId: string): Promise<DiaperEntry | null>;
  getLastWetDiaper(childId: string): Promise<DiaperEntry | null>;
  getLastDirtyDiaper(childId: string): Promise<DiaperEntry | null>;
  updateDiaper(entryId: string, updates: UpdateDiaperInput): Promise<void>;
  deleteDiaper(entry: Pick<DiaperEntry, "id" | "photo_path" | "linked_poop_log_id"> | string): Promise<void>;
  getPoopFrequencyStats(childId: string, days: number): Promise<DailyFrequency[]>;
  getPoopConsistencyTrend(childId: string, days: number): Promise<ConsistencyPoint[]>;
  getPoopColorDistribution(childId: string, days: number): Promise<ColorCount[]>;
}

export type CreateFeedingInput = {
  child_id: string;
  logged_at: string;
  food_type: string;
  food_name?: string | null;
  amount_ml?: number | null;
  duration_minutes?: number | null;
  breast_side?: string | null;
  bottle_content?: string | null;
  reaction_notes?: string | null;
  is_constipation_support?: number;
  notes?: string | null;
};

export type UpdateFeedingInput = {
  logged_at?: string;
  food_type?: string;
  food_name?: string | null;
  amount_ml?: number | null;
  duration_minutes?: number | null;
  breast_side?: string | null;
  bottle_content?: string | null;
  reaction_notes?: string | null;
  is_constipation_support?: number;
  notes?: string | null;
};

export interface FeedingRepository {
  recordFeed(input: CreateFeedingInput): Promise<FeedingEntry>;
  listFeedingLogs(childId: string, limit?: number): Promise<FeedingEntry[]>;
  listFeedingLogsInRange(childId: string, startDate: string, endDate: string): Promise<FeedingEntry[]>;
  updateFeed(entryId: string, updates: UpdateFeedingInput): Promise<void>;
  deleteFeed(entryId: string): Promise<void>;
}

export type CreateSleepInput = {
  child_id: string;
  sleep_type: string;
  started_at: string;
  ended_at: string;
  notes?: string | null;
};

export type UpdateSleepInput = {
  sleep_type?: string;
  started_at?: string;
  ended_at?: string;
  notes?: string | null;
};

export interface SleepRepository {
  recordSleep(input: CreateSleepInput): Promise<SleepEntry>;
  listSleepLogs(childId: string, limit?: number): Promise<SleepEntry[]>;
  listSleepLogsInRange(childId: string, startDate: string, endDate: string): Promise<SleepEntry[]>;
  updateSleep(entryId: string, updates: UpdateSleepInput): Promise<void>;
  deleteSleep(entryId: string): Promise<void>;
}

export type CreateSymptomInput = {
  child_id: string;
  episode_id?: string | null;
  symptom_type: string;
  severity: string;
  temperature_c?: number | null;
  temperature_method?: string | null;
  logged_at: string;
  notes?: string | null;
};

export type UpdateSymptomInput = {
  episode_id?: string | null;
  symptom_type?: string;
  severity?: string;
  temperature_c?: number | null;
  temperature_method?: string | null;
  logged_at?: string;
  notes?: string | null;
};

export type CreateEpisodeInput = {
  child_id: string;
  episode_type: string;
  started_at: string;
  summary?: string | null;
};

export type UpdateEpisodeInput = {
  started_at?: string;
  summary?: string | null;
};

export type CreateEpisodeEventInput = {
  episode_id: string;
  child_id: string;
  event_type: string;
  title: string;
  notes?: string | null;
  logged_at: string;
  source_kind?: string | null;
  source_id?: string | null;
};

export type SaveSymptomWithEpisodeEventInput = {
  childId: string;
  existingSymptom?: Pick<SymptomEntry, "id" | "episode_id" | "logged_at"> | null;
  symptom: CreateSymptomInput | UpdateSymptomInput;
  episodeEvent?: Omit<CreateEpisodeEventInput, "child_id" | "source_id"> | null;
  updateEpisodeStartedAt?: { episodeId: string; startedAt: string } | null;
};

export type DeleteSymptomWithGeneratedEventInput = Pick<SymptomEntry, "id" | "episode_id" | "logged_at">;

export type LinkedSymptomForEpisode = {
  symptom: SymptomEntry;
  eventTitle: string;
};

export type StartEpisodeWithLinkedSymptomsInput = {
  episode: CreateEpisodeInput;
  linkedSymptoms: LinkedSymptomForEpisode[];
};

export type CreateAlertInput = {
  child_id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  related_log_id?: string | null;
};

export interface CareRepository {
  recordSymptom(input: CreateSymptomInput): Promise<SymptomEntry>;
  updateSymptom(entryId: string, updates: UpdateSymptomInput): Promise<void>;
  deleteSymptom(entryId: string): Promise<void>;
  listSymptoms(childId: string, limit?: number): Promise<SymptomEntry[]>;
  listSymptomsInRange(childId: string, startDate: string, endDate: string): Promise<SymptomEntry[]>;
  saveSymptomWithEpisodeEvent(input: SaveSymptomWithEpisodeEventInput): Promise<SymptomEntry | null>;
  deleteSymptomWithGeneratedEvent(input: DeleteSymptomWithGeneratedEventInput): Promise<void>;
  startEpisode(input: CreateEpisodeInput): Promise<Episode>;
  startEpisodeWithLinkedSymptoms(input: StartEpisodeWithLinkedSymptomsInput): Promise<Episode>;
  getActiveEpisode(childId: string): Promise<Episode | null>;
  listActiveEpisodes(childId: string): Promise<Episode[]>;
  listRecentEpisodes(childId: string, limit?: number): Promise<Episode[]>;
  listEpisodesInRange(childId: string, startDate: string, endDate: string): Promise<Episode[]>;
  updateEpisode(entryId: string, updates: UpdateEpisodeInput): Promise<void>;
  resolveEpisode(entryId: string, input: { ended_at: string; outcome?: string | null }): Promise<void>;
  addEpisodeEvent(input: CreateEpisodeEventInput): Promise<EpisodeEvent>;
  deleteGeneratedSymptomEvent(input: { symptomId: string; episodeId?: string | null; loggedAt?: string | null }): Promise<void>;
  listEpisodeEvents(episodeId: string): Promise<EpisodeEvent[]>;
  listEpisodeEventsForChild(childId: string, limit?: number): Promise<EpisodeEvent[]>;
  listEpisodeEventsInRange(childId: string, startDate: string, endDate: string): Promise<EpisodeEvent[]>;
  listActiveAlerts(childId: string): Promise<Alert[]>;
  recordAlert(input: CreateAlertInput): Promise<Alert>;
  hasAlertForLog(childId: string, alertType: string, relatedLogId: string): Promise<boolean>;
  dismissAlert(alertId: string): Promise<void>;
}

export type CreateGrowthInput = {
  child_id: string;
  measured_at: string;
  weight_kg?: number | null;
  height_cm?: number | null;
  head_circumference_cm?: number | null;
  notes?: string | null;
};

export type UpdateGrowthInput = {
  measured_at?: string;
  weight_kg?: number | null;
  height_cm?: number | null;
  head_circumference_cm?: number | null;
  notes?: string | null;
};

export interface GrowthRepository {
  recordGrowth(input: CreateGrowthInput): Promise<GrowthEntry>;
  listGrowthLogs(childId: string, limit?: number): Promise<GrowthEntry[]>;
  listGrowthLogsInRange(childId: string, startDate: string, endDate: string): Promise<GrowthEntry[]>;
  getLatestGrowth(childId: string): Promise<GrowthEntry | null>;
  updateGrowth(entryId: string, updates: UpdateGrowthInput): Promise<void>;
  deleteGrowth(entryId: string): Promise<void>;
}

export type CreateMilestoneInput = {
  child_id: string;
  milestone_type: string;
  logged_at: string;
  notes?: string | null;
};

export interface MilestoneRepository {
  recordMilestone(input: CreateMilestoneInput): Promise<MilestoneEntry>;
  listMilestones(childId: string, limit?: number): Promise<MilestoneEntry[]>;
  listMilestonesInRange(childId: string, startDate: string, endDate: string): Promise<MilestoneEntry[]>;
  deleteMilestone(entryId: string): Promise<void>;
}

export type QuickPresetInput = {
  label: string;
  description?: string | null;
  draft_json: string;
  sort_order: number;
};

export interface SettingsRepository {
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
  deleteSetting(key: string): Promise<void>;
  listQuickPresets(childId: string, kind: QuickPresetEntry["kind"]): Promise<QuickPresetEntry[]>;
  replaceQuickPresets(childId: string, kind: QuickPresetEntry["kind"], presets: QuickPresetInput[]): Promise<void>;
}

export interface AttachmentRepository {
  deleteAttachmentMetadata(attachmentId: string): Promise<void>;
  deleteAttachmentMetadataForOwner(ownerTable: string, ownerId: string): Promise<void>;
}

export type ReportSourceRequest = {
  childId: string;
  startDate: string;
  endDate: string;
  options: ReportOptions;
};

export interface ReportSourceRepository {
  getLatestActivityDate(childId: string): Promise<string | null>;
  getSourceData(input: ReportSourceRequest): Promise<ReportSourceData>;
}

export interface AppRepositories {
  children: ChildRepository;
  caregivers: CaregiverRepository;
  elimination: EliminationRepository;
  feeding: FeedingRepository;
  sleep: SleepRepository;
  care: CareRepository;
  growth: GrowthRepository;
  milestones: MilestoneRepository;
  settings: SettingsRepository;
  attachments: AttachmentRepository;
  reportSource: ReportSourceRepository;
}

export type { Attachment, Caregiver, ChildCaregiver };
