import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { PremiumBadge } from "../billing/PremiumLocks";
import {
  BACKUP_EXPORT_FEATURE_ID,
  BACKUP_IMPORT_FEATURE_ID,
  EXISTING_DATABASE_IMPORT_MESSAGE,
  formatBackupExportDate,
  getSnapshotTotalLogCount,
} from "../../lib/backup-restore";
import type { BackupImportPreview } from "../../hooks/useBackupRestoreActions";
import type { BackupSaveResult } from "../../lib/backup-file-io";
import type { Child } from "../../lib/types";

const SETTINGS_SECTION_TITLE_CLASS = "mb-2.5 px-1 text-[0.74rem] font-bold uppercase tracking-[0.18em] text-[var(--color-text-secondary)] md:mb-3 md:text-[0.78rem]";
const SETTINGS_CARD_CLASS = "overflow-hidden rounded-[18px] shadow-[var(--shadow-home-card)] md:rounded-[24px]";

function ActionIcon({ kind }: { kind: "export" | "import" | "open" }) {
  if (kind === "import") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 3v9" />
        <path d="m6.5 8.5 3.5 3.5 3.5-3.5" />
        <path d="M4 15.5h12" />
      </svg>
    );
  }

  if (kind === "open") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7 5h8v8" />
        <path d="M15 5 6 14" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 3v9" />
      <path d="m6.5 6.5 3.5-3.5 3.5 3.5" />
      <path d="M4 15.5h12" />
    </svg>
  );
}

function ImportSummary({ preview }: { preview: BackupImportPreview }) {
  if (preview.kind === "invalid") {
    return (
      <div className="rounded-[16px] border border-[var(--color-alert)]/25 bg-[var(--color-alert-bg)] px-3.5 py-3 text-[0.82rem] leading-relaxed text-[var(--color-text)]">
        <p className="font-semibold">Backup could not be validated</p>
        <p className="mt-1 text-[var(--color-text-secondary)]">{preview.message}</p>
        {preview.details.length > 0 && (
          <p className="mt-2 text-[0.76rem] text-[var(--color-text-secondary)]">
            First issue: {preview.details[0]}
          </p>
        )}
      </div>
    );
  }

  const summary = preview.summary;
  const logCount = getSnapshotTotalLogCount(summary);
  const canImport = preview.dryRun.emptyLocalDataSet;

  return (
    <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[0.86rem] font-semibold text-[var(--color-text)]">{preview.fileName}</p>
          <p className="mt-0.5 text-[0.76rem] leading-snug text-[var(--color-text-secondary)]">
            Exported {formatBackupExportDate(summary.exportedAt)}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--color-primary)]/10 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.08em] text-[var(--color-primary)]">
          Checked
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-[0.76rem] md:grid-cols-5">
        <div className="rounded-[12px] bg-[var(--color-bg)] px-2.5 py-2">
          <dt className="text-[var(--color-text-secondary)]">Children</dt>
          <dd className="mt-0.5 font-bold text-[var(--color-text)]">{summary.childCount}</dd>
        </div>
        <div className="rounded-[12px] bg-[var(--color-bg)] px-2.5 py-2">
          <dt className="text-[var(--color-text-secondary)]">Logs included</dt>
          <dd className="mt-0.5 font-bold text-[var(--color-text)]">{logCount}</dd>
        </div>
        <div className="rounded-[12px] bg-[var(--color-bg)] px-2.5 py-2">
          <dt className="text-[var(--color-text-secondary)]">Caregivers</dt>
          <dd className="mt-0.5 font-bold text-[var(--color-text)]">{summary.caregiverCount}</dd>
        </div>
        <div className="rounded-[12px] bg-[var(--color-bg)] px-2.5 py-2">
          <dt className="text-[var(--color-text-secondary)]">Attachments</dt>
          <dd className="mt-0.5 font-bold text-[var(--color-text)]">{summary.attachmentCount}</dd>
        </div>
        <div className="rounded-[12px] bg-[var(--color-bg)] px-2.5 py-2">
          <dt className="text-[var(--color-text-secondary)]">Photos included</dt>
          <dd className="mt-0.5 font-bold text-[var(--color-text)]">No</dd>
        </div>
      </dl>

      {!canImport && (
        <p className="mt-3 rounded-[12px] bg-[var(--color-alert-bg)] px-3 py-2 text-[0.78rem] leading-relaxed text-[var(--color-text)]">
          {EXISTING_DATABASE_IMPORT_MESSAGE}
        </p>
      )}
    </div>
  );
}

function getOpenSavedLabel(result: BackupSaveResult | null): string | null {
  if (!result) return null;
  if (result.kind === "android_downloads") return "Open saved backup";
  if (result.kind === "ios_share") return "Share backup again";
  return null;
}

export function BackupRestoreSection({
  activeChild,
  canExportBackup,
  canImportBackup,
  importPreview,
  isWorking,
  lastSaveResult,
  statusMessage,
  onConfirmImport,
  onExportChild,
  onExportFull,
  onImport,
  onOpenSaved,
}: {
  activeChild: Child | null;
  canExportBackup: boolean;
  canImportBackup: boolean;
  importPreview: BackupImportPreview | null;
  isWorking: boolean;
  lastSaveResult: BackupSaveResult | null;
  statusMessage: string | null;
  onConfirmImport: () => void;
  onExportChild: () => void;
  onExportFull: () => void;
  onImport: () => void;
  onOpenSaved: () => void;
}) {
  const openSavedLabel = getOpenSavedLabel(lastSaveResult);
  const canConfirmImport = importPreview?.kind === "ready" && importPreview.dryRun.emptyLocalDataSet;
  const statusClassName = statusMessage === EXISTING_DATABASE_IMPORT_MESSAGE
    ? "rounded-[14px] bg-[var(--color-alert-bg)] px-3.5 py-2.5 text-[0.8rem] font-semibold leading-relaxed text-[var(--color-text)]"
    : "rounded-[14px] bg-[var(--color-healthy-bg)] px-3.5 py-2.5 text-[0.8rem] font-semibold leading-relaxed text-[var(--color-text)]";

  return (
    <section>
      <h3 className={SETTINGS_SECTION_TITLE_CLASS}>Backup &amp; Restore</h3>
      <Card className={SETTINGS_CARD_CLASS}>
        <CardContent className="space-y-4 px-4 py-4">
          <div>
            <p className="text-[0.96rem] font-bold leading-tight text-[var(--color-text)]">Backup &amp; Restore</p>
            <p className="mt-1 text-[0.82rem] leading-relaxed text-[var(--color-text-secondary)]">
              Tiny Tummy stores your baby's data on this device. You can export a local backup file and keep it somewhere safe.
            </p>
          </div>

          <div className="rounded-[16px] bg-[var(--color-surface)] px-3.5 py-3 text-[0.78rem] leading-relaxed text-[var(--color-text-secondary)]">
            <p>Backups are generated locally. Photos are not included in this backup yet.</p>
            <p className="mt-1">Backups are saved locally by you. Keep backup files private. Anyone with the file may be able to read the logged data.</p>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="min-h-11 gap-2 rounded-[14px]"
              disabled={isWorking}
              onClick={onExportFull}
            >
              <ActionIcon kind="export" />
              <span className="min-w-0 truncate">{canExportBackup ? "Export full backup" : "Unlock backup export"}</span>
              {!canExportBackup && <PremiumBadge featureId={BACKUP_EXPORT_FEATURE_ID} className="px-1.5 py-0.5 text-[0.55rem]" />}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="min-h-11 gap-2 rounded-[14px]"
              disabled={isWorking || !activeChild}
              onClick={onExportChild}
            >
              <ActionIcon kind="export" />
              <span className="min-w-0 truncate">{canExportBackup ? (activeChild ? `Export ${activeChild.name}` : "Export child backup") : "Unlock child backup"}</span>
              {!canExportBackup && <PremiumBadge featureId={BACKUP_EXPORT_FEATURE_ID} className="px-1.5 py-0.5 text-[0.55rem]" />}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="min-h-11 gap-2 rounded-[14px]"
              disabled={isWorking}
              onClick={onImport}
            >
              <ActionIcon kind="import" />
              <span className="min-w-0 truncate">{canImportBackup ? "Import backup" : "Unlock backup import"}</span>
              {!canImportBackup && <PremiumBadge featureId={BACKUP_IMPORT_FEATURE_ID} className="px-1.5 py-0.5 text-[0.55rem]" />}
            </Button>
          </div>

          {statusMessage && (
            <p className={statusClassName}>
              {statusMessage}
            </p>
          )}

          {openSavedLabel && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full gap-2 rounded-[14px]"
              disabled={isWorking}
              onClick={onOpenSaved}
            >
              <ActionIcon kind="open" />
              {openSavedLabel}
            </Button>
          )}

          {importPreview && (
            <div className="space-y-3">
              <ImportSummary preview={importPreview} />
              {importPreview.kind === "ready" && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="w-full rounded-[14px]"
                  disabled={isWorking || !canConfirmImport}
                  onClick={onConfirmImport}
                >
                  {canConfirmImport ? "Import into this app" : "Import unavailable for existing data"}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
