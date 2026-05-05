import test from "node:test"
import assert from "node:assert/strict"
import { createExportImportService } from "../src/lib/services/export-import-service.ts"
import type { ExportImportRepository } from "../src/lib/repositories/index.ts"
import type {
  SnapshotImportExistingRecords,
  SnapshotLoadInput,
  SnapshotSourceData,
} from "../src/lib/db/snapshot.ts"
import type {
  AppSettingSnapshot,
  SnapshotRecordTableName,
  TinyTummySnapshotV1,
} from "../src/lib/export-import-snapshot.ts"
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
} from "../src/lib/types.ts"

const NOW = "2026-05-05T10:00:00.000Z"
const LATER = "2026-05-05T12:00:00.000Z"

const SNAPSHOT_TABLES: SnapshotRecordTableName[] = [
  "children",
  "caregivers",
  "child_caregivers",
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
  "attachments",
  "app_settings",
]

function syncFields(overrides: Partial<Pick<Child, "deleted_at" | "updated_at">> = {}) {
  return {
    created_at: NOW,
    updated_at: overrides.updated_at ?? NOW,
    deleted_at: overrides.deleted_at ?? null,
    device_id: "device-local",
    sync_status: "local" as const,
    sync_version: 1,
    local_only: 0,
  }
}

function emptyExistingRecords(): SnapshotImportExistingRecords {
  return Object.fromEntries(SNAPSHOT_TABLES.map((table) => [table, []])) as SnapshotImportExistingRecords
}

const child: Child = {
  id: "child-1",
  name: "Luna",
  date_of_birth: "2026-04-01",
  sex: "female",
  feeding_type: "mixed",
  avatar_color: "#d45aa3",
  is_active: 1,
  ...syncFields(),
}

const secondChild: Child = {
  id: "child-2",
  name: "Kai",
  date_of_birth: "2026-04-10",
  sex: null,
  feeding_type: "breast",
  avatar_color: "#2563EB",
  is_active: 1,
  ...syncFields(),
}

const deletedChild: Child = {
  id: "child-deleted",
  name: "Archived",
  date_of_birth: "2026-03-01",
  sex: null,
  feeding_type: "formula",
  avatar_color: "#94a3b8",
  is_active: 0,
  ...syncFields({ deleted_at: LATER, updated_at: LATER }),
}

const caregiver: Caregiver = {
  id: "caregiver-1",
  display_name: "Primary caregiver",
  role: "parent",
  relationship: "parent",
  email: null,
  phone: null,
  avatar_color: "#7c3aed",
  is_primary: 1,
  ...syncFields(),
}

const otherCaregiver: Caregiver = {
  id: "caregiver-2",
  display_name: "Helper",
  role: "caregiver",
  relationship: "family",
  email: null,
  phone: null,
  avatar_color: "#0f766e",
  is_primary: 0,
  ...syncFields(),
}

const childCaregiver: ChildCaregiver = {
  id: "child-caregiver-1",
  child_id: child.id,
  caregiver_id: caregiver.id,
  relationship_to_child: "parent",
  permissions: "{\"logs\":\"write\"}",
  ...syncFields(),
}

const otherChildCaregiver: ChildCaregiver = {
  id: "child-caregiver-2",
  child_id: secondChild.id,
  caregiver_id: otherCaregiver.id,
  relationship_to_child: "family",
  permissions: null,
  ...syncFields(),
}

const poop: PoopEntry = {
  id: "poop-1",
  child_id: child.id,
  logged_at: "2026-05-05T08:00:00.000Z",
  stool_type: 4,
  color: "brown",
  size: "medium",
  is_no_poop: 0,
  notes: "Normal",
  photo_path: "photos/poop-1.jpg",
  created_by_caregiver_id: caregiver.id,
  updated_by_caregiver_id: caregiver.id,
  ...syncFields(),
}

const linkedPoop: PoopEntry = {
  ...poop,
  id: "poop-linked",
  logged_at: "2026-05-05T09:00:00.000Z",
  photo_path: "photos/diaper-1.jpg",
}

const deletedPoop: PoopEntry = {
  ...poop,
  id: "poop-deleted",
  logged_at: "2026-05-04T08:00:00.000Z",
  ...syncFields({ deleted_at: LATER, updated_at: LATER }),
}

const diaper: DiaperEntry = {
  id: "diaper-1",
  child_id: child.id,
  logged_at: "2026-05-05T09:00:00.000Z",
  diaper_type: "mixed",
  urine_color: "normal",
  stool_type: 4,
  color: "brown",
  size: "medium",
  notes: "Mixed",
  photo_path: "photos/diaper-1.jpg",
  linked_poop_log_id: linkedPoop.id,
  created_by_caregiver_id: caregiver.id,
  updated_by_caregiver_id: caregiver.id,
  ...syncFields(),
}

const feed: FeedingEntry = {
  id: "feed-1",
  child_id: child.id,
  logged_at: "2026-05-05T07:30:00.000Z",
  food_type: "breast_milk",
  food_name: null,
  amount_ml: null,
  duration_minutes: 12,
  breast_side: "left",
  bottle_content: null,
  reaction_notes: null,
  is_constipation_support: 0,
  notes: null,
  created_by_caregiver_id: caregiver.id,
  updated_by_caregiver_id: caregiver.id,
  ...syncFields(),
}

const sleep: SleepEntry = {
  id: "sleep-1",
  child_id: child.id,
  sleep_type: "nap",
  started_at: "2026-05-05T11:00:00.000Z",
  ended_at: "2026-05-05T12:00:00.000Z",
  notes: null,
  created_by_caregiver_id: caregiver.id,
  updated_by_caregiver_id: caregiver.id,
  ...syncFields(),
}

const episode: Episode = {
  id: "episode-1",
  child_id: child.id,
  episode_type: "constipation",
  status: "active",
  started_at: "2026-05-05T06:00:00.000Z",
  ended_at: null,
  summary: "Watching tummy",
  outcome: null,
  created_by_caregiver_id: caregiver.id,
  updated_by_caregiver_id: caregiver.id,
  ...syncFields(),
}

const symptom: SymptomEntry = {
  id: "symptom-1",
  child_id: child.id,
  episode_id: episode.id,
  symptom_type: "straining",
  severity: "mild",
  temperature_c: null,
  temperature_method: null,
  logged_at: "2026-05-05T06:30:00.000Z",
  notes: "A little strain",
  created_by_caregiver_id: caregiver.id,
  updated_by_caregiver_id: caregiver.id,
  ...syncFields(),
}

const event: EpisodeEvent = {
  id: "event-1",
  episode_id: episode.id,
  child_id: child.id,
  event_type: "symptom",
  title: "Straining",
  notes: symptom.notes,
  logged_at: symptom.logged_at,
  source_kind: "symptom",
  source_id: symptom.id,
  created_by_caregiver_id: caregiver.id,
  updated_by_caregiver_id: caregiver.id,
  ...syncFields(),
}

const growth: GrowthEntry = {
  id: "growth-1",
  child_id: child.id,
  measured_at: "2026-05-05T13:00:00.000Z",
  weight_kg: 5.2,
  height_cm: 58,
  head_circumference_cm: 39,
  notes: "Checkup",
  created_by_caregiver_id: caregiver.id,
  updated_by_caregiver_id: caregiver.id,
  ...syncFields(),
}

const milestone: MilestoneEntry = {
  id: "milestone-1",
  child_id: child.id,
  milestone_type: "started_solids",
  logged_at: "2026-05-05T14:00:00.000Z",
  notes: "Tiny taste",
  created_by_caregiver_id: caregiver.id,
  updated_by_caregiver_id: caregiver.id,
  ...syncFields(),
}

const preset: QuickPresetEntry = {
  id: "preset-1",
  child_id: child.id,
  kind: "poop",
  label: "Usual",
  description: null,
  draft_json: "{\"stool_type\":4}",
  sort_order: 0,
  is_enabled: 1,
  ...syncFields(),
}

const alert: Alert = {
  id: "alert-1",
  child_id: child.id,
  alert_type: "red_flag_color",
  severity: "warning",
  title: "Watch color",
  message: "Follow up if it continues.",
  is_dismissed: 0,
  triggered_at: "2026-05-05T08:05:00.000Z",
  related_log_id: poop.id,
  ...syncFields(),
}

const attachment: Attachment = {
  id: "attachment-1",
  owner_table: "poop_logs",
  owner_id: poop.id,
  child_id: child.id,
  local_path: "photos/poop-1.jpg",
  mime_type: "image/jpeg",
  file_size: 1234,
  created_at: NOW,
  updated_at: NOW,
  deleted_at: null,
  local_only: 1,
  attachment_sync_policy: "local_only",
}

const settings: AppSettingSnapshot[] = [
  { key: "theme", value: "dark" },
  { key: "unit_system", value: "metric" },
  { key: `elimination_view:${child.id}`, value: "diaper" },
  { key: "premium_unlocked", value: "1" },
  { key: "trial_started_at", value: "2026-04-01T00:00:00.000Z" },
  { key: `sleep_timer:session:${child.id}`, value: "{}" },
]

const seed: SnapshotSourceData = {
  children: [child, secondChild, deletedChild],
  caregivers: [caregiver, otherCaregiver],
  child_caregivers: [childCaregiver, otherChildCaregiver],
  logs: {
    poop_logs: [poop, linkedPoop, deletedPoop],
    diaper_logs: [diaper],
    diet_logs: [feed],
    sleep_logs: [sleep],
    symptoms: [symptom],
    health_episodes: [episode],
    episode_events: [event],
    growth_logs: [growth],
    milestone_logs: [milestone],
    quick_presets: [preset],
    alerts: [alert],
  },
  attachments: [attachment],
  settings,
}

function isNotDeleted(row: { deleted_at?: string | null }): boolean {
  return !row.deleted_at
}

function filterRows<T extends { child_id?: string | null; deleted_at?: string | null }>(
  rows: T[],
  input: SnapshotLoadInput,
): T[] {
  return rows.filter((row) => {
    if (!input.includeDeleted && !isNotDeleted(row)) return false
    if (input.childId && row.child_id !== input.childId) return false
    return true
  })
}

function createRepository(
  existingRecords: SnapshotImportExistingRecords = emptyExistingRecords(),
): ExportImportRepository & { imported: TinyTummySnapshotV1[] } {
  const imported: TinyTummySnapshotV1[] = []

  return {
    imported,
    async loadSnapshotSourceData(input) {
      const children = seed.children.filter((row) => {
        if (!input.includeDeleted && !isNotDeleted(row)) return false
        if (input.childId && row.id !== input.childId) return false
        return true
      })
      const childIds = new Set(children.map((row) => row.id))
      const child_caregivers = filterRows(seed.child_caregivers, input).filter((row) => childIds.has(row.child_id))
      const caregiverIds = input.childId
        ? new Set(child_caregivers.map((row) => row.caregiver_id))
        : new Set(seed.caregivers.map((row) => row.id))

      return {
        children,
        caregivers: seed.caregivers.filter((row) => {
          if (!input.includeDeleted && !isNotDeleted(row)) return false
          return caregiverIds.has(row.id)
        }),
        child_caregivers,
        logs: {
          poop_logs: filterRows(seed.logs.poop_logs, input),
          diaper_logs: filterRows(seed.logs.diaper_logs, input),
          diet_logs: filterRows(seed.logs.diet_logs, input),
          sleep_logs: filterRows(seed.logs.sleep_logs, input),
          symptoms: filterRows(seed.logs.symptoms, input),
          health_episodes: filterRows(seed.logs.health_episodes, input),
          episode_events: filterRows(seed.logs.episode_events, input),
          growth_logs: filterRows(seed.logs.growth_logs, input),
          milestone_logs: filterRows(seed.logs.milestone_logs, input),
          quick_presets: filterRows(seed.logs.quick_presets, input),
          alerts: filterRows(seed.logs.alerts, input),
        },
        attachments: input.includeAttachmentMetadata ? filterRows(seed.attachments, input) : [],
        settings: input.includeSettings ? seed.settings : [],
      }
    },
    async loadSnapshotImportExistingRecords() {
      return existingRecords
    },
    async importSnapshotIntoEmptyDatabase(snapshot) {
      imported.push(snapshot)
    },
  }
}

async function buildValidSnapshot(): Promise<TinyTummySnapshotV1> {
  const service = createExportImportService(createRepository())
  return service.buildFullSnapshot({ includeAttachmentMetadata: true, includeSettings: true })
}

function cloneSnapshot(snapshot: TinyTummySnapshotV1): TinyTummySnapshotV1 {
  return JSON.parse(JSON.stringify(snapshot)) as TinyTummySnapshotV1
}

test("builds a full snapshot with portable child data, caregivers, safe settings, and attachment metadata", async () => {
  const service = createExportImportService(createRepository())
  const snapshot = await service.buildFullSnapshot({ includeAttachmentMetadata: true, includeSettings: true })

  assert.equal(snapshot.schema_version, 1)
  assert.equal(snapshot.app_name, "Tiny Tummy")
  assert.equal(snapshot.export_kind, "full_backup")
  assert.equal(snapshot.includes_deleted, false)
  assert.equal(snapshot.includes_attachments, true)
  assert.equal(snapshot.attachment_policy, "local_paths_only")
  assert.deepEqual(snapshot.children.map((row) => row.id).sort(), [child.id, secondChild.id])
  assert.deepEqual(snapshot.caregivers.map((row) => row.id).sort(), [caregiver.id, otherCaregiver.id])
  assert.deepEqual(snapshot.child_caregivers.map((row) => row.id).sort(), [childCaregiver.id, otherChildCaregiver.id])
  assert.equal(snapshot.logs.poop_logs.length, 2)
  assert.equal(snapshot.logs.diaper_logs.length, 1)
  assert.equal(snapshot.logs.diet_logs.length, 1)
  assert.equal(snapshot.logs.sleep_logs.length, 1)
  assert.equal(snapshot.logs.symptoms.length, 1)
  assert.equal(snapshot.logs.health_episodes.length, 1)
  assert.equal(snapshot.logs.episode_events.length, 1)
  assert.equal(snapshot.logs.growth_logs.length, 1)
  assert.equal(snapshot.logs.milestone_logs.length, 1)
  assert.equal(snapshot.logs.quick_presets.length, 1)
  assert.equal(snapshot.attachments[0]?.local_path, attachment.local_path)
  assert.deepEqual(snapshot.settings?.map((row) => row.key).sort(), [
    `elimination_view:${child.id}`,
    "theme",
    "unit_system",
  ])
})

test("builds a child-only snapshot scoped to one child and its caregiver links", async () => {
  const service = createExportImportService(createRepository())
  const snapshot = await service.buildChildSnapshot(child.id, { includeAttachmentMetadata: true })

  assert.equal(snapshot.export_kind, "child_backup")
  assert.deepEqual(snapshot.children.map((row) => row.id), [child.id])
  assert.deepEqual(snapshot.caregivers.map((row) => row.id), [caregiver.id])
  assert.deepEqual(snapshot.child_caregivers.map((row) => row.id), [childCaregiver.id])
  assert.ok(snapshot.logs.poop_logs.every((row) => row.child_id === child.id))
  assert.ok(snapshot.attachments.every((row) => row.child_id === child.id))
})

test("excludes soft-deleted records by default and includes them when requested", async () => {
  const service = createExportImportService(createRepository())
  const defaultSnapshot = await service.buildFullSnapshot()
  const withDeleted = await service.buildFullSnapshot({ includeDeleted: true })

  assert.equal(defaultSnapshot.children.some((row) => row.id === deletedChild.id), false)
  assert.equal(defaultSnapshot.logs.poop_logs.some((row) => row.id === deletedPoop.id), false)
  assert.equal(withDeleted.children.some((row) => row.id === deletedChild.id), true)
  assert.equal(withDeleted.logs.poop_logs.some((row) => row.id === deletedPoop.id), true)
  assert.equal(withDeleted.includes_deleted, true)
})

test("keeps photo file contents out of the snapshot JSON", async () => {
  const service = createExportImportService(createRepository())
  const snapshot = await service.buildFullSnapshot({ includeAttachmentMetadata: true })
  const jsonExport = service.createSnapshotJsonExport(snapshot)

  assert.match(jsonExport.filename, /^tiny-tummy-full-backup-/)
  assert.match(jsonExport.json, /photos\/poop-1\.jpg/)
  assert.doesNotMatch(jsonExport.json, /base64/i)
  assert.doesNotMatch(jsonExport.json, /file_contents/i)
  assert.doesNotMatch(jsonExport.json, /premium_unlocked/)
  assert.equal(jsonExport.summary.attachmentCount, 1)
})

test("validates a valid v1 snapshot and rejects unsupported versions", async () => {
  const service = createExportImportService(createRepository())
  const snapshot = await buildValidSnapshot()
  const valid = service.validateSnapshot(snapshot)
  const future = cloneSnapshot(snapshot) as TinyTummySnapshotV1 & { schema_version: number }
  future.schema_version = 2

  assert.equal(valid.ok, true)
  assert.deepEqual(valid.errors, [])
  assert.equal(service.validateSnapshot(future).ok, false)
  assert.match(service.validateSnapshot(future).errors[0]?.message ?? "", /Unsupported/)
})

test("validation fails when required record IDs are missing", async () => {
  const service = createExportImportService(createRepository())
  const snapshot = cloneSnapshot(await buildValidSnapshot())
  snapshot.children[0].id = ""

  const result = service.validateSnapshot(snapshot)

  assert.equal(result.ok, false)
  assert.equal(result.errors.some((issue) => issue.path === "children[0].id"), true)
})

test("dry-run import summarizes stable-ID merge behavior without writing", async () => {
  const snapshot = await buildValidSnapshot()
  const existing = emptyExistingRecords()
  existing.children = [{ id: child.id, updated_at: "2026-05-05T09:00:00.000Z" }]
  existing.poop_logs = [{ id: poop.id, updated_at: "2026-05-05T13:00:00.000Z" }]
  const repository = createRepository(existing)
  const service = createExportImportService(repository)

  const result = await service.importSnapshot(snapshot, {
    dryRun: true,
    mergeStrategy: "replace_if_newer",
  })

  assert.equal(result.ok, true)
  assert.equal(result.applied, false)
  assert.equal(repository.imported.length, 0)
  assert.equal(result.byTable.children.replaced, 1)
  assert.equal(result.byTable.poop_logs.skipped, 1)
  assert.ok(result.totals.inserted > 0)
})

test("keep_local dry-run keeps existing local records", async () => {
  const snapshot = await buildValidSnapshot()
  const existing = emptyExistingRecords()
  existing.children = [{ id: child.id, updated_at: LATER }]
  const service = createExportImportService(createRepository(existing))

  const result = await service.importSnapshot(snapshot, {
    dryRun: true,
    mergeStrategy: "keep_local",
  })

  assert.equal(result.ok, true)
  assert.equal(result.byTable.children.keptLocal, 1)
})

test("imports into an empty local data set when dryRun is false", async () => {
  const snapshot = await buildValidSnapshot()
  const repository = createRepository(emptyExistingRecords())
  const service = createExportImportService(repository)

  const result = await service.importSnapshot(snapshot, { dryRun: false })

  assert.equal(result.ok, true)
  assert.equal(result.applied, true)
  assert.equal(result.emptyLocalDataSet, true)
  assert.equal(repository.imported.length, 1)
})

test("refuses write import into a non-empty local data set", async () => {
  const snapshot = await buildValidSnapshot()
  const existing = emptyExistingRecords()
  existing.children = [{ id: "local-child", updated_at: NOW }]
  const repository = createRepository(existing)
  const service = createExportImportService(repository)

  const result = await service.importSnapshot(snapshot, { dryRun: false })

  assert.equal(result.ok, false)
  assert.equal(result.applied, false)
  assert.equal(repository.imported.length, 0)
  assert.match(result.errors[0] ?? "", /empty Tiny Tummy data set/)
})
