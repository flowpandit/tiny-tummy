export function isSheetGestureLocked() {
  if (typeof document === "undefined") return false;
  return Number(document.body.dataset.sheetLockCount ?? "0") > 0;
}
