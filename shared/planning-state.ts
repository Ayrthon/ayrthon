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
