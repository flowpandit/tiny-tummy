import { useCallback, useState } from "react";
import { platform } from "@tauri-apps/plugin-os";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/ui/toast";
import { useServices } from "../contexts/DatabaseContext";
import { useFeatureAccess } from "../contexts/TrialContext";
import {
  BACKUP_EXPORT_FEATURE_ID,
  BACKUP_IMPORT_FEATURE_ID,
  EXISTING_DATABASE_IMPORT_MESSAGE,
  applyPreparedBackupImport,
  createBackupJsonExport,
  prepareBackupImportJson,
} from "../lib/backup-restore";
import {
  openSavedBackupFile,
  pickBackupJsonFile,
  saveBackupJsonFile,
  type BackupSaveResult,
} from "../lib/backup-file-io";
import type { SnapshotImportResult } from "../lib/services/export-import-service";
import type { SnapshotSummary, TinyTummySnapshotV1 } from "../lib/export-import-snapshot";
import type { Child } from "../lib/types";

export type BackupImportPreview =
  | {
    kind: "invalid";
    fileName: string;
    message: string;
    details: string[];
  }
  | {
    kind: "ready";
    fileName: string;
    snapshot: TinyTummySnapshotV1;
    summary: SnapshotSummary;
    dryRun: SnapshotImportResult;
  };

export function useBackupRestoreActions({
  activeChild,
  onImported,
}: {
  activeChild: Child | null;
  onImported?: () => Promise<void> | void;
}) {
  const { exportImport } = useServices();
  const exportAccess = useFeatureAccess(BACKUP_EXPORT_FEATURE_ID);
  const importAccess = useFeatureAccess(BACKUP_IMPORT_FEATURE_ID);
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const [isWorking, setIsWorking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [lastSaveResult, setLastSaveResult] = useState<BackupSaveResult | null>(null);
  const [importPreview, setImportPreview] = useState<BackupImportPreview | null>(null);

  const requireAllowedFeature = useCallback((allowed: boolean, featureId: typeof BACKUP_EXPORT_FEATURE_ID | typeof BACKUP_IMPORT_FEATURE_ID) => {
    if (allowed) return true;

    navigate("/unlock", { state: { featureId, returnTo: "/settings" } });
    return false;
  }, [navigate]);

  const exportFullBackup = useCallback(async () => {
    if (isWorking) return;
    if (!requireAllowedFeature(exportAccess.allowed, BACKUP_EXPORT_FEATURE_ID)) return;

    try {
      setIsWorking(true);
      setStatusMessage(null);
      setLastSaveResult(null);

      const jsonExport = await createBackupJsonExport({
        service: exportImport,
        scope: { kind: "full" },
        appVersion: __APP_VERSION__,
        platform: platform(),
      });
      const saveResult = await saveBackupJsonFile(jsonExport.filename, jsonExport.json);

      if (!saveResult) return;

      setLastSaveResult(saveResult);
      const message = saveResult.kind === "android_downloads"
        ? "Backup saved to Downloads. Photos are not included in this backup yet."
        : saveResult.kind === "ios_share"
          ? "Backup shared. Photos are not included in this backup yet."
          : "Backup saved. Photos are not included in this backup yet.";
      setStatusMessage(message);
      showSuccess(message);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showError(`Could not export backup: ${message}`);
    } finally {
      setIsWorking(false);
    }
  }, [exportAccess.allowed, exportImport, isWorking, requireAllowedFeature, showError, showSuccess]);

  const exportCurrentChildBackup = useCallback(async () => {
    if (isWorking || !activeChild) return;
    if (!requireAllowedFeature(exportAccess.allowed, BACKUP_EXPORT_FEATURE_ID)) return;

    try {
      setIsWorking(true);
      setStatusMessage(null);
      setLastSaveResult(null);

      const jsonExport = await createBackupJsonExport({
        service: exportImport,
        scope: {
          kind: "child",
          childId: activeChild.id,
          childName: activeChild.name,
        },
        appVersion: __APP_VERSION__,
        platform: platform(),
      });
      const saveResult = await saveBackupJsonFile(jsonExport.filename, jsonExport.json);

      if (!saveResult) return;

      setLastSaveResult(saveResult);
      const message = saveResult.kind === "android_downloads"
        ? `${activeChild.name}'s backup saved to Downloads. Photos are not included in this backup yet.`
        : saveResult.kind === "ios_share"
          ? `${activeChild.name}'s backup shared. Photos are not included in this backup yet.`
          : `${activeChild.name}'s backup saved. Photos are not included in this backup yet.`;
      setStatusMessage(message);
      showSuccess(message);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showError(`Could not export child backup: ${message}`);
    } finally {
      setIsWorking(false);
    }
  }, [activeChild, exportAccess.allowed, exportImport, isWorking, requireAllowedFeature, showError, showSuccess]);

  const selectImportBackup = useCallback(async () => {
    if (isWorking) return;
    if (!requireAllowedFeature(importAccess.allowed, BACKUP_IMPORT_FEATURE_ID)) return;

    try {
      setIsWorking(true);
      setStatusMessage(null);
      setImportPreview(null);

      const selected = await pickBackupJsonFile();
      if (!selected) return;

      const prepared = await prepareBackupImportJson({
        service: exportImport,
        fileName: selected.fileName,
        json: selected.json,
      });

      if (!prepared.ok) {
        setImportPreview({
          kind: "invalid",
          fileName: prepared.fileName,
          message: prepared.message,
          details: prepared.details,
        });
        showError(prepared.message);
        return;
      }

      setImportPreview({
        kind: "ready",
        fileName: prepared.fileName,
        snapshot: prepared.snapshot,
        summary: prepared.summary,
        dryRun: prepared.dryRun,
      });

      setStatusMessage(prepared.dryRun.emptyLocalDataSet
        ? "Backup looks valid. Review the summary before importing."
        : EXISTING_DATABASE_IMPORT_MESSAGE);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setImportPreview({
        kind: "invalid",
        fileName: "Selected file",
        message,
        details: [],
      });
      showError(message);
    } finally {
      setIsWorking(false);
    }
  }, [exportImport, importAccess.allowed, isWorking, requireAllowedFeature, showError]);

  const confirmImportBackup = useCallback(async () => {
    if (isWorking || importPreview?.kind !== "ready") return;
    if (!requireAllowedFeature(importAccess.allowed, BACKUP_IMPORT_FEATURE_ID)) return;

    if (!importPreview.dryRun.emptyLocalDataSet) {
      setStatusMessage(EXISTING_DATABASE_IMPORT_MESSAGE);
      showError(EXISTING_DATABASE_IMPORT_MESSAGE);
      return;
    }

    try {
      setIsWorking(true);
      const applied = await applyPreparedBackupImport({
        service: exportImport,
        prepared: importPreview,
      });

      if (!applied.ok) {
        showError(applied.message);
        setStatusMessage(applied.message);
        return;
      }

      await onImported?.();
      const message = "Backup imported successfully.";
      setStatusMessage(message);
      showSuccess(message);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showError(`Could not import backup: ${message}`);
    } finally {
      setIsWorking(false);
    }
  }, [exportImport, importAccess.allowed, importPreview, isWorking, onImported, requireAllowedFeature, showError, showSuccess]);

  const openLastSavedBackup = useCallback(async () => {
    if (!lastSaveResult) return;

    try {
      await openSavedBackupFile(lastSaveResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showError(message || "Could not open the saved backup.");
    }
  }, [lastSaveResult, showError]);

  return {
    exportAccess,
    importAccess,
    importPreview,
    isWorking,
    lastSaveResult,
    statusMessage,
    confirmImportBackup,
    exportCurrentChildBackup,
    exportFullBackup,
    openLastSavedBackup,
    selectImportBackup,
  };
}
