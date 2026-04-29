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

function normalizeJobEntry(e: JobEntry): JobEntry {
  return {
    id: e.id,
    project: typeof e.project === "string" ? e.project : "",
    dates: [...new Set(Array.isArray(e.dates) ? e.dates : [])].sort(),
  };
}

function pickNewerJobStamp(a: string | undefined, b: string | undefined): string | undefined {
  const ma = isoMs(a);
  const mb = isoMs(b);
  if (ma == null) return b;
  if (mb == null) return a;
  return ma >= mb ? a : b;
}

/**
 * Merge rows using `jobEditedAt` so list-editor saves (date removals) replace union-merge snapshots.
 * Falls back to union merge when neither side has a dialog stamp for that job id.
 */
export function mergeJobEntriesWithEditTimes(
  existing: StoredState | null,
  incoming: StoredState,
): { entries: JobEntry[]; jobEditedAt?: Record<string, string> } {
  const R = existing?.entries ?? [];
  const I = incoming.entries;
  const rMap = new Map(R.map((e) => [e.id, e]));
  const iMap = new Map(I.map((e) => [e.id, e]));
  const idSet = new Set<string>();
  for (const [id] of rMap) idSet.add(id);
  for (const [id] of iMap) idSet.add(id);

  const rTs = existing?.jobEditedAt ?? {};
  const iTs = incoming.jobEditedAt ?? {};

  const outJe: Record<string, string> = {};
  const out: JobEntry[] = [];

  for (const id of [...idSet].sort()) {
    const re = rMap.get(id);
    const ie = iMap.get(id);
    const rt = rTs[id];
    const it = iTs[id];

    const pair = mergeJobPair(re, ie, rt, it);
    if (!pair) continue;
    out.push(pair.entry);
    if (pair.stamp) outJe[id] = pair.stamp;
  }

  out.sort((a, b) => {
    const pa = a.project.localeCompare(b.project);
    if (pa !== 0) return pa;
    return a.id.localeCompare(b.id);
  });

  return {
    entries: out,
    ...(Object.keys(outJe).length ? { jobEditedAt: outJe } : {}),
  };
}

function mergeJobPair(
  re: JobEntry | undefined,
  ie: JobEntry | undefined,
  rt: string | undefined,
  it: string | undefined,
): { entry: JobEntry; stamp?: string } | undefined {
  if (!re && !ie) return undefined;
  if (!re && ie) return { entry: normalizeJobEntry(ie), stamp: it };
  if (re && !ie) return { entry: normalizeJobEntry(re), stamp: rt };

  const im = isoMs(it);
  const rm = isoMs(rt);

  /** Incoming dialog edit wins — keeps date removals and project edits from the editor. */
  if (im != null && (rm == null || im >= rm)) {
    return { entry: normalizeJobEntry(ie!), stamp: it };
  }

  /** Remote dialog strictly newer — union dates so a stale tab without a stamp cannot wipe adds. */
  if (rm != null && (im == null || rm > im)) {
    const mergedDates = [...new Set([...re!.dates, ...ie!.dates])].sort();
    const project =
      typeof ie!.project === "string" && ie!.project.trim()
        ? ie!.project.trim()
        : re!.project;
    return {
      entry: { id: re!.id, project, dates: mergedDates },
      stamp: rt,
    };
  }

  const mergedDates = [...new Set([...re!.dates, ...ie!.dates])].sort();
  const project =
    typeof ie!.project === "string" && ie!.project.trim()
      ? ie!.project.trim()
      : re!.project;
  return {
    entry: { id: re!.id, project, dates: mergedDates },
    stamp: pickNewerJobStamp(rt, it),
  };
}

export function mergePlannerEntriesWithRemovals(
  existing: StoredState | null,
  incoming: StoredState,
): {
  entries: JobEntry[];
  removedJobIds?: string[];
  jobEditedAt?: Record<string, string>;
} {
  const mergedRemoved = new Set<string>([
    ...(existing?.removedJobIds ?? []),
    ...(incoming.removedJobIds ?? []),
  ]);
  for (const e of incoming.entries) {
    if (e?.id) mergedRemoved.delete(e.id);
  }
  const merged = mergeJobEntriesWithEditTimes(existing, incoming);
  const filtered = merged.entries.filter((e) => !mergedRemoved.has(e.id));

  let jeOut = merged.jobEditedAt;
  if (jeOut && mergedRemoved.size) {
    jeOut = { ...jeOut };
    for (const id of mergedRemoved) delete jeOut[id];
  }
  if (jeOut) {
    const alive = new Set(filtered.map((e) => e.id));
    jeOut = Object.fromEntries(
      Object.entries(jeOut).filter(([k]) => alive.has(k)),
    );
    if (Object.keys(jeOut).length === 0) jeOut = undefined;
  }

  const ids = [...mergedRemoved].sort();
  return {
    entries: filtered,
    ...(ids.length ? { removedJobIds: ids } : {}),
    ...(jeOut ? { jobEditedAt: jeOut } : {}),
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
    ...(rows.jobEditedAt ? { jobEditedAt: rows.jobEditedAt } : {}),
    ...(scalars.settingsEditedAt
      ? { settingsEditedAt: scalars.settingsEditedAt }
      : {}),
  };
}
