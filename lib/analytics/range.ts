import { londonDay } from "@/lib/runtime";

export function resolveAnalyticsRange(preset: string, customFrom?: string | null, customTo?: string | null) {
  const today = londonDay();
  if (preset === "today") return { from: today, to: today, preset: "today" };
  if (preset === "30d") {
    const end = new Date(`${today}T00:00:00.000Z`);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 29);
    return { from: start.toISOString().slice(0, 10), to: today, preset: "30d" };
  }
  if (preset === "custom" && customFrom && customTo) {
    return { from: customFrom.slice(0, 10), to: customTo.slice(0, 10), preset: "custom" };
  }
  const end = new Date(`${today}T00:00:00.000Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 6);
  return { from: start.toISOString().slice(0, 10), to: today, preset: "7d" };
}
