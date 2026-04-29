import type { JobEntry, StoredState } from "./planning-state";

/** Union dates per job id so concurrent devices do not overwrite each other's rows.
 *
 * Jobs present only on the server copy are kept (another browser saved first).
 * Jobs present only in this PUT are kept (this browser added before pulling).
 * Same id → union date lists + prefer non-empty project name.
 *
 * Limitation: deleting a job on one device can reappear if another device saves an older
 * snapshot before refreshing — fixing that needs tombstones or per-row versions.
 */
export function mergeJobEntries(remote: JobEntry[], local: JobEntry[]): JobEntry[] {
  const map = new Map<string, JobEntry>();

  for (const e of remote) {
    if (!e?.id) continue;
    map.set(e.id, {
      id: e.id,
      project: typeof e.project === "string" ? e.project : "",
      dates: Array.isArray(e.dates) ? [...e.dates] : [],
    });
  }

  for (const e of local) {
    if (!e?.id) continue;
    const prev = map.get(e.id);
    const datesLocal = Array.isArray(e.dates) ? e.dates : [];
    if (!prev) {
      map.set(e.id, {
        id: e.id,
        project: typeof e.project === "string" ? e.project.trim() : "",
        dates: [...new Set(datesLocal)].sort(),
      });
      continue;
    }
    const mergedDates = [...new Set([...prev.dates, ...datesLocal])].sort();
    const project =
      typeof e.project === "string" && e.project.trim()
        ? e.project.trim()
        : prev.project;
    map.set(e.id, { id: e.id, project, dates: mergedDates });
  }

  return [...map.values()].sort((a, b) => {
    const pa = a.project.localeCompare(b.project);
    if (pa !== 0) return pa;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Combine persisted snapshot with this device's PUT so last-write does not drop jobs
 * saved from another browser/session.
 */
export function mergePlannerStateForSave(
  existing: StoredState | null,
  incoming: StoredState,
): StoredState {
  const entries = mergeJobEntries(existing?.entries ?? [], incoming.entries);
  const dayRate =
    typeof incoming.dayRate === "number" && Number.isFinite(incoming.dayRate)
      ? incoming.dayRate
      : existing?.dayRate;
  return {
    comfortTarget: incoming.comfortTarget,
    dayRate,
    entries,
  };
}
