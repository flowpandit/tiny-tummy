import type {
  SnapshotSummary,
  TinyTummySnapshotV1,
} from "./export-import-snapshot";
import type {
  BuildSnapshotOptions,
  ExportImportService,
  SnapshotImportResult,
  SnapshotJsonExport,
} from "./services/export-import-service";

export const BACKUP_EXPORT_FEATURE_ID = "export_backup" as const;
export const BACKUP_IMPORT_FEATURE_ID = "import_backup" as const;

export const BACKUP_SNAPSHOT_BUILD_OPTIONS = {
  includeDeleted: false,
  includeAttachmentMetadata: true,
  includeSettings: true,
} satisfies Required<Pick<BuildSnapshotOptions, "includeDeleted" | "includeAttachmentMetadata" | "includeSettings">>;

export const BACKUP_PHOTOS_INCLUDED = false;
export const EXISTING_DATABASE_IMPORT_MESSAGE = "Import into an existing Tiny Tummy database is not available yet. Please export your current backup before resetting or use a fresh install.";

export interface BackupJsonExport extends SnapshotJsonExport {
  photosIncluded: false;
}

export type BackupExportScope =
  | { kind: "full" }
  | { kind: "child"; childId: string; childName: string };

export type PreparedBackupImport =
  | {
    ok: true;
    fileName: string;
    snapshot: TinyTummySnapshotV1;
    summary: SnapshotSummary;
    dryRun: SnapshotImportResult;
  }
  | {
    ok: false;
    fileName: string;
    message: string;
    details: string[];
  };

export type ApplyBackupImportResult =
  | {
    ok: true;
    result: SnapshotImportResult;
  }
  | {
    ok: false;
    blocked: boolean;
    message: string;
    result?: SnapshotImportResult;
  };

export function getSnapshotTotalLogCount(summary: SnapshotSummary): number {
  return Object.values(summary.logCounts).reduce((total, count) => total + count, 0);
}

export function getSnapshotExportDateKey(exportedAt: string | null): string {
  if (!exportedAt) return new Date().toISOString().slice(0, 10);

  const parsed = new Date(exportedAt);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString().slice(0, 10);

  return parsed.toISOString().slice(0, 10);
}

function slugifyBackupName(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "child";
}

export function buildBackupJsonFileName(snapshot: TinyTummySnapshotV1, childName?: string | null): string {
  const dateKey = getSnapshotExportDateKey(snapshot.exported_at);

  if (snapshot.export_kind === "child_backup") {
    return `tiny-tummy-${slugifyBackupName(childName ?? snapshot.children[0]?.name ?? "child")}-backup-${dateKey}.json`;
  }

  return `tiny-tummy-backup-${dateKey}.json`;
}

export function buildBackupJsonExport(
  snapshot: TinyTummySnapshotV1,
  jsonExport: SnapshotJsonExport,
  childName?: string | null,
): BackupJsonExport {
  return {
    ...jsonExport,
    filename: buildBackupJsonFileName(snapshot, childName),
    photosIncluded: BACKUP_PHOTOS_INCLUDED,
  };
}

export function formatBackupExportDate(exportedAt: string | null): string {
  if (!exportedAt) return "Unknown";

  const parsed = new Date(exportedAt);
  if (Number.isNaN(parsed.getTime())) return "Unknown";

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

export function parseBackupJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("This file is not valid JSON. No data was imported.");
  }
}

export async function createBackupJsonExport({
  service,
  scope,
  appVersion,
  platform,
}: {
  service: ExportImportService;
  scope: BackupExportScope;
  appVersion?: string | null;
  platform?: string | null;
}): Promise<BackupJsonExport> {
  const options: BuildSnapshotOptions = {
    ...BACKUP_SNAPSHOT_BUILD_OPTIONS,
    appVersion,
    platform,
  };
  const snapshot = scope.kind === "child"
    ? await service.buildChildSnapshot(scope.childId, options)
    : await service.buildFullSnapshot(options);
  const childName = scope.kind === "child" ? scope.childName : null;

  return buildBackupJsonExport(snapshot, service.createSnapshotJsonExport(snapshot), childName);
}

export async function prepareBackupImportJson({
  service,
  fileName,
  json,
}: {
  service: ExportImportService;
  fileName: string;
  json: string;
}): Promise<PreparedBackupImport> {
  let parsed: unknown;

  try {
    parsed = parseBackupJson(json);
  } catch (error) {
    return {
      ok: false,
      fileName,
      message: error instanceof Error ? error.message : "This file is not valid JSON. No data was imported.",
      details: [],
    };
  }

  const validation = service.validateSnapshot(parsed);

  if (!validation.ok) {
    return {
      ok: false,
      fileName,
      message: "This does not look like a valid Tiny Tummy backup. No data was imported.",
      details: validation.errors.map((issue) => `${issue.path}: ${issue.message}`),
    };
  }

  const snapshot = parsed as TinyTummySnapshotV1;
  const summary = service.summarizeSnapshot(snapshot);
  const dryRun = await service.importSnapshot(snapshot, { dryRun: true });

  if (!dryRun.ok || !dryRun.summary) {
    return {
      ok: false,
      fileName,
      message: "Tiny Tummy could not prepare this backup for import. No data was imported.",
      details: dryRun.errors,
    };
  }

  return {
    ok: true,
    fileName,
    snapshot,
    summary: dryRun.summary ?? summary,
    dryRun,
  };
}

export async function applyPreparedBackupImport({
  service,
  prepared,
}: {
  service: ExportImportService;
  prepared: Pick<Extract<PreparedBackupImport, { ok: true }>, "dryRun" | "snapshot">;
}): Promise<ApplyBackupImportResult> {
  if (!prepared.dryRun.emptyLocalDataSet) {
    return {
      ok: false,
      blocked: true,
      message: EXISTING_DATABASE_IMPORT_MESSAGE,
    };
  }

  const result = await service.importSnapshot(prepared.snapshot, { dryRun: false });

  if (!result.ok || !result.applied) {
    return {
      ok: false,
      blocked: false,
      message: result.errors[0] ?? "The backup could not be imported. No data was changed.",
      result,
    };
  }

  return { ok: true, result };
}
