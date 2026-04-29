import process from "node:process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { H3Event } from "h3";
import type { StoredState } from "~~/shared/planning-state";
import { parsePlanningStoredState } from "./planningParse";

const ROW_ID = "default";

/** Avoid Nitro build-time `process.env` snapshots — match `planningSecrets.ts`. */
function envFirst(keys: readonly string[]): string {
  for (const key of keys) {
    const raw = process.env[key];
    if (typeof raw === "string" && raw.length > 0) return raw.trimEnd();
  }
  return "";
}

/** Credentials resolved per request: `runtimeConfig` (NUXT_* from Netlify) then raw env. */
function resolveSupabaseCredentials(event: H3Event): { url: string; key: string } | null {
  const config = useRuntimeConfig(event);
  let url = String(config.supabaseUrl ?? "").trim();
  let key = String(config.supabaseServiceRoleKey ?? "").trim();

  if (!url) url = envFirst(["SUPABASE_URL", "NUXT_SUPABASE_URL"]);
  if (!key) {
    key = envFirst([
      "SUPABASE_SERVICE_ROLE_KEY",
      "NUXT_SUPABASE_SERVICE_ROLE_KEY",
    ]);
  }

  if (!url || !key) return null;
  return { url, key };
}

const clientCache = new Map<string, SupabaseClient>();

function getClient(event: H3Event): SupabaseClient | null {
  const creds = resolveSupabaseCredentials(event);
  if (!creds) return null;

  const cacheKey = `${creds.url}\0${creds.key}`;
  let client = clientCache.get(cacheKey);
  if (!client) {
    client = createClient(creds.url, creds.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    clientCache.set(cacheKey, client);
  }
  return client;
}

/** True when URL + service role resolve for this request (server-only). */
export function isSupabaseConfigured(event: H3Event): boolean {
  return resolveSupabaseCredentials(event) !== null;
}

export async function loadPlanningFromSupabase(
  event: H3Event,
): Promise<StoredState | null> {
  const sb = getClient(event);
  if (!sb) return null;

  const { data, error } = await sb
    .from("planning_state")
    .select("payload")
    .eq("id", ROW_ID)
    .maybeSingle();

  if (error) {
    console.error("[planning] Supabase load:", error.message);
    throw error;
  }

  if (!data?.payload) return null;
  return parsePlanningStoredState(data.payload);
}

export async function savePlanningToSupabase(
  event: H3Event,
  state: StoredState,
): Promise<void> {
  const sb = getClient(event);
  if (!sb) throw new Error("Supabase client unavailable");

  const { error } = await sb.from("planning_state").upsert(
    {
      id: ROW_ID,
      payload: state as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("[planning] Supabase save:", error.message);
    throw error;
  }
}
