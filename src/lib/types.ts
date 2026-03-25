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
  notes: string | null;
  created_at: string;
}

export type FoodType = "breast_milk" | "formula" | "solids" | "water" | "other";

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
