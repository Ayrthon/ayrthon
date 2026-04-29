import type { JobEntry, StoredState } from "./planning-state";

/** Union dates per job id so concurrent devices do not overwrite each other's rows.
 *
 * Jobs present only on the server copy are kept (another browser saved first).
 * Jobs present only in this PUT are kept (this browser added before pulling).
 * Same id → union date lists + prefer non-empty project name.
 *
 * Deletes are handled separately via `removedJobIds` in {@link mergePlannerEntriesWithRemovals}
 * (union-merge alone cannot drop rows).
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

function isoMs(iso: string | undefined): number | undefined {
  if (!iso) return undefined;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : undefined;
}

/** Merge comfort/day rate using `settingsEditedAt` so autosaves from stale tabs cannot wipe newer settings. */
export function mergePlannerScalars(
  existing: StoredState | null,
  incoming: StoredState,
): Pick<StoredState, "comfortTarget" | "dayRate" | "settingsEditedAt"> {
  const r = existing;
  const rim = isoMs(r?.settingsEditedAt);
  const iim = isoMs(incoming.settingsEditedAt);

  if (rim !== undefined && iim !== undefined) {
    if (iim >= rim) {
      return {
        comfortTarget: incoming.comfortTarget,
        dayRate: incoming.dayRate,
        settingsEditedAt: incoming.settingsEditedAt,
      };
    }
    return {
      comfortTarget: r!.comfortTarget,
      dayRate: r!.dayRate,
      settingsEditedAt: r!.settingsEditedAt,
    };
  }

  if (iim !== undefined && rim === undefined) {
    return {
      comfortTarget: incoming.comfortTarget,
      dayRate: incoming.dayRate,
      settingsEditedAt: incoming.settingsEditedAt,
    };
  }

  if (rim !== undefined && iim === undefined) {
    /** Incoming PUT has no stamp (autosave / job edit only) — never overwrite tagged settings. */
    return {
      comfortTarget: r!.comfortTarget,
      dayRate: r!.dayRate,
      settingsEditedAt: r!.settingsEditedAt,
    };
  }

  const rct = r && r.comfortTarget > 0 ? r.comfortTarget : 48;
  const ict = incoming.comfortTarget > 0 ? incoming.comfortTarget : 48;
  const rd = r?.dayRate;
  const id = incoming.dayRate;
  let mergeDr: number | undefined;
  if (rd === undefined || rd === null) mergeDr = id;
  else if (id === undefined || id === null) mergeDr = rd;
  else mergeDr = Math.max(rd, id);

  return {
    comfortTarget: Math.max(rct, ict),
    dayRate: mergeDr,
    settingsEditedAt: undefined,
  };
}

/**
 * Union-merge job rows, union-merge tombstones, then drop rows marked removed.
 * Any id listed in `incoming.entries` clears its tombstone (same id intentionally saved again).
 */
export function mergePlannerEntriesWithRemovals(
  existing: StoredState | null,
  incoming: StoredState,
): { entries: JobEntry[]; removedJobIds?: string[] } {
  const mergedRemoved = new Set<string>([
    ...(existing?.removedJobIds ?? []),
    ...(incoming.removedJobIds ?? []),
  ]);
  for (const e of incoming.entries) {
    if (e?.id) mergedRemoved.delete(e.id);
  }
  const unionEntries = mergeJobEntries(existing?.entries ?? [], incoming.entries);
  const filtered = unionEntries.filter((e) => !mergedRemoved.has(e.id));
  const ids = [...mergedRemoved].sort();
  return {
    entries: filtered,
    ...(ids.length ? { removedJobIds: ids } : {}),
  };
}

/**
 * Combine persisted snapshot with this device's PUT so last-write does not drop jobs
 * saved from another browser/session.
 */
export function mergePlannerStateForSave(
  existing: StoredState | null,
  incoming: StoredState,
): StoredState {
  const rows = mergePlannerEntriesWithRemovals(existing, incoming);
  const scalars = mergePlannerScalars(existing, incoming);
  return {
    comfortTarget: scalars.comfortTarget,
    dayRate: scalars.dayRate,
    entries: rows.entries,
    ...(rows.removedJobIds ? { removedJobIds: rows.removedJobIds } : {}),
    ...(scalars.settingsEditedAt
      ? { settingsEditedAt: scalars.settingsEditedAt }
      : {}),
  };
}
