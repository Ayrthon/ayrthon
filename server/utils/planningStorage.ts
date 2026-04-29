import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { StoredState } from "~~/shared/planning-state";

const BLOB_KEY = "planner-state";

function planningDataFile(): string {
  const root = fileURLToPath(new URL("../..", import.meta.url));
  return resolve(root, ".data/planning-state.json");
}

/** Netlify Functions set NETLIFY=true; local `nuxt dev` does not — use a JSON file. */
function useFilesystemBackend(): boolean {
  return process.env.NETLIFY !== "true";
}

export async function loadPlanningState(): Promise<StoredState | null> {
  if (useFilesystemBackend()) {
    try {
      const p = planningDataFile();
      const raw = await readFile(p, "utf8");
      const data = JSON.parse(raw) as StoredState;
      return parsePlanningStoredState(data);
    } catch {
      return null;
    }
  }

  const { getStore } = await import("@netlify/blobs");
  const store = getStore("job-planner");
  const raw = await store.get(BLOB_KEY);
  if (raw === null || raw === undefined) return null;

  let text: string;
  if (typeof raw === "string") text = raw;
  else if (raw instanceof ArrayBuffer) {
    text = Buffer.from(raw).toString("utf8");
  } else if (typeof Blob !== "undefined" && raw instanceof Blob) {
    text = await raw.text();
  } else {
    text = String(raw);
  }

  try {
    const data = JSON.parse(text) as StoredState;
    return parsePlanningStoredState(data);
  } catch {
    return null;
  }
}

export async function savePlanningState(state: StoredState): Promise<void> {
  const payload = JSON.stringify(state);

  if (useFilesystemBackend()) {
    const p = planningDataFile();
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, payload, "utf8");
    return;
  }

  const { getStore } = await import("@netlify/blobs");
  const store = getStore("job-planner");
  await store.set(BLOB_KEY, payload);
}

/** Exported for PUT validation */
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
