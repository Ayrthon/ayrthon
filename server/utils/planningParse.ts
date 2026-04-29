import type { StoredState } from "~~/shared/planning-state";

/** Exported for PUT validation and Supabase/Blob loaders */
export function parsePlanningStoredState(data: unknown): StoredState | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const comfortTarget =
    typeof d.comfortTarget === "number" && d.comfortTarget > 0
      ? d.comfortTarget
      : 48;
  let dayRate: number | undefined;
  if (
    typeof d.dayRate === "number"
    && Number.isFinite(d.dayRate)
    && d.dayRate >= 0
  ) {
    dayRate = Math.round(d.dayRate * 100) / 100;
  }
  const rawEntries = Array.isArray(d.entries) ? d.entries : [];
  const entries = rawEntries.filter(
    (e): e is StoredState["entries"][number] =>
      !!(
        e
        && typeof e === "object"
        && typeof (e as { id?: unknown }).id === "string"
        && typeof (e as { project?: unknown }).project === "string"
        && Array.isArray((e as { dates?: unknown }).dates)
      ),
  );
  return { comfortTarget, dayRate, entries };
}
