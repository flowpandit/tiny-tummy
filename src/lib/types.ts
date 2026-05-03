export interface Child {
  id: string;
  name: string;
  date_of_birth: string;
  sex: ChildSex | null;
  feeding_type: FeedingType;
  avatar_color: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export type UnitSystem = "metric" | "imperial";
export type TemperatureUnit = "celsius" | "fahrenheit";
export type ChildSex = "male" | "female";

export type FeedingType = "breast" | "formula" | "mixed" | "solids";

export interface PoopEntry {
  id: string;
  child_id: string;
  logged_at: string;
  stool_type: number | null;
  color: StoolColor | null;
  size: StoolSize | null;
  is_no_poop: number;
  notes: string | null;
  photo_path: string | null;
  created_at: string;
  updated_at: string;
}

export type DiaperType = "wet" | "dirty" | "mixed";

export type UrineColor = "pale" | "normal" | "dark";

export interface DiaperEntry {
  id: string;
  child_id: string;
  logged_at: string;
  diaper_type: DiaperType;
  urine_color: UrineColor | null;
  stool_type: number | null;
  color: StoolColor | null;
  size: StoolSize | null;
  notes: string | null;
  photo_path: string | null;
  linked_poop_log_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PoopLogDraft {
  stool_type: number | null;
  color: StoolColor | null;
  size: StoolSize | null;
  notes: string;
}

export interface DiaperLogDraft {
  diaper_type: DiaperType | null;
  urine_color: UrineColor | null;
  stool_type: number | null;
  color: StoolColor | null;
  size: StoolSize | null;
  notes: string;
}

export type StoolColor =
  | "yellow"
  | "green"
  | "brown"
  | "black"
  | "red"
  | "white"
  | "orange";

export type StoolSize = "small" | "medium" | "large";

export interface Alert {
  id: string;
  child_id: string;
  alert_type: string;
  severity: "info" | "warning" | "urgent";
  title: string;
  message: string;
  is_dismissed: number;
  triggered_at: string;
  related_log_id: string | null;
}

export interface GuidanceTip {
  id: string;
  category: string;
  title: string;
  body: string;
  severity: "info" | "caution" | "urgent";
}

export type HealthStatus = "healthy" | "caution" | "alert" | "unknown";

export interface SymptomEntry {
  id: string;
  child_id: string;
  episode_id: string | null;
  symptom_type: SymptomType;
  severity: SymptomSeverity;
  temperature_c: number | null;
  logged_at: string;
  notes: string | null;
  created_at: string;
}

export type SymptomType =
  | "fever"
  | "cough_congestion"
  | "low_appetite"
  | "low_energy"
  | "straining"
  | "pain"
  | "rash"
  | "vomiting"
  | "blood_concern"
  | "dehydration_concern"
  | "diarrhoea"
  | "other";

export type SymptomSeverity = "mild" | "moderate" | "severe";

export interface GrowthEntry {
  id: string;
  child_id: string;
  measured_at: string;
  weight_kg: number | null;
  height_cm: number | null;
  head_circumference_cm: number | null;
  notes: string | null;
  created_at: string;
}

export interface GrowthLogDraft {
  weight_kg: string;
  height_cm: string;
  head_circumference_cm: string;
  notes: string;
}

export interface SleepEntry {
  id: string;
  child_id: string;
  sleep_type: SleepType;
  started_at: string;
  ended_at: string;
  notes: string | null;
  created_at: string;
}

export interface SleepLogDraft {
  sleep_type: SleepType;
  notes: string;
}

export type SleepType = "nap" | "night";

export interface MilestoneEntry {
  id: string;
  child_id: string;
  milestone_type: MilestoneType;
  logged_at: string;
  notes: string | null;
  created_at: string;
}

export interface MilestoneLogDraft {
  milestone_type: MilestoneType;
  notes: string;
}

export type MilestoneType =
  | "started_solids"
  | "teething"
  | "medication_started"
  | "allergy_concern"
  | "illness"
  | "travel_or_daycare_change"
  | "toilet_training_interest";

export interface FeedingEntry {
  id: string;
  child_id: string;
  logged_at: string;
  food_type: FoodType;
  food_name: string | null;
  amount_ml: number | null;
  duration_minutes: number | null;
  breast_side: BreastSide | null;
  bottle_content: BottleContent | null;
  reaction_notes: string | null;
  is_constipation_support: number;
  notes: string | null;
  created_at: string;
}

export interface FeedingLogDraft {
  food_type: FoodType | null;
  food_name: string;
  amount_ml: string;
  duration_minutes: string;
  breast_side: BreastSide | null;
  bottle_content: BottleContent | null;
  reaction_notes: string;
  is_constipation_support: boolean;
  notes: string;
}

export type DietEntry = FeedingEntry;
export type DietLogDraft = FeedingLogDraft;

export type FoodType =
  | "breast_milk"
  | "formula"
  | "bottle"
  | "pumping"
  | "solids"
  | "water"
  | "other";

export type BreastSide = "left" | "right" | "both";

export type BottleContent = "breast_milk" | "formula" | "mixed";

export interface Episode {
  id: string;
  child_id: string;
  episode_type: EpisodeType;
  status: EpisodeStatus;
  started_at: string;
  ended_at: string | null;
  summary: string | null;
  outcome: string | null;
  created_at: string;
  updated_at: string;
}

export type EpisodeType =
  | "fever_illness"
  | "stomach_bug"
  | "vomiting"
  | "rash_skin"
  | "medication_reaction"
  | "constipation"
  | "diarrhoea"
  | "other";

export type EpisodeStatus = "active" | "resolved";

export interface EpisodeEvent {
  id: string;
  episode_id: string;
  child_id: string;
  event_type: EpisodeEventType;
  title: string;
  notes: string | null;
  logged_at: string;
  created_at: string;
}

export type EpisodeEventType =
  | "symptom"
  | "temperature"
  | "hydration"
  | "food"
  | "medication"
  | "intervention"
  | "progress";

export interface DailyFrequency {
  date: string;
  count: number;
}

export interface ConsistencyPoint {
  logged_at: string;
  stool_type: number;
}

export interface ColorCount {
  color: string;
  count: number;
}

export type QuickPresetKind = "poop" | "feed";

export interface QuickPresetEntry {
  id: string;
  child_id: string;
  kind: QuickPresetKind;
  label: string;
  description: string | null;
  draft_json: string;
  sort_order: number;
  is_enabled: number;
  created_at: string;
  updated_at: string;
}

export interface TimelineEvent {
  id: string;
  type: "poop" | "meal" | "diaper";
  logged_at: string;
  label: string;
  color?: string;
}
