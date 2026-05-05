import type {
  Alert,
  Attachment,
  Caregiver,
  Child,
  ChildCaregiver,
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
} from "./types"
import { TEMPERATURE_UNIT_SETTING_KEY, UNIT_SYSTEM_SETTING_KEY } from "./units"

export const TINY_TUMMY_SNAPSHOT_SCHEMA_VERSION = 1
export const TINY_TUMMY_SNAPSHOT_APP_NAME = "Tiny Tummy"

export type SnapshotExportKind = "full_backup" | "child_backup" | "clinical_export"
export type SnapshotAttachmentPolicy = "metadata_only" | "local_paths_only" | "embedded_files_not_supported_yet"
export type SnapshotMergeStrategy = "skip_existing" | "replace_if_newer" | "keep_local"

export type ChildSnapshot = Child
export type CaregiverSnapshot = Caregiver
export type ChildCaregiverSnapshot = ChildCaregiver
export type PoopLogSnapshot = PoopEntry
export type DiaperLogSnapshot = DiaperEntry
export type DietLogSnapshot = FeedingEntry
export type SleepLogSnapshot = SleepEntry
export type SymptomLogSnapshot = SymptomEntry
export type HealthEpisodeSnapshot = Episode
export type EpisodeEventSnapshot = EpisodeEvent
export type GrowthLogSnapshot = GrowthEntry
export type MilestoneLogSnapshot = MilestoneEntry
export type QuickPresetSnapshot = QuickPresetEntry
export type AlertSnapshot = Alert
export type AttachmentSnapshot = Attachment

export interface AppSettingSnapshot {
  key: string
  value: string
}

export interface TinyTummySnapshotLogsV1 {
  poop_logs: PoopLogSnapshot[]
  diaper_logs: DiaperLogSnapshot[]
  diet_logs: DietLogSnapshot[]
  sleep_logs: SleepLogSnapshot[]
  symptoms: SymptomLogSnapshot[]
  health_episodes: HealthEpisodeSnapshot[]
  episode_events: EpisodeEventSnapshot[]
  growth_logs: GrowthLogSnapshot[]
  milestone_logs: MilestoneLogSnapshot[]
  quick_presets: QuickPresetSnapshot[]
  alerts: AlertSnapshot[]
}

export interface TinyTummySnapshotMetadataV1 {
  app_version?: string | null
  platform?: string | null
  generated_by: "tiny-tummy-export-import-service"
  notes: string[]
}

export interface TinyTummySnapshotV1 {
  schema_version: 1
  app_name: "Tiny Tummy"
  exported_at: string
  export_id: string
  device_id: string | null
  export_kind: SnapshotExportKind
  includes_deleted: boolean
  includes_attachments: boolean
  attachment_policy: SnapshotAttachmentPolicy
  children: ChildSnapshot[]
  caregivers: CaregiverSnapshot[]
  child_caregivers: ChildCaregiverSnapshot[]
  logs: TinyTummySnapshotLogsV1
  attachments: AttachmentSnapshot[]
  settings?: AppSettingSnapshot[]
  metadata: TinyTummySnapshotMetadataV1
}

export type SnapshotRecordTableName =
  | "children"
  | "caregivers"
  | "child_caregivers"
  | "poop_logs"
  | "diaper_logs"
  | "diet_logs"
  | "sleep_logs"
  | "symptom_logs"
  | "episodes"
  | "episode_events"
  | "growth_logs"
  | "milestone_logs"
  | "quick_presets"
  | "alerts"
  | "attachments"
  | "app_settings"

export type SnapshotRecordGroup = {
  table: SnapshotRecordTableName
  rows: Array<Record<string, unknown>>
}

export interface SnapshotValidationIssue {
  path: string
  message: string
}

export interface SnapshotValidationResult {
  ok: boolean
  errors: SnapshotValidationIssue[]
  warnings: SnapshotValidationIssue[]
}

export interface SnapshotTableCount {
  total: number
  deleted: number
}

export interface SnapshotSummary {
  schemaVersion: number | null
  exportKind: SnapshotExportKind | null
  exportedAt: string | null
  childCount: number
  caregiverCount: number
  attachmentCount: number
  settingsCount: number
  deletedRecordCount: number
  logCounts: Record<keyof TinyTummySnapshotLogsV1, number>
  tableCounts: Record<SnapshotRecordTableName, SnapshotTableCount>
  humanSummary: string
  notes: string[]
}

const EXPORT_KINDS = new Set<SnapshotExportKind>(["full_backup", "child_backup", "clinical_export"])
const ATTACHMENT_POLICIES = new Set<SnapshotAttachmentPolicy>([
  "metadata_only",
  "local_paths_only",
  "embedded_files_not_supported_yet",
])

export const SNAPSHOT_SAFE_GLOBAL_SETTING_KEYS = new Set([
  "theme",
  "night_mode_enabled",
  "night_mode_start",
  "night_mode_end",
  UNIT_SYSTEM_SETTING_KEY,
  TEMPERATURE_UNIT_SETTING_KEY,
])

const SNAPSHOT_EXCLUDED_SETTING_KEYS = new Set([
  "premium_unlocked",
  "premium_platform",
  "premium_product_id",
  "trial_started_at",
  "trial_last_seen_at",
  "app_is_premium",
  "app_first_launched_at",
])

const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === "string"
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean"
}

function isIsoUtc(value: unknown): value is string {
  return isString(value) && ISO_UTC_PATTERN.test(value) && !Number.isNaN(Date.parse(value))
}

function pushIssue(issues: SnapshotValidationIssue[], path: string, message: string): void {
  issues.push({ path, message })
}

function readArray(
  root: Record<string, unknown>,
  key: string,
  errors: SnapshotValidationIssue[],
  path = key,
): unknown[] {
  const value = root[key]
  if (!Array.isArray(value)) {
    pushIssue(errors, path, "Expected an array.")
    return []
  }
  return value
}

function readNestedArray(
  root: Record<string, unknown>,
  key: keyof TinyTummySnapshotLogsV1,
  errors: SnapshotValidationIssue[],
): unknown[] {
  const logs = root.logs
  if (!isRecord(logs)) {
    pushIssue(errors, "logs", "Expected logs to be an object.")
    return []
  }

  const value = logs[key]
  if (!Array.isArray(value)) {
    pushIssue(errors, `logs.${key}`, "Expected an array.")
    return []
  }

  return value
}

function requireStringId(row: unknown, path: string, errors: SnapshotValidationIssue[]): string | null {
  if (!isRecord(row)) {
    pushIssue(errors, path, "Expected an object.")
    return null
  }

  if (!isString(row.id) || row.id.trim() === "") {
    pushIssue(errors, `${path}.id`, "Required ID is missing.")
    return null
  }

  return row.id
}

function requireStringField(
  row: unknown,
  field: string,
  path: string,
  errors: SnapshotValidationIssue[],
): string | null {
  if (!isRecord(row) || !isString(row[field]) || String(row[field]).trim() === "") {
    pushIssue(errors, `${path}.${field}`, `Required ${field} is missing.`)
    return null
  }

  return String(row[field])
}

function validateTimestampField(
  row: unknown,
  field: string,
  path: string,
  errors: SnapshotValidationIssue[],
  options: { optional?: boolean } = {},
): void {
  if (!isRecord(row)) return
  const value = row[field]
  if ((value === null || value === undefined) && options.optional) return
  if (!isIsoUtc(value)) {
    pushIssue(errors, `${path}.${field}`, "Expected an ISO UTC timestamp ending in Z.")
  }
}

function collectIds(rows: unknown[], path: string, errors: SnapshotValidationIssue[]): Set<string> {
  const ids = new Set<string>()

  rows.forEach((row, index) => {
    const id = requireStringId(row, `${path}[${index}]`, errors)
    if (id) ids.add(id)
  })

  return ids
}

function countDeleted(rows: Array<Record<string, unknown>>): number {
  return rows.filter((row) => Boolean(row.deleted_at)).length
}

function tableCount(rows: Array<Record<string, unknown>>): SnapshotTableCount {
  return {
    total: rows.length,
    deleted: countDeleted(rows),
  }
}

function rowIdForTable(table: SnapshotRecordTableName, row: Record<string, unknown>): string | null {
  const value = table === "app_settings" ? row.key : row.id
  return isString(value) && value.trim() ? value : null
}

function asRecordRows<T extends object>(rows: T[]): Array<Record<string, unknown>> {
  return rows as unknown as Array<Record<string, unknown>>
}

export function getSnapshotRecordId(table: SnapshotRecordTableName, row: Record<string, unknown>): string | null {
  return rowIdForTable(table, row)
}

export function getSnapshotRecordUpdatedAt(table: SnapshotRecordTableName, row: Record<string, unknown>): string | null {
  if (table === "app_settings") return null
  return isString(row.updated_at) ? row.updated_at : null
}

export function isSnapshotSettingSafe(key: string, childIds: Set<string>): boolean {
  if (SNAPSHOT_EXCLUDED_SETTING_KEYS.has(key)) return false
  if (SNAPSHOT_SAFE_GLOBAL_SETTING_KEYS.has(key)) return true

  if (key.startsWith("elimination_view:")) {
    const childId = key.slice("elimination_view:".length)
    return childIds.has(childId)
  }

  return false
}

export function filterSnapshotSafeSettings(
  settings: AppSettingSnapshot[],
  childIds: Set<string>,
): AppSettingSnapshot[] {
  return settings.filter((setting) => isSnapshotSettingSafe(setting.key, childIds))
}

export function getSnapshotRecordGroups(snapshot: TinyTummySnapshotV1): SnapshotRecordGroup[] {
  return [
    { table: "children", rows: asRecordRows(snapshot.children) },
    { table: "caregivers", rows: asRecordRows(snapshot.caregivers) },
    { table: "child_caregivers", rows: asRecordRows(snapshot.child_caregivers) },
    { table: "poop_logs", rows: asRecordRows(snapshot.logs.poop_logs) },
    { table: "diaper_logs", rows: asRecordRows(snapshot.logs.diaper_logs) },
    { table: "diet_logs", rows: asRecordRows(snapshot.logs.diet_logs) },
    { table: "sleep_logs", rows: asRecordRows(snapshot.logs.sleep_logs) },
    { table: "symptom_logs", rows: asRecordRows(snapshot.logs.symptoms) },
    { table: "episodes", rows: asRecordRows(snapshot.logs.health_episodes) },
    { table: "episode_events", rows: asRecordRows(snapshot.logs.episode_events) },
    { table: "growth_logs", rows: asRecordRows(snapshot.logs.growth_logs) },
    { table: "milestone_logs", rows: asRecordRows(snapshot.logs.milestone_logs) },
    { table: "quick_presets", rows: asRecordRows(snapshot.logs.quick_presets) },
    { table: "alerts", rows: asRecordRows(snapshot.logs.alerts) },
    { table: "attachments", rows: asRecordRows(snapshot.attachments) },
    { table: "app_settings", rows: asRecordRows(snapshot.settings ?? []) },
  ]
}

export function validateTinyTummySnapshot(snapshot: unknown): SnapshotValidationResult {
  const errors: SnapshotValidationIssue[] = []
  const warnings: SnapshotValidationIssue[] = []

  if (!isRecord(snapshot)) {
    return {
      ok: false,
      errors: [{ path: "$", message: "Snapshot must be an object." }],
      warnings,
    }
  }

  if (snapshot.schema_version !== TINY_TUMMY_SNAPSHOT_SCHEMA_VERSION) {
    pushIssue(errors, "schema_version", "Unsupported Tiny Tummy snapshot schema version.")
    return { ok: false, errors, warnings }
  }

  if (snapshot.app_name !== TINY_TUMMY_SNAPSHOT_APP_NAME) {
    pushIssue(errors, "app_name", "Snapshot app name must be Tiny Tummy.")
  }

  if (!isIsoUtc(snapshot.exported_at)) {
    pushIssue(errors, "exported_at", "Expected an ISO UTC timestamp ending in Z.")
  }

  if (!isString(snapshot.export_id) || snapshot.export_id.trim() === "") {
    pushIssue(errors, "export_id", "Required export ID is missing.")
  }

  if (snapshot.device_id !== null && snapshot.device_id !== undefined && !isString(snapshot.device_id)) {
    pushIssue(errors, "device_id", "Device ID must be a string or null.")
  }

  if (!isString(snapshot.export_kind) || !EXPORT_KINDS.has(snapshot.export_kind as SnapshotExportKind)) {
    pushIssue(errors, "export_kind", "Unsupported export kind.")
  }

  if (!isBoolean(snapshot.includes_deleted)) {
    pushIssue(errors, "includes_deleted", "Expected a boolean.")
  }

  if (!isBoolean(snapshot.includes_attachments)) {
    pushIssue(errors, "includes_attachments", "Expected a boolean.")
  }

  if (!isString(snapshot.attachment_policy) || !ATTACHMENT_POLICIES.has(snapshot.attachment_policy as SnapshotAttachmentPolicy)) {
    pushIssue(errors, "attachment_policy", "Unsupported attachment policy.")
  }

  if (!isRecord(snapshot.metadata)) {
    pushIssue(errors, "metadata", "Expected metadata to be an object.")
  }

  const children = readArray(snapshot, "children", errors)
  const caregivers = readArray(snapshot, "caregivers", errors)
  const childCaregivers = readArray(snapshot, "child_caregivers", errors)
  const attachments = readArray(snapshot, "attachments", errors)
  const settings = snapshot.settings === undefined ? [] : readArray(snapshot, "settings", errors)

  const poopLogs = readNestedArray(snapshot, "poop_logs", errors)
  const diaperLogs = readNestedArray(snapshot, "diaper_logs", errors)
  const dietLogs = readNestedArray(snapshot, "diet_logs", errors)
  const sleepLogs = readNestedArray(snapshot, "sleep_logs", errors)
  const symptoms = readNestedArray(snapshot, "symptoms", errors)
  const healthEpisodes = readNestedArray(snapshot, "health_episodes", errors)
  const episodeEvents = readNestedArray(snapshot, "episode_events", errors)
  const growthLogs = readNestedArray(snapshot, "growth_logs", errors)
  const milestoneLogs = readNestedArray(snapshot, "milestone_logs", errors)
  const quickPresets = readNestedArray(snapshot, "quick_presets", errors)
  const alerts = readNestedArray(snapshot, "alerts", errors)

  const childIds = collectIds(children, "children", errors)
  const caregiverIds = collectIds(caregivers, "caregivers", errors)
  const episodeIds = collectIds(healthEpisodes, "logs.health_episodes", errors)
  const poopIds = collectIds(poopLogs, "logs.poop_logs", errors)

  collectIds(childCaregivers, "child_caregivers", errors)
  collectIds(diaperLogs, "logs.diaper_logs", errors)
  collectIds(dietLogs, "logs.diet_logs", errors)
  collectIds(sleepLogs, "logs.sleep_logs", errors)
  collectIds(symptoms, "logs.symptoms", errors)
  collectIds(episodeEvents, "logs.episode_events", errors)
  collectIds(growthLogs, "logs.growth_logs", errors)
  collectIds(milestoneLogs, "logs.milestone_logs", errors)
  collectIds(quickPresets, "logs.quick_presets", errors)
  collectIds(alerts, "logs.alerts", errors)
  collectIds(attachments, "attachments", errors)

  children.forEach((row, index) => {
    validateTimestampField(row, "created_at", `children[${index}]`, errors)
    validateTimestampField(row, "updated_at", `children[${index}]`, errors)
    validateTimestampField(row, "deleted_at", `children[${index}]`, errors, { optional: true })
  })

  caregivers.forEach((row, index) => {
    validateTimestampField(row, "created_at", `caregivers[${index}]`, errors)
    validateTimestampField(row, "updated_at", `caregivers[${index}]`, errors)
    validateTimestampField(row, "deleted_at", `caregivers[${index}]`, errors, { optional: true })
  })

  childCaregivers.forEach((row, index) => {
    const path = `child_caregivers[${index}]`
    const childId = requireStringField(row, "child_id", path, errors)
    const caregiverId = requireStringField(row, "caregiver_id", path, errors)
    if (childId && !childIds.has(childId)) pushIssue(errors, `${path}.child_id`, "Child-caregiver link references a missing child.")
    if (caregiverId && !caregiverIds.has(caregiverId)) pushIssue(errors, `${path}.caregiver_id`, "Child-caregiver link references a missing caregiver.")
    validateTimestampField(row, "created_at", path, errors)
    validateTimestampField(row, "updated_at", path, errors)
    validateTimestampField(row, "deleted_at", path, errors, { optional: true })
  })

  const childScopedRows: Array<{ rows: unknown[]; path: string; timestamp: string }> = [
    { rows: poopLogs, path: "logs.poop_logs", timestamp: "logged_at" },
    { rows: diaperLogs, path: "logs.diaper_logs", timestamp: "logged_at" },
    { rows: dietLogs, path: "logs.diet_logs", timestamp: "logged_at" },
    { rows: sleepLogs, path: "logs.sleep_logs", timestamp: "started_at" },
    { rows: symptoms, path: "logs.symptoms", timestamp: "logged_at" },
    { rows: healthEpisodes, path: "logs.health_episodes", timestamp: "started_at" },
    { rows: episodeEvents, path: "logs.episode_events", timestamp: "logged_at" },
    { rows: growthLogs, path: "logs.growth_logs", timestamp: "measured_at" },
    { rows: milestoneLogs, path: "logs.milestone_logs", timestamp: "logged_at" },
    { rows: quickPresets, path: "logs.quick_presets", timestamp: "created_at" },
    { rows: alerts, path: "logs.alerts", timestamp: "triggered_at" },
  ]

  childScopedRows.forEach(({ rows, path, timestamp }) => {
    rows.forEach((row, index) => {
      const rowPath = `${path}[${index}]`
      const childId = requireStringField(row, "child_id", rowPath, errors)
      if (childId && !childIds.has(childId)) pushIssue(errors, `${rowPath}.child_id`, "Log references a missing child.")
      validateTimestampField(row, timestamp, rowPath, errors)
      validateTimestampField(row, "created_at", rowPath, errors)
      validateTimestampField(row, "updated_at", rowPath, errors)
      validateTimestampField(row, "deleted_at", rowPath, errors, { optional: true })
    })
  })

  sleepLogs.forEach((row, index) => {
    validateTimestampField(row, "ended_at", `logs.sleep_logs[${index}]`, errors)
  })

  symptoms.forEach((row, index) => {
    if (!isRecord(row)) return
    const episodeId = row.episode_id
    if (episodeId !== null && episodeId !== undefined && (!isString(episodeId) || !episodeIds.has(episodeId))) {
      pushIssue(errors, `logs.symptoms[${index}].episode_id`, "Symptom references a missing episode.")
    }
  })

  healthEpisodes.forEach((row, index) => {
    validateTimestampField(row, "ended_at", `logs.health_episodes[${index}]`, errors, { optional: true })
  })

  episodeEvents.forEach((row, index) => {
    const path = `logs.episode_events[${index}]`
    const episodeId = requireStringField(row, "episode_id", path, errors)
    if (episodeId && !episodeIds.has(episodeId)) pushIssue(errors, `${path}.episode_id`, "Episode event references a missing episode.")
  })

  diaperLogs.forEach((row, index) => {
    if (!isRecord(row)) return
    const linkedPoopId = row.linked_poop_log_id
    if (linkedPoopId !== null && linkedPoopId !== undefined && (!isString(linkedPoopId) || !poopIds.has(linkedPoopId))) {
      pushIssue(errors, `logs.diaper_logs[${index}].linked_poop_log_id`, "Diaper log references a missing linked poop log.")
    }
  })

  alerts.forEach((row, index) => {
    if (!isRecord(row)) return
    const relatedLogId = row.related_log_id
    if (relatedLogId !== null && relatedLogId !== undefined && !isString(relatedLogId)) {
      pushIssue(errors, `logs.alerts[${index}].related_log_id`, "Alert related log ID must be a string or null.")
    }
  })

  const supportedAttachmentOwners = new Set<SnapshotRecordTableName>([
    "poop_logs",
    "diaper_logs",
    "diet_logs",
    "sleep_logs",
    "symptom_logs",
    "episodes",
    "episode_events",
    "growth_logs",
    "milestone_logs",
    "quick_presets",
    "alerts",
    "children",
  ])

  attachments.forEach((row, index) => {
    const path = `attachments[${index}]`
    const ownerTable = requireStringField(row, "owner_table", path, errors)
    requireStringField(row, "owner_id", path, errors)
    requireStringField(row, "local_path", path, errors)
    if (ownerTable && !supportedAttachmentOwners.has(ownerTable as SnapshotRecordTableName)) {
      pushIssue(errors, `${path}.owner_table`, "Attachment owner table is unsupported.")
    }
    if (isRecord(row) && row.child_id !== null && row.child_id !== undefined) {
      const childId = requireStringField(row, "child_id", path, errors)
      if (childId && !childIds.has(childId)) pushIssue(errors, `${path}.child_id`, "Attachment references a missing child.")
    }
    validateTimestampField(row, "created_at", path, errors)
    validateTimestampField(row, "updated_at", path, errors)
    validateTimestampField(row, "deleted_at", path, errors, { optional: true })
  })

  settings.forEach((row, index) => {
    const path = `settings[${index}]`
    const key = requireStringField(row, "key", path, errors)
    requireStringField(row, "value", path, errors)
    if (key && !isSnapshotSettingSafe(key, childIds)) {
      pushIssue(warnings, `${path}.key`, "Setting is not part of the portable v1 preference allowlist and will be ignored on import.")
    }
  })

  return { ok: errors.length === 0, errors, warnings }
}

export function summarizeTinyTummySnapshot(snapshot: TinyTummySnapshotV1): SnapshotSummary {
  const logCounts: SnapshotSummary["logCounts"] = {
    poop_logs: snapshot.logs.poop_logs.length,
    diaper_logs: snapshot.logs.diaper_logs.length,
    diet_logs: snapshot.logs.diet_logs.length,
    sleep_logs: snapshot.logs.sleep_logs.length,
    symptoms: snapshot.logs.symptoms.length,
    health_episodes: snapshot.logs.health_episodes.length,
    episode_events: snapshot.logs.episode_events.length,
    growth_logs: snapshot.logs.growth_logs.length,
    milestone_logs: snapshot.logs.milestone_logs.length,
    quick_presets: snapshot.logs.quick_presets.length,
    alerts: snapshot.logs.alerts.length,
  }

  const tableCounts = Object.fromEntries(
    getSnapshotRecordGroups(snapshot).map((group) => [group.table, tableCount(group.rows)]),
  ) as Record<SnapshotRecordTableName, SnapshotTableCount>

  const deletedRecordCount = Object.values(tableCounts).reduce((total, count) => total + count.deleted, 0)
  const totalLogs = Object.values(logCounts).reduce((total, count) => total + count, 0)
  const childLabel = snapshot.children.length === 1 ? "1 child" : `${snapshot.children.length} children`
  const attachmentLabel = snapshot.attachments.length === 1 ? "1 attachment metadata record" : `${snapshot.attachments.length} attachment metadata records`
  const deletedLabel = snapshot.includes_deleted ? ` Includes ${deletedRecordCount} soft-deleted records.` : ""

  return {
    schemaVersion: snapshot.schema_version,
    exportKind: snapshot.export_kind,
    exportedAt: snapshot.exported_at,
    childCount: snapshot.children.length,
    caregiverCount: snapshot.caregivers.length,
    attachmentCount: snapshot.attachments.length,
    settingsCount: snapshot.settings?.length ?? 0,
    deletedRecordCount,
    logCounts,
    tableCounts,
    humanSummary: `${childLabel}, ${totalLogs} timeline records, ${snapshot.caregivers.length} caregivers, ${attachmentLabel}.${deletedLabel}`,
    notes: snapshot.metadata.notes,
  }
}
