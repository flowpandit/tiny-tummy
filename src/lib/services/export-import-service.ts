import {
  TINY_TUMMY_SNAPSHOT_APP_NAME,
  TINY_TUMMY_SNAPSHOT_SCHEMA_VERSION,
  filterSnapshotSafeSettings,
  getSnapshotRecordGroups,
  getSnapshotRecordId,
  getSnapshotRecordUpdatedAt,
  summarizeTinyTummySnapshot,
  validateTinyTummySnapshot,
  type SnapshotAttachmentPolicy,
  type SnapshotExportKind,
  type SnapshotMergeStrategy,
  type SnapshotRecordTableName,
  type SnapshotSummary,
  type SnapshotValidationResult,
  type TinyTummySnapshotV1,
} from "../export-import-snapshot"
import { getSnapshotSourceDeviceId, type SnapshotImportExistingRecords } from "../db/snapshot"
import type { ExportImportRepository } from "../repositories"
import { generateId, nowISO } from "../utils"

export interface BuildSnapshotOptions {
  includeDeleted?: boolean
  includeAttachmentMetadata?: boolean
  includeSettings?: boolean
  appVersion?: string | null
  platform?: string | null
}

export interface ImportSnapshotOptions {
  dryRun?: boolean
  mergeStrategy?: SnapshotMergeStrategy
}

export interface SnapshotImportTablePlan {
  inserted: number
  skipped: number
  replaced: number
  keptLocal: number
}

export interface SnapshotImportResult {
  ok: boolean
  dryRun: boolean
  applied: boolean
  mergeStrategy: SnapshotMergeStrategy
  validation: SnapshotValidationResult
  summary: SnapshotSummary | null
  emptyLocalDataSet: boolean
  totals: SnapshotImportTablePlan
  byTable: Record<SnapshotRecordTableName, SnapshotImportTablePlan>
  deferred: string[]
  errors: string[]
}

export interface SnapshotJsonExport {
  filename: string
  json: string
  summary: SnapshotSummary
}

export interface ExportImportService {
  buildFullSnapshot(options?: BuildSnapshotOptions): Promise<TinyTummySnapshotV1>;
  buildChildSnapshot(childId: string, options?: BuildSnapshotOptions): Promise<TinyTummySnapshotV1>;
  validateSnapshot(snapshot: unknown): SnapshotValidationResult;
  summarizeSnapshot(snapshot: TinyTummySnapshotV1): SnapshotSummary;
  createSnapshotJsonExport(snapshot: TinyTummySnapshotV1): SnapshotJsonExport;
  importSnapshot(snapshot: unknown, options?: ImportSnapshotOptions): Promise<SnapshotImportResult>;
}

const DEFAULT_MERGE_STRATEGY: SnapshotMergeStrategy = "skip_existing"

const EMPTY_TABLE_PLAN: SnapshotImportTablePlan = {
  inserted: 0,
  skipped: 0,
  replaced: 0,
  keptLocal: 0,
}

const NON_BLOCKING_EMPTY_IMPORT_TABLES = new Set<SnapshotRecordTableName>(["app_settings"])

function buildAttachmentPolicy(includeAttachmentMetadata: boolean): SnapshotAttachmentPolicy {
  return includeAttachmentMetadata ? "local_paths_only" : "embedded_files_not_supported_yet"
}

function normalizeBuildOptions(options: BuildSnapshotOptions = {}): Required<Pick<BuildSnapshotOptions, "includeDeleted" | "includeAttachmentMetadata" | "includeSettings">> & BuildSnapshotOptions {
  return {
    ...options,
    includeDeleted: options.includeDeleted ?? false,
    includeAttachmentMetadata: options.includeAttachmentMetadata ?? false,
    includeSettings: options.includeSettings ?? true,
  }
}

function buildMetadata(options: BuildSnapshotOptions): TinyTummySnapshotV1["metadata"] {
  return {
    app_version: options.appVersion ?? null,
    platform: options.platform ?? null,
    generated_by: "tiny-tummy-export-import-service",
    notes: [
      "This is a local-first data portability snapshot, not cloud sync.",
      "Photo and attachment file contents are not embedded in v1 snapshots.",
      "Attachment records are local-only metadata; local paths may not exist on another device.",
      "Payment, store entitlement, trial, account, and backend sync tokens are intentionally excluded.",
    ],
  }
}

function buildFilename(snapshot: TinyTummySnapshotV1): string {
  const timestamp = snapshot.exported_at.replace(/[:.]/g, "-")
  const kind = snapshot.export_kind.replace(/_/g, "-")
  return `tiny-tummy-${kind}-${timestamp}.json`
}

function emptyTablePlan(): SnapshotImportTablePlan {
  return { ...EMPTY_TABLE_PLAN }
}

function emptyByTable(): Record<SnapshotRecordTableName, SnapshotImportTablePlan> {
  const result = {} as Record<SnapshotRecordTableName, SnapshotImportTablePlan>
  for (const table of getSnapshotRecordGroups({
    schema_version: 1,
    app_name: "Tiny Tummy",
    exported_at: "2000-01-01T00:00:00.000Z",
    export_id: "empty",
    device_id: null,
    export_kind: "full_backup",
    includes_deleted: false,
    includes_attachments: false,
    attachment_policy: "embedded_files_not_supported_yet",
    children: [],
    caregivers: [],
    child_caregivers: [],
    logs: {
      poop_logs: [],
      diaper_logs: [],
      diet_logs: [],
      sleep_logs: [],
      symptoms: [],
      health_episodes: [],
      episode_events: [],
      growth_logs: [],
      milestone_logs: [],
      quick_presets: [],
      alerts: [],
    },
    attachments: [],
    settings: [],
    metadata: {
      generated_by: "tiny-tummy-export-import-service",
      notes: [],
    },
  })) {
    result[table.table] = emptyTablePlan()
  }
  return result
}

function addPlan(target: SnapshotImportTablePlan, source: SnapshotImportTablePlan): void {
  target.inserted += source.inserted
  target.skipped += source.skipped
  target.replaced += source.replaced
  target.keptLocal += source.keptLocal
}

function isSnapshotRecordNewer(snapshotUpdatedAt: string | null, localUpdatedAt: string | null): boolean {
  if (!snapshotUpdatedAt || !localUpdatedAt) return false
  const snapshotTime = Date.parse(snapshotUpdatedAt)
  const localTime = Date.parse(localUpdatedAt)
  if (Number.isNaN(snapshotTime) || Number.isNaN(localTime)) return false
  return snapshotTime > localTime
}

function buildImportPlan(
  snapshot: TinyTummySnapshotV1,
  existing: SnapshotImportExistingRecords,
  mergeStrategy: SnapshotMergeStrategy,
): Pick<SnapshotImportResult, "totals" | "byTable" | "emptyLocalDataSet"> {
  const byTable = emptyByTable()
  const totals = emptyTablePlan()

  const emptyLocalDataSet = Object.entries(existing).every(([table, rows]) => {
    if (NON_BLOCKING_EMPTY_IMPORT_TABLES.has(table as SnapshotRecordTableName)) return true
    return rows.length === 0
  })

  for (const group of getSnapshotRecordGroups(snapshot)) {
    const tablePlan = byTable[group.table]
    const existingById = new Map((existing[group.table] ?? []).map((row) => [row.id, row.updated_at]))

    for (const row of group.rows) {
      const id = getSnapshotRecordId(group.table, row)
      if (!id) continue
      const localUpdatedAt = existingById.get(id)

      if (localUpdatedAt === undefined) {
        tablePlan.inserted += 1
        continue
      }

      if (mergeStrategy === "keep_local") {
        tablePlan.keptLocal += 1
        continue
      }

      if (mergeStrategy === "replace_if_newer") {
        if (isSnapshotRecordNewer(getSnapshotRecordUpdatedAt(group.table, row), localUpdatedAt)) {
          tablePlan.replaced += 1
        } else {
          tablePlan.skipped += 1
        }
        continue
      }

      tablePlan.skipped += 1
    }

    addPlan(totals, tablePlan)
  }

  return { totals, byTable, emptyLocalDataSet }
}

function validationFailureResult(
  validation: SnapshotValidationResult,
  mergeStrategy: SnapshotMergeStrategy,
  dryRun: boolean,
): SnapshotImportResult {
  return {
    ok: false,
    dryRun,
    applied: false,
    mergeStrategy,
    validation,
    summary: null,
    emptyLocalDataSet: false,
    totals: emptyTablePlan(),
    byTable: emptyByTable(),
    deferred: [],
    errors: validation.errors.map((issue) => `${issue.path}: ${issue.message}`),
  }
}

export function createExportImportService(repository: ExportImportRepository): ExportImportService {
  async function buildSnapshot(
    exportKind: SnapshotExportKind,
    childId: string | undefined,
    options: BuildSnapshotOptions = {},
  ): Promise<TinyTummySnapshotV1> {
    const normalized = normalizeBuildOptions(options)
    const source = await repository.loadSnapshotSourceData({
      includeDeleted: normalized.includeDeleted,
      includeAttachmentMetadata: normalized.includeAttachmentMetadata,
      includeSettings: normalized.includeSettings,
      childId,
    })

    if (childId && source.children.length === 0) {
      throw new Error(`Cannot build Tiny Tummy child snapshot: child ${childId} was not found.`)
    }

    const childIds = new Set(source.children.map((child) => child.id))
    const settings = normalized.includeSettings
      ? filterSnapshotSafeSettings(source.settings, childIds)
      : []

    return {
      schema_version: TINY_TUMMY_SNAPSHOT_SCHEMA_VERSION,
      app_name: TINY_TUMMY_SNAPSHOT_APP_NAME,
      exported_at: nowISO(),
      export_id: generateId(),
      device_id: getSnapshotSourceDeviceId(source),
      export_kind: exportKind,
      includes_deleted: normalized.includeDeleted,
      includes_attachments: normalized.includeAttachmentMetadata,
      attachment_policy: buildAttachmentPolicy(normalized.includeAttachmentMetadata),
      children: source.children,
      caregivers: source.caregivers,
      child_caregivers: source.child_caregivers,
      logs: source.logs,
      attachments: normalized.includeAttachmentMetadata ? source.attachments : [],
      settings,
      metadata: buildMetadata(normalized),
    }
  }

  return {
    buildFullSnapshot: (options) => buildSnapshot("full_backup", undefined, options),
    buildChildSnapshot: (childId, options) => buildSnapshot("child_backup", childId, options),
    validateSnapshot: validateTinyTummySnapshot,
    summarizeSnapshot: summarizeTinyTummySnapshot,
    createSnapshotJsonExport(snapshot) {
      return {
        filename: buildFilename(snapshot),
        json: JSON.stringify(snapshot, null, 2),
        summary: summarizeTinyTummySnapshot(snapshot),
      }
    },
    async importSnapshot(snapshot, options = {}) {
      const mergeStrategy = options.mergeStrategy ?? DEFAULT_MERGE_STRATEGY
      const dryRun = options.dryRun ?? true
      const validation = validateTinyTummySnapshot(snapshot)

      if (!validation.ok) {
        return validationFailureResult(validation, mergeStrategy, dryRun)
      }

      const typedSnapshot = snapshot as TinyTummySnapshotV1
      const existing = await repository.loadSnapshotImportExistingRecords()
      const plan = buildImportPlan(typedSnapshot, existing, mergeStrategy)
      const summary = summarizeTinyTummySnapshot(typedSnapshot)
      const deferred = [
        "General merge writes into non-empty databases are deferred; dry-run planning reports the stable-ID outcome.",
        "replace_if_newer is currently planned in dry-run only unless the local data set is empty.",
        "Attachment file copy/archive support is deferred; v1 import only stores local-only metadata.",
      ]

      if (dryRun) {
        return {
          ok: true,
          dryRun: true,
          applied: false,
          mergeStrategy,
          validation,
          summary,
          emptyLocalDataSet: plan.emptyLocalDataSet,
          totals: plan.totals,
          byTable: plan.byTable,
          deferred,
          errors: [],
        }
      }

      if (!plan.emptyLocalDataSet) {
        return {
          ok: false,
          dryRun: false,
          applied: false,
          mergeStrategy,
          validation,
          summary,
          emptyLocalDataSet: false,
          totals: plan.totals,
          byTable: plan.byTable,
          deferred,
          errors: ["Import writes are currently limited to an empty Tiny Tummy data set. Run a dry-run import to inspect merge behavior."],
        }
      }

      await repository.importSnapshotIntoEmptyDatabase(typedSnapshot)

      return {
        ok: true,
        dryRun: false,
        applied: true,
        mergeStrategy,
        validation,
        summary,
        emptyLocalDataSet: true,
        totals: plan.totals,
        byTable: plan.byTable,
        deferred,
        errors: [],
      }
    },
  }
}
