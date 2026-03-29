export interface Child {
  id: string;
  name: string;
  date_of_birth: string;
  feeding_type: FeedingType;
  avatar_color: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

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

export interface DietEntry {
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

export type EpisodeType = "constipation" | "diarrhoea" | "solids_transition";

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
  | "hydration"
  | "food"
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

export interface TimelineEvent {
  id: string;
  type: "poop" | "meal";
  logged_at: string;
  label: string;
  color?: string;
}
