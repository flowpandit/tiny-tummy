export function isNightLoggingWindow(date = new Date()): boolean {
  const hour = date.getHours();
  return hour >= 20 || hour < 6;
}
