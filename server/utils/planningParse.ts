import type { StoredState } from "~~/shared/planning-state";
import {
  parseComfortTargetFromStored,
  parseDayRateFromStored,
} from "~~/shared/planning-state";

/** Exported for PUT validation and Supabase/Blob loaders */
export function parsePlanningStoredState(data: unknown): StoredState | null {
  if (typeof data === "string") {
    try {
      return parsePlanningStoredState(JSON.parse(data) as unknown);
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;

  const comfortTarget =
    parseComfortTargetFromStored(d.comfortTarget)
    ?? parseComfortTargetFromStored(d["comfort_target"])
    ?? 48;

  const dayRate =
    parseDayRateFromStored(d.dayRate)
    ?? parseDayRateFromStored(d["day_rate"]);
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
  const seRaw = d.settingsEditedAt ?? d["settings_edited_at"];
  let settingsEditedAt: string | undefined;
  if (typeof seRaw === "string" && Number.isFinite(Date.parse(seRaw))) {
    settingsEditedAt = seRaw;
  }
  const rmRaw = d.removedJobIds ?? d["removed_job_ids"];
  let removedJobIds: string[] | undefined;
  if (Array.isArray(rmRaw)) {
    const ids = [...new Set(
      rmRaw.filter((x): x is string => typeof x === "string" && x.trim().length > 0),
    )].sort();
    if (ids.length) removedJobIds = ids;
  }
  const base: StoredState = { comfortTarget, dayRate, entries };
  if (settingsEditedAt) base.settingsEditedAt = settingsEditedAt;
  if (removedJobIds) base.removedJobIds = removedJobIds;
  return base;
}
