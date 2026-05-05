export const SYNC_OUTBOX_ENTITY_TYPES = [
  "child",
  "caregiver",
  "child_caregiver",
  "poop_log",
  "diaper_log",
  "diet_log",
  "sleep_log",
  "symptom_log",
  "episode",
  "episode_event",
  "growth_log",
  "milestone_log",
  "quick_preset",
  "attachment",
] as const;

export type SyncOutboxEntityType = typeof SYNC_OUTBOX_ENTITY_TYPES[number];

export const SYNC_OUTBOX_ENTITY_TABLES = {
  child: "children",
  caregiver: "caregivers",
  child_caregiver: "child_caregivers",
  poop_log: "poop_logs",
  diaper_log: "diaper_logs",
  diet_log: "diet_logs",
  sleep_log: "sleep_logs",
  symptom_log: "symptom_logs",
  episode: "episodes",
  episode_event: "episode_events",
  growth_log: "growth_logs",
  milestone_log: "milestone_logs",
  quick_preset: "quick_presets",
  attachment: "attachments",
} as const satisfies Record<SyncOutboxEntityType, string>;

export type SyncOutboxEntityTable = typeof SYNC_OUTBOX_ENTITY_TABLES[SyncOutboxEntityType];

export const SYNC_OUTBOX_OPERATIONS = [
  "create",
  "update",
  "delete",
  "link",
  "unlink",
] as const;

export type SyncOutboxOperation = typeof SYNC_OUTBOX_OPERATIONS[number];

export const SYNC_OUTBOX_STATUSES = [
  "pending",
  "processing",
  "processed",
  "failed",
  "ignored",
] as const;

export type SyncOutboxStatus = typeof SYNC_OUTBOX_STATUSES[number];

export type SyncOutboxPayload = Record<string, unknown>;

export interface SyncOutboxChangeInput {
  entity: SyncOutboxEntityType;
  entityId: string;
  operation: SyncOutboxOperation;
  childId?: string | null;
  payload?: SyncOutboxPayload | null;
  deviceId?: string | null;
  localOnly?: boolean | number | null;
}

export interface SyncOutboxRow {
  id: string;
  entity_table: SyncOutboxEntityTable;
  entity_id: string;
  child_id: string | null;
  operation: SyncOutboxOperation;
  payload_json: string | null;
  created_at: string;
  updated_at: string;
  attempted_at: string | null;
  processed_at: string | null;
  status: SyncOutboxStatus;
  retry_count: number;
  error_message: string | null;
  device_id: string | null;
  local_only: number;
}

export interface ListPendingSyncOutboxOptions {
  limit?: number;
  childId?: string;
  entity?: SyncOutboxEntityType;
}

export interface SyncOutboxSummary {
  total: number;
  pending: number;
  processing: number;
  processed: number;
  failed: number;
  ignored: number;
}

export function getSyncOutboxEntityTable(entity: SyncOutboxEntityType): SyncOutboxEntityTable {
  return SYNC_OUTBOX_ENTITY_TABLES[entity];
}

export function getSyncOutboxLocalOnlyValue(value: boolean | number | null | undefined): number {
  return value === true || value === 1 ? 1 : 0;
}

