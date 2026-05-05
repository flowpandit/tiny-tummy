import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import "./test-dom.ts";
import { cleanup, render, screen } from "@testing-library/react";
import { BackupRestoreSection } from "../src/components/settings/BackupRestoreSection.tsx";
import {
  BACKUP_EXPORT_FEATURE_ID,
  BACKUP_IMPORT_FEATURE_ID,
  applyPreparedBackupImport,
  createBackupJsonExport,
  prepareBackupImportJson,
} from "../src/lib/backup-restore.ts";
import { createFeatureGateService } from "../src/lib/feature-access.ts";
import type { ExportImportService, SnapshotImportResult } from "../src/lib/services/export-import-service.ts";
import type { SnapshotSummary, TinyTummySnapshotV1 } from "../src/lib/export-import-snapshot.ts";
import type { Child } from "../src/lib/types.ts";

afterEach(() => {
  cleanup();
});

const child: Child = {
  id: "child-1",
  name: "Mila Moon",
  date_of_birth: "2026-01-01",
  sex: "female",
  feeding_type: "mixed",
  avatar_color: "#f6b26b",
  is_active: 1,
  created_at: "2026-05-05T09:00:00.000Z",
  updated_at: "2026-05-05T09:00:00.000Z",
  deleted_at: null,
  device_id: "device-local",
  sync_status: "local",
  sync_version: 1,
  local_only: 0,
};

const snapshot: TinyTummySnapshotV1 = {
  schema_version: 1,
  app_name: "Tiny Tummy",
  exported_at: "2026-05-05T10:00:00.000Z",
  export_id: "export-1",
  device_id: "device-local",
  export_kind: "full_backup",
  includes_deleted: false,
  includes_attachments: true,
  attachment_policy: "local_paths_only",
  children: [child],
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
    app_version: "0.1.0",
    platform: "test",
    generated_by: "tiny-tummy-export-import-service",
    notes: ["Photo and attachment file contents are not embedded in v1 snapshots."],
  },
};

const summary: SnapshotSummary = {
  schemaVersion: 1,
  exportKind: "full_backup",
  exportedAt: snapshot.exported_at,
  childCount: 2,
  caregiverCount: 1,
  attachmentCount: 3,
  settingsCount: 0,
  deletedRecordCount: 0,
  logCounts: {
    poop_logs: 2,
    diaper_logs: 1,
    diet_logs: 0,
    sleep_logs: 0,
    symptoms: 0,
    health_episodes: 0,
    episode_events: 0,
    growth_logs: 0,
    milestone_logs: 0,
    quick_presets: 0,
    alerts: 0,
  },
  tableCounts: {} as SnapshotSummary["tableCounts"],
  humanSummary: "2 children, 3 timeline records, 1 caregivers, 3 attachment metadata records.",
  notes: [],
};

function importResult(overrides: Partial<SnapshotImportResult> = {}): SnapshotImportResult {
  return {
    ok: true,
    dryRun: true,
    applied: false,
    mergeStrategy: "skip_existing",
    validation: { ok: true, errors: [], warnings: [] },
    summary,
    emptyLocalDataSet: true,
    totals: { inserted: 3, skipped: 0, replaced: 0, keptLocal: 0 },
    byTable: {} as SnapshotImportResult["byTable"],
    deferred: [],
    errors: [],
    ...overrides,
  };
}

function createMockService(overrides: Partial<ExportImportService> = {}): ExportImportService {
  return {
    buildFullSnapshot: async () => snapshot,
    buildChildSnapshot: async () => ({ ...snapshot, export_kind: "child_backup" }),
    validateSnapshot: () => ({ ok: true, errors: [], warnings: [] }),
    summarizeSnapshot: () => summary,
    createSnapshotJsonExport: (item) => ({
      filename: "service-default.json",
      json: JSON.stringify(item, null, 2),
      summary,
    }),
    importSnapshot: async () => importResult(),
    ...overrides,
  };
}

test("backup feature IDs use the typed FeatureGateService IDs", () => {
  assert.equal(BACKUP_EXPORT_FEATURE_ID, "export_backup");
  assert.equal(BACKUP_IMPORT_FEATURE_ID, "import_backup");

  const gate = createFeatureGateService({
    kind: "premium_unlocked",
    daysRemaining: 14,
    platform: "debug",
    productId: "debug.qa",
    trialStartedAt: "2026-04-01T00:00:00.000Z",
  });

  assert.equal(gate.canUseFeature(BACKUP_EXPORT_FEATURE_ID), true);
  assert.equal(gate.canUseFeature(BACKUP_IMPORT_FEATURE_ID), true);
});

test("creates full backup exports with safe snapshot options and a date filename", async () => {
  const calls: unknown[] = [];
  const service = createMockService({
    buildFullSnapshot: async (options) => {
      calls.push(options);
      return snapshot;
    },
  });

  const jsonExport = await createBackupJsonExport({
    service,
    scope: { kind: "full" },
    appVersion: "0.1.0",
    platform: "darwin",
  });

  assert.deepEqual(calls[0], {
    includeDeleted: false,
    includeAttachmentMetadata: true,
    includeSettings: true,
    appVersion: "0.1.0",
    platform: "darwin",
  });
  assert.equal(jsonExport.filename, "tiny-tummy-backup-2026-05-05.json");
  assert.equal(jsonExport.photosIncluded, false);
  assert.doesNotMatch(jsonExport.json, /base64|file_contents/i);
});

test("creates current-child backup filenames from the child name", async () => {
  const service = createMockService();
  const jsonExport = await createBackupJsonExport({
    service,
    scope: { kind: "child", childId: child.id, childName: child.name },
    appVersion: "0.1.0",
    platform: "ios",
  });

  assert.equal(jsonExport.filename, "tiny-tummy-mila-moon-backup-2026-05-05.json");
});

test("backup section renders privacy copy and import dry-run summary", () => {
  render(React.createElement(BackupRestoreSection, {
    activeChild: child,
    canExportBackup: true,
    canImportBackup: true,
    importPreview: {
      kind: "ready",
      fileName: "tiny-tummy-backup-2026-05-05.json",
      snapshot,
      summary,
      dryRun: importResult({ emptyLocalDataSet: false }),
    },
    isWorking: false,
    lastSaveResult: null,
    statusMessage: null,
    onConfirmImport: () => {},
    onExportChild: () => {},
    onExportFull: () => {},
    onImport: () => {},
    onOpenSaved: () => {},
  }));

  assert.ok(screen.getAllByText("Backup & Restore").length >= 1);
  assert.ok(screen.getByText(/Tiny Tummy stores your baby's data on this device/));
  assert.ok(screen.getByText(/Photos are not included in this backup yet/));
  assert.ok(screen.getByText("Children"));
  assert.ok(screen.getByText("2"));
  assert.ok(screen.getByText("Logs included"));
  assert.ok(screen.getAllByText("3").length >= 1);
  assert.ok(screen.getByText("Caregivers"));
  assert.ok(screen.getByText("1"));
  assert.ok(screen.getByText("Attachments"));
  assert.ok(screen.getByText("Photos included"));
  assert.ok(screen.getByText("No"));
  assert.ok(screen.getByText(/Import into an existing Tiny Tummy database is not available yet/));
});

test("validation failure returns a safe import error", async () => {
  const service = createMockService({
    validateSnapshot: () => ({
      ok: false,
      errors: [{ path: "schema_version", message: "Unsupported Tiny Tummy snapshot schema version." }],
      warnings: [],
    }),
  });

  const prepared = await prepareBackupImportJson({
    service,
    fileName: "bad.json",
    json: "{}",
  });

  assert.equal(prepared.ok, false);
  assert.match(prepared.message, /valid Tiny Tummy backup/);
  assert.deepEqual(prepared.details, ["schema_version: Unsupported Tiny Tummy snapshot schema version."]);
});

test("dry-run import summary preserves child and log counts", async () => {
  const service = createMockService({
    importSnapshot: async (_snapshot, options) => importResult({ dryRun: options?.dryRun ?? true }),
  });

  const prepared = await prepareBackupImportJson({
    service,
    fileName: "tiny-tummy-backup-2026-05-05.json",
    json: JSON.stringify(snapshot),
  });

  assert.equal(prepared.ok, true);
  if (!prepared.ok) return;

  assert.equal(prepared.summary.childCount, 2);
  assert.equal(prepared.summary.caregiverCount, 1);
  assert.equal(prepared.summary.attachmentCount, 3);
  assert.equal(prepared.summary.logCounts.poop_logs + prepared.summary.logCounts.diaper_logs, 3);
});

test("non-empty database import is blocked before service writes", async () => {
  let writeCalls = 0;
  const service = createMockService({
    importSnapshot: async () => {
      writeCalls += 1;
      return importResult({ applied: true, dryRun: false });
    },
  });

  const result = await applyPreparedBackupImport({
    service,
    prepared: {
      snapshot,
      dryRun: importResult({ emptyLocalDataSet: false }),
    },
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.blocked, true);
  assert.equal(writeCalls, 0);
});

test("empty database import path calls the service with dryRun false", async () => {
  const calls: Array<{ dryRun?: boolean }> = [];
  const service = createMockService({
    importSnapshot: async (_snapshot, options) => {
      calls.push({ dryRun: options?.dryRun });
      return importResult({ applied: true, dryRun: false });
    },
  });

  const result = await applyPreparedBackupImport({
    service,
    prepared: {
      snapshot,
      dryRun: importResult({ emptyLocalDataSet: true }),
    },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [{ dryRun: false }]);
});
