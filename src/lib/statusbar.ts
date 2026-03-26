import { invoke } from "@tauri-apps/api/core";

/**
 * Set the Android status bar icon appearance.
 * @param isLight - true = dark icons (for light backgrounds), false = light icons (for dark backgrounds)
 * No-op on desktop/iOS.
 */
export async function setStatusBarStyle(isLight: boolean): Promise<void> {
  try {
    await invoke("set_status_bar_style", { isLight });
  } catch {
    // Silently fail on platforms that don't support this (desktop, iOS)
  }
}
