import process from "node:process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { StoredState } from "~~/shared/planning-state";
import { parsePlanningStoredState } from "./planningParse";

const ROW_ID = "default";

let client: SupabaseClient | null | undefined;

function getClient(): SupabaseClient | null {
  if (client === undefined) {
    const url = process.env["SUPABASE_URL"]?.trim();
    const key = process.env["SUPABASE_SERVICE_ROLE_KEY"]?.trim();
    if (!url || !key) {
      client = null;
    } else {
      client = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
  }
  return client;
}

/** True when URL + service role are set (server-side only; never expose service key to the browser). */
export function isSupabaseConfigured(): boolean {
  return getClient() !== null;
}

export async function loadPlanningFromSupabase(): Promise<StoredState | null> {
  const sb = getClient();
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

export async function savePlanningToSupabase(state: StoredState): Promise<void> {
  const sb = getClient();
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
