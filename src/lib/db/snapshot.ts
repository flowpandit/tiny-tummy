import type {
  AlertSnapshot,
  AppSettingSnapshot,
  AttachmentSnapshot,
  CaregiverSnapshot,
  ChildCaregiverSnapshot,
  ChildSnapshot,
  DiaperLogSnapshot,
  DietLogSnapshot,
  EpisodeEventSnapshot,
  GrowthLogSnapshot,
  HealthEpisodeSnapshot,
  MilestoneLogSnapshot,
  PoopLogSnapshot,
  QuickPresetSnapshot,
  SleepLogSnapshot,
  SnapshotRecordTableName,
  SymptomLogSnapshot,
  TinyTummySnapshotV1,
} from "../export-import-snapshot"
import {
  filterSnapshotSafeSettings,
  getSnapshotRecordGroups,
} from "../export-import-snapshot"
import { getDb } from "./connection"
import { executeMutation, withTransaction } from "./mutations"

type DbConnection = Awaited<ReturnType<typeof getDb>>

export interface SnapshotLoadInput {
  includeDeleted: boolean
  childId?: string
  includeAttachmentMetadata: boolean
  includeSettings: boolean
}

export interface SnapshotSourceData {
  children: ChildSnapshot[]
  caregivers: CaregiverSnapshot[]
  child_caregivers: ChildCaregiverSnapshot[]
  logs: {
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
  attachments: AttachmentSnapshot[]
  settings: AppSettingSnapshot[]
}

export interface SnapshotImportExistingRecord {
  id: string
  updated_at: string | null
}

export type SnapshotImportExistingRecords = Record<SnapshotRecordTableName, SnapshotImportExistingRecord[]>

type SnapshotColumnMap = Record<SnapshotRecordTableName, readonly string[]>

const SNAPSHOT_TABLE_COLUMNS: SnapshotColumnMap = {
  children: [
    "id",
    "name",
    "date_of_birth",
    "sex",
    "feeding_type",
    "avatar_color",
    "is_active",
    "created_at",
    "updated_at",
    "deleted_at",
    "device_id",
    "sync_status",
    "sync_version",
    "local_only",
  ],
  caregivers: [
    "id",
    "display_name",
    "role",
    "relationship",
    "email",
    "phone",
    "avatar_color",
    "is_primary",
    "created_at",
    "updated_at",
    "deleted_at",
    "device_id",
    "sync_status",
    "sync_version",
    "local_only",
  ],
  child_caregivers: [
    "id",
    "child_id",
    "caregiver_id",
    "relationship_to_child",
    "permissions",
    "created_at",
    "updated_at",
    "deleted_at",
    "device_id",
    "sync_status",
    "sync_version",
    "local_only",
  ],
  poop_logs: [
    "id",
    "child_id",
    "logged_at",
    "stool_type",
    "color",
    "size",
    "is_no_poop",
    "notes",
    "photo_path",
    "created_by_caregiver_id",
    "updated_by_caregiver_id",
    "created_at",
    "updated_at",
    "deleted_at",
    "device_id",
    "sync_status",
    "sync_version",
    "local_only",
  ],
  diaper_logs: [
    "id",
    "child_id",
    "logged_at",
    "diaper_type",
    "urine_color",
    "stool_type",
    "color",
    "size",
    "notes",
    "photo_path",
    "linked_poop_log_id",
    "created_by_caregiver_id",
    "updated_by_caregiver_id",
    "created_at",
    "updated_at",
    "deleted_at",
    "device_id",
    "sync_status",
    "sync_version",
    "local_only",
  ],
  diet_logs: [
    "id",
    "child_id",
    "logged_at",
    "food_type",
    "food_name",
    "notes",
    "amount_ml",
    "duration_minutes",
    "breast_side",
    "bottle_content",
    "reaction_notes",
    "is_constipation_support",
    "created_by_caregiver_id",
    "updated_by_caregiver_id",
    "created_at",
    "updated_at",
    "deleted_at",
    "device_id",
    "sync_status",
    "sync_version",
    "local_only",
  ],
  sleep_logs: [
    "id",
    "child_id",
    "sleep_type",
    "started_at",
    "ended_at",
    "notes",
    "created_by_caregiver_id",
    "updated_by_caregiver_id",
    "created_at",
    "updated_at",
    "deleted_at",
    "device_id",
    "sync_status",
    "sync_version",
    "local_only",
  ],
  symptom_logs: [
    "id",
    "child_id",
    "episode_id",
    "symptom_type",
    "severity",
    "temperature_c",
    "temperature_method",
    "logged_at",
    "notes",
    "created_by_caregiver_id",
    "updated_by_caregiver_id",
    "created_at",
    "updated_at",
    "deleted_at",
    "device_id",
    "sync_status",
    "sync_version",
    "local_only",
  ],
  episodes: [
    "id",
    "child_id",
    "episode_type",
    "status",
    "started_at",
    "ended_at",
    "summary",
    "outcome",
    "created_by_caregiver_id",
    "updated_by_caregiver_id",
    "created_at",
    "updated_at",
    "deleted_at",
    "device_id",
    "sync_status",
    "sync_version",
    "local_only",
  ],
  episode_events: [
    "id",
    "episode_id",
    "child_id",
    "event_type",
    "title",
    "notes",
    "logged_at",
    "source_kind",
    "source_id",
    "created_by_caregiver_id",
    "updated_by_caregiver_id",
    "created_at",
    "updated_at",
    "deleted_at",
    "device_id",
    "sync_status",
    "sync_version",
    "local_only",
  ],
  growth_logs: [
    "id",
    "child_id",
    "measured_at",
    "weight_kg",
    "height_cm",
    "head_circumference_cm",
    "notes",
    "created_by_caregiver_id",
    "updated_by_caregiver_id",
    "created_at",
    "updated_at",
    "deleted_at",
    "device_id",
    "sync_status",
    "sync_version",
    "local_only",
  ],
  milestone_logs: [
    "id",
    "child_id",
    "milestone_type",
    "logged_at",
    "notes",
    "created_by_caregiver_id",
    "updated_by_caregiver_id",
    "created_at",
    "updated_at",
    "deleted_at",
    "device_id",
    "sync_status",
    "sync_version",
    "local_only",
  ],
  quick_presets: [
    "id",
    "child_id",
    "kind",
    "label",
    "description",
    "draft_json",
    "sort_order",
    "is_enabled",
    "created_at",
    "updated_at",
    "deleted_at",
    "device_id",
    "sync_status",
    "sync_version",
    "local_only",
  ],
  alerts: [
    "id",
    "child_id",
    "alert_type",
    "severity",
    "title",
    "message",
    "is_dismissed",
    "triggered_at",
    "related_log_id",
    "created_at",
    "updated_at",
    "deleted_at",
    "device_id",
    "sync_status",
    "sync_version",
    "local_only",
  ],
  attachments: [
    "id",
    "owner_table",
    "owner_id",
    "child_id",
    "local_path",
    "mime_type",
    "file_size",
    "created_at",
    "updated_at",
    "deleted_at",
    "local_only",
    "attachment_sync_policy",
  ],
  app_settings: [
    "key",
    "value",
  ],
}

function deletedClause(includeDeleted: boolean): string {
  return includeDeleted ? "" : "deleted_at IS NULL"
}

function buildSelectSql(table: SnapshotRecordTableName, input: SnapshotLoadInput, childColumn?: string): { sql: string; params: unknown[] } {
  const clauses: string[] = []
  const params: unknown[] = []

  if (table !== "app_settings") {
    const clause = deletedClause(input.includeDeleted)
    if (clause) clauses.push(clause)
  }

  if (input.childId && childColumn) {
    clauses.push(`${childColumn} = ?`)
    params.push(input.childId)
  }

  return {
    sql: `SELECT * FROM ${table}${clauses.length > 0 ? ` WHERE ${clauses.join(" AND ")}` : ""}`,
    params,
  }
}

async function selectRows<T>(
  conn: DbConnection,
  table: SnapshotRecordTableName,
  input: SnapshotLoadInput,
  childColumn?: string,
): Promise<T[]> {
  const { sql, params } = buildSelectSql(table, input, childColumn)
  return conn.select<T[]>(sql, params)
}

async function selectCaregiversForChild(
  conn: DbConnection,
  caregiverIds: string[],
  includeDeleted: boolean,
): Promise<CaregiverSnapshot[]> {
  if (caregiverIds.length === 0) return []

  const placeholders = caregiverIds.map(() => "?").join(", ")
  const clauses = [`id IN (${placeholders})`]
  if (!includeDeleted) clauses.push("deleted_at IS NULL")

  return conn.select<CaregiverSnapshot[]>(
    `SELECT * FROM caregivers WHERE ${clauses.join(" AND ")}`,
    caregiverIds,
  )
}

function getSnapshotChildIds(source: Pick<SnapshotSourceData, "children">): Set<string> {
  return new Set(source.children.map((child) => child.id))
}

function addCaregiverId(target: Set<string>, caregiverId: string | null | undefined): void {
  if (caregiverId) target.add(caregiverId)
}

function getAttributedCaregiverIds(logs: SnapshotSourceData["logs"]): string[] {
  const caregiverIds = new Set<string>()
  const groups = [
    logs.poop_logs,
    logs.diaper_logs,
    logs.diet_logs,
    logs.sleep_logs,
    logs.symptoms,
    logs.health_episodes,
    logs.episode_events,
    logs.growth_logs,
    logs.milestone_logs,
  ]

  for (const rows of groups) {
    for (const row of rows) {
      addCaregiverId(caregiverIds, row.created_by_caregiver_id)
      addCaregiverId(caregiverIds, row.updated_by_caregiver_id)
    }
  }

  return [...caregiverIds]
}

function getFirstDeviceId(source: SnapshotSourceData): string | null {
  const groups = [
    source.children,
    source.caregivers,
    source.child_caregivers,
    source.logs.poop_logs,
    source.logs.diaper_logs,
    source.logs.diet_logs,
    source.logs.sleep_logs,
    source.logs.symptoms,
    source.logs.health_episodes,
    source.logs.episode_events,
    source.logs.growth_logs,
    source.logs.milestone_logs,
    source.logs.quick_presets,
    source.logs.alerts,
  ] as Array<Array<{ device_id?: string | null }>>

  for (const rows of groups) {
    const deviceId = rows.find((row) => row.device_id)?.device_id
    if (deviceId) return deviceId
  }

  return null
}

export function getSnapshotSourceDeviceId(source: SnapshotSourceData): string | null {
  return getFirstDeviceId(source)
}

export async function loadSnapshotSourceData(input: SnapshotLoadInput): Promise<SnapshotSourceData> {
  const conn = await getDb()
  const children = await selectRows<ChildSnapshot>(conn, "children", input, input.childId ? "id" : undefined)
  const child_caregivers = await selectRows<ChildCaregiverSnapshot>(conn, "child_caregivers", input, input.childId ? "child_id" : undefined)
  const logs: SnapshotSourceData["logs"] = {
    poop_logs: await selectRows<PoopLogSnapshot>(conn, "poop_logs", input, input.childId ? "child_id" : undefined),
    diaper_logs: await selectRows<DiaperLogSnapshot>(conn, "diaper_logs", input, input.childId ? "child_id" : undefined),
    diet_logs: await selectRows<DietLogSnapshot>(conn, "diet_logs", input, input.childId ? "child_id" : undefined),
    sleep_logs: await selectRows<SleepLogSnapshot>(conn, "sleep_logs", input, input.childId ? "child_id" : undefined),
    symptoms: await selectRows<SymptomLogSnapshot>(conn, "symptom_logs", input, input.childId ? "child_id" : undefined),
    health_episodes: await selectRows<HealthEpisodeSnapshot>(conn, "episodes", input, input.childId ? "child_id" : undefined),
    episode_events: await selectRows<EpisodeEventSnapshot>(conn, "episode_events", input, input.childId ? "child_id" : undefined),
    growth_logs: await selectRows<GrowthLogSnapshot>(conn, "growth_logs", input, input.childId ? "child_id" : undefined),
    milestone_logs: await selectRows<MilestoneLogSnapshot>(conn, "milestone_logs", input, input.childId ? "child_id" : undefined),
    quick_presets: await selectRows<QuickPresetSnapshot>(conn, "quick_presets", input, input.childId ? "child_id" : undefined),
    alerts: await selectRows<AlertSnapshot>(conn, "alerts", input, input.childId ? "child_id" : undefined),
  }
  const caregivers = input.childId
    ? await selectCaregiversForChild(
      conn,
      [
        ...new Set([
          ...child_caregivers.map((link) => link.caregiver_id),
          ...getAttributedCaregiverIds(logs),
        ]),
      ],
      input.includeDeleted,
    )
    : await selectRows<CaregiverSnapshot>(conn, "caregivers", input)

  const source: SnapshotSourceData = {
    children,
    caregivers,
    child_caregivers,
    logs,
    attachments: input.includeAttachmentMetadata
      ? await selectRows<AttachmentSnapshot>(conn, "attachments", input, input.childId ? "child_id" : undefined)
      : [],
    settings: [],
  }

  if (input.includeSettings) {
    const settings = await conn.select<AppSettingSnapshot[]>("SELECT key, value FROM app_settings ORDER BY key ASC")
    source.settings = filterSnapshotSafeSettings(settings, getSnapshotChildIds(source))
  }

  return source
}

function existingRowsSql(table: SnapshotRecordTableName): string {
  if (table === "app_settings") {
    return "SELECT key as id, NULL as updated_at FROM app_settings"
  }

  return `SELECT id, updated_at FROM ${table}`
}

export async function loadSnapshotImportExistingRecords(): Promise<SnapshotImportExistingRecords> {
  const conn = await getDb()
  const result = {} as SnapshotImportExistingRecords

  for (const table of Object.keys(SNAPSHOT_TABLE_COLUMNS) as SnapshotRecordTableName[]) {
    result[table] = await conn.select<SnapshotImportExistingRecord[]>(existingRowsSql(table))
  }

  return result
}

function defaultColumnValue(column: string, row: Record<string, unknown>): unknown {
  if (column === "deleted_at" || column === "device_id") return null
  if (column === "sync_status") return "local"
  if (column === "sync_version") return 1
  if (column === "local_only") return 0
  if (column === "is_active") return 1
  if (column === "is_primary") return 0
  if (column === "is_no_poop") return 0
  if (column === "is_constipation_support") return 0
  if (column === "is_enabled") return 1
  if (column === "is_dismissed") return 0
  if (column === "attachment_sync_policy") return "local_only"
  if (column === "updated_at") return row.created_at ?? null
  return null
}

function normalizeImportRow(table: SnapshotRecordTableName, row: Record<string, unknown>): Record<string, unknown> {
  if (table !== "attachments") return row

  return {
    ...row,
    local_only: 1,
    attachment_sync_policy: "local_only",
  }
}

async function insertRows(
  conn: DbConnection,
  table: SnapshotRecordTableName,
  rows: Array<Record<string, unknown>>,
): Promise<void> {
  const columns = SNAPSHOT_TABLE_COLUMNS[table]
  if (rows.length === 0) return

  const placeholders = columns.map(() => "?").join(", ")
  const conflictMode = table === "app_settings" ? "INSERT OR REPLACE" : "INSERT"
  const sql = `${conflictMode} INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`

  for (const rawRow of rows) {
    const row = normalizeImportRow(table, rawRow)
    const values = columns.map((column) => row[column] ?? defaultColumnValue(column, row))
    await executeMutation(conn, sql, values)
  }
}

export async function importSnapshotIntoEmptyDatabase(snapshot: TinyTummySnapshotV1): Promise<void> {
  const conn = await getDb()
  const safeSettings = filterSnapshotSafeSettings(snapshot.settings ?? [], new Set(snapshot.children.map((child) => child.id)))
  const snapshotWithSafeSettings: TinyTummySnapshotV1 = {
    ...snapshot,
    settings: safeSettings,
  }

  await withTransaction(conn, async () => {
    const groups = getSnapshotRecordGroups(snapshotWithSafeSettings)
    const importOrder: SnapshotRecordTableName[] = [
      "children",
      "caregivers",
      "child_caregivers",
      "poop_logs",
      "diet_logs",
      "sleep_logs",
      "episodes",
      "symptom_logs",
      "episode_events",
      "growth_logs",
      "milestone_logs",
      "diaper_logs",
      "quick_presets",
      "alerts",
      "attachments",
      "app_settings",
    ]

    for (const table of importOrder) {
      const group = groups.find((candidate) => candidate.table === table)
      await insertRows(conn, table, group?.rows ?? [])
    }
  })
}
