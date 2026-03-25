import { useEffect } from "react";
import { platform } from "@tauri-apps/plugin-os";

/**
 * Detects Android and sets --safe-area-top CSS variable on <html>.
 * Android WebView doesn't support env(safe-area-inset-top), so we
 * set a manual fallback. On iOS/desktop, env() works natively.
 */
export function useSafeArea() {
  useEffect(() => {
    async function detect() {
      try {
        const os = await platform();
        if (os === "android") {
          document.documentElement.dataset.platform = "android";
          // Android status bar is 24dp; WebView CSS pixels match dp
          document.documentElement.style.setProperty("--safe-area-top", "28px");
          document.documentElement.style.setProperty("--safe-area-bottom", "0px");
        } else if (os === "ios") {
          document.documentElement.dataset.platform = "ios";
        }
      } catch {
        // Not running in Tauri (dev in browser) — no-op
      }
    }
    detect();
  }, []);
}
