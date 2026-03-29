import { mkdir, writeFile, readFile, remove, exists } from "@tauri-apps/plugin-fs";
import { BaseDirectory } from "@tauri-apps/api/path";
import { generateId } from "./utils";

const PHOTOS_DIR = "photos";

async function ensurePhotosDir() {
  const dirExists = await exists(PHOTOS_DIR, { baseDir: BaseDirectory.AppData });
  if (!dirExists) {
    await mkdir(PHOTOS_DIR, { baseDir: BaseDirectory.AppData, recursive: true });
  }
}

/**
 * Save a photo file to the app's private data directory.
 * Returns the relative path (e.g. "photos/abc123.jpg") for storage in DB.
 */
export async function savePhoto(file: File): Promise<string> {
  await ensurePhotosDir();

  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `${generateId()}.${ext}`;
  const relativePath = `${PHOTOS_DIR}/${filename}`;

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  await writeFile(relativePath, bytes, { baseDir: BaseDirectory.AppData });

  return relativePath;
}

/**
 * Load a photo from the app's data directory as an object URL for display.
 */
export async function loadPhoto(relativePath: string): Promise<string> {
  const bytes = await readFile(relativePath, { baseDir: BaseDirectory.AppData });
  const blob = new Blob([bytes], { type: "image/jpeg" });
  return URL.createObjectURL(blob);
}

export async function loadPhotoDataUrl(relativePath: string): Promise<string> {
  const bytes = await readFile(relativePath, { baseDir: BaseDirectory.AppData });
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return `data:image/jpeg;base64,${btoa(binary)}`;
}

/**
 * Delete a photo from the app's data directory.
 */
export async function deletePhoto(relativePath: string): Promise<void> {
  const fileExists = await exists(relativePath, { baseDir: BaseDirectory.AppData });
  if (fileExists) {
    await remove(relativePath, { baseDir: BaseDirectory.AppData });
  }
}

// --- Avatar photos ---

function avatarPath(childId: string): string {
  return `${PHOTOS_DIR}/avatar-${childId}.jpg`;
}

export async function saveAvatar(childId: string, blob: Blob): Promise<string> {
  await ensurePhotosDir();
  const path = avatarPath(childId);
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  await writeFile(path, bytes, { baseDir: BaseDirectory.AppData });
  return path;
}

export async function loadAvatar(childId: string): Promise<string | null> {
  const path = avatarPath(childId);
  const fileExists = await exists(path, { baseDir: BaseDirectory.AppData });
  if (!fileExists) return null;
  const bytes = await readFile(path, { baseDir: BaseDirectory.AppData });
  const blob = new Blob([bytes], { type: "image/jpeg" });
  return URL.createObjectURL(blob);
}

export async function deleteAvatar(childId: string): Promise<void> {
  const path = avatarPath(childId);
  const fileExists = await exists(path, { baseDir: BaseDirectory.AppData });
  if (fileExists) {
    await remove(path, { baseDir: BaseDirectory.AppData });
  }
}
