import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { platform } from "@tauri-apps/plugin-os";
import {
  openFileFromDownloads,
  saveTextToDownloads,
  shareJsonBackup,
  type SavedDownloadsFile,
} from "./tauri";

export interface BackupFileSelection {
  fileName: string;
  json: string;
}

export type BackupSaveResult =
  | { kind: "android_downloads"; fileName: string; uri: string }
  | { kind: "ios_share"; fileName: string; json: string }
  | { kind: "desktop_save"; fileName: string; path: string };

function fileNameFromPath(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "Tiny Tummy backup";
}

export async function saveBackupJsonFile(fileName: string, json: string): Promise<BackupSaveResult | null> {
  const currentPlatform = platform();

  if (currentPlatform === "android") {
    const saved: SavedDownloadsFile = await saveTextToDownloads(fileName, json, "application/json");
    return { kind: "android_downloads", fileName: saved.fileName, uri: saved.uri };
  }

  if (currentPlatform === "ios") {
    await shareJsonBackup(fileName, json);
    return { kind: "ios_share", fileName, json };
  }

  const targetPath = await save({
    defaultPath: fileName,
    filters: [
      {
        name: "Tiny Tummy backup",
        extensions: ["json"],
      },
    ],
  });

  if (!targetPath) return null;

  await writeTextFile(targetPath, json);
  return { kind: "desktop_save", fileName, path: targetPath };
}

export async function pickBackupJsonFile(): Promise<BackupFileSelection | null> {
  const selectedPath = await open({
    multiple: false,
    filters: [
      {
        name: "Tiny Tummy backup",
        extensions: ["json"],
      },
    ],
  });

  if (!selectedPath || Array.isArray(selectedPath)) return null;

  const json = await readTextFile(selectedPath);
  return {
    fileName: fileNameFromPath(selectedPath),
    json,
  };
}

export async function openSavedBackupFile(result: BackupSaveResult): Promise<void> {
  if (result.kind === "android_downloads") {
    await openFileFromDownloads(result.uri, "application/json");
    return;
  }

  if (result.kind === "ios_share") {
    await shareJsonBackup(result.fileName, result.json);
  }
}
