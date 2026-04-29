import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";
import type { H3Event } from "h3";
import type { StoredState } from "~~/shared/planning-state";
import { mergePlannerStateForSave } from "~~/shared/planning-merge";
import { parsePlanningStoredState } from "./planningParse";
import {
  isSupabaseConfigured,
  loadPlanningFromSupabase,
  savePlanningToSupabase,
} from "./planningSupabase";
import { getPlannerBlobStore } from "./netlifyPlannerBlobStore";

export { parsePlanningStoredState };

const BLOB_KEY = "planner-state";

/** Stable path for local dev (`nuxt dev`). */
function planningDataFile(): string {
  return resolve(process.cwd(), ".data/planning-state.json");
}

/** Prefer Netlify Blobs on deployed Functions; use `.data/` for local Node only. */
function useFilesystemBackend(): boolean {
  if (process.env.PLANNING_STORAGE_FS === "1") return true;
  if (process.env.PLANNING_STORAGE_FS === "0") return false;

  const onNetlifyCompute =
    typeof process.env.AWS_LAMBDA_FUNCTION_NAME === "string"
    || (typeof process.env.AWS_EXECUTION_ENV === "string"
      && process.env.AWS_EXECUTION_ENV.startsWith("AWS_Lambda"))
    || process.env.NETLIFY === "true"
    || process.env.NETLIFY_DEV === "true";

  if (onNetlifyCompute) return false;

  return true;
}

export async function loadPlanningState(event: H3Event): Promise<StoredState | null> {
  if (isSupabaseConfigured(event)) {
    return await loadPlanningFromSupabase(event);
  }

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

  const store = await getPlannerBlobStore();
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

export async function savePlanningState(
  event: H3Event,
  incoming: StoredState,
): Promise<void> {
  const existing = await loadPlanningState(event);
  const merged = mergePlannerStateForSave(existing, incoming);

  if (isSupabaseConfigured(event)) {
    await savePlanningToSupabase(event, merged);
    return;
  }

  const payload = JSON.stringify(merged);

  if (useFilesystemBackend()) {
    const p = planningDataFile();
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, payload, "utf8");
    return;
  }

  const store = await getPlannerBlobStore();
  await store.set(BLOB_KEY, payload);
}
