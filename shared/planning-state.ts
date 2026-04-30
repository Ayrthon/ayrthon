export interface JobEntry {
  id: string;
  project: string;
  dates: string[];
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
