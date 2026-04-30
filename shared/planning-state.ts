export type DayWeight = 1 | 0.5;

export interface JobDay {
  date: string;
  weight: DayWeight;
}

export interface JobEntry {
  id: string;
  project: string;
  days: JobDay[];
}

export interface StoredState {
  comfortTarget: number;
  /** Revenue per logged day (EUR; estimates use EUR). */
  dayRate?: number;
  entries: JobEntry[];
  /**
   * ISO8601 — set when the user saves Planning settings (comfort + day rate).
   * Used server-side to merge concurrent edits without a stale tab overwriting newer settings.
   */
  settingsEditedAt?: string;
  /**
   * Job ids explicitly deleted on any device. Union-merged on save and applied after entry union
   * so removes survive concurrent edits (otherwise union-only merge resurrects deleted rows).
   */
  removedJobIds?: string[];
  /**
   * Per-job ISO8601 stamps set when the user saves the job row editor (project + dates).
   * Merge uses these so date removals replace the union snapshot instead of resurrecting old days.
   */
  jobEditedAt?: Record<string, string>;
}

export function sortJobDays(days: JobDay[]): JobDay[] {
  return [...days].sort((a, b) => a.date.localeCompare(b.date));
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Normalize mixed API shapes: `days: [{date, weight}]`, legacy `dates: string[]`, or legacy `days` as string[]. */
export function normalizeJobDaysFromUnknown(raw: unknown): JobDay[] {
  if (!Array.isArray(raw)) return [];
  const tmp: JobDay[] = [];
  for (const item of raw) {
    if (typeof item === "string" && ISO_RE.test(item)) {
      tmp.push({ date: item, weight: 1 });
      continue;
    }
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const o = item as Record<string, unknown>;
      const dateRaw = o.date;
      if (typeof dateRaw !== "string" || !ISO_RE.test(dateRaw)) continue;
      const w = o.weight;
      const weight: DayWeight =
        w === 0.5 || w === "0.5" || w === "½" ? 0.5 : 1;
      tmp.push({ date: dateRaw, weight });
    }
  }
  const map = new Map<string, DayWeight>();
  for (const d of sortJobDays(tmp)) {
    const prev = map.get(d.date);
    if (prev === undefined) map.set(d.date, d.weight);
    else map.set(d.date, (Math.max(prev, d.weight) as DayWeight));
  }
  return sortJobDays([...map.entries()].map(([date, weight]) => ({ date, weight })));
}

/** Build a canonical {@link JobEntry} from persisted or legacy row data. */
export function normalizeJobEntryRaw(e: unknown): JobEntry | null {
  if (!e || typeof e !== "object" || Array.isArray(e)) return null;
  const o = e as Record<string, unknown>;
  const id = o.id;
  const project = o.project;
  if (typeof id !== "string" || !id.trim()) return null;
  if (typeof project !== "string") return null;

  let days: JobDay[] = [];
  if ("days" in o && Array.isArray(o.days)) {
    days = normalizeJobDaysFromUnknown(o.days);
  } else if ("dates" in o && Array.isArray(o.dates)) {
    days = normalizeJobDaysFromUnknown(o.dates);
  }

  return {
    id: id.trim(),
    project: typeof project === "string" ? project : "",
    days,
  };
}

export function jobDatesStrings(j: JobEntry): string[] {
  return j.days.map((d) => d.date);
}

export function weightOnJobDay(j: JobEntry, iso: string): DayWeight | undefined {
  return j.days.find((d) => d.date === iso)?.weight;
}

/** Merge two day lists; same calendar day → max weight (1 beats ½). */
export function mergeDayLists(a: JobDay[], b: JobDay[]): JobDay[] {
  const m = new Map<string, DayWeight>();
  for (const x of a) m.set(x.date, x.weight);
  for (const x of b) {
    const prev = m.get(x.date);
    if (prev === undefined) m.set(x.date, x.weight);
    else m.set(x.date, (Math.max(prev, x.weight) as DayWeight));
  }
  return sortJobDays([...m.entries()].map(([date, weight]) => ({ date, weight })));
}

/** Normalize weights to 1 | 0.5 only. */
export function sanitizeJobDays(days: JobDay[]): JobDay[] {
  const map = new Map<string, DayWeight>();
  for (const { date, weight } of days) {
    if (!ISO_RE.test(date)) continue;
    const w: DayWeight = weight === 0.5 ? 0.5 : 1;
    map.set(date, w);
  }
  return sortJobDays([...map.entries()].map(([date, weight]) => ({ date, weight })));
}

/** Normalize API / DB payloads (strings, snake_case keys). */
function finitePositive(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
  if (typeof raw === "string") {
    const n = Number(raw.trim());
    if (Number.isFinite(n) && n > 0) return n;
  }
  return undefined;
}

function finiteNonNegative(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) return raw;
  if (typeof raw === "string") {
    const n = Number(raw.trim());
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return undefined;
}

/** Comfort target from stored JSON (camelCase or legacy snake_case). */
export function parseComfortTargetFromStored(raw: unknown): number | undefined {
  const v = finitePositive(raw);
  return v !== undefined ? Math.round(v) : undefined;
}

/** Day rate from stored JSON. */
export function parseDayRateFromStored(raw: unknown): number | undefined {
  const v = finiteNonNegative(raw);
  return v !== undefined ? Math.round(v * 100) / 100 : undefined;
}
