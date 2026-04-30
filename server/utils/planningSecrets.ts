import process from "node:process";
import type { H3Event } from "h3";

/**
 * Read secrets from the live `process.env` object.
 *
 * Import `process` from `node:process` so Rollup/Nitro does not substitute a build-time
 * snapshot of `process.env` (which would stay empty on Netlify even when Functions env vars exist).
 */
function envFirst(keys: readonly string[]): string {
  for (const key of keys) {
    const raw = process.env[key];
    if (typeof raw === "string" && raw.length > 0) {
      return raw.trimEnd();
    }
  }
  return "";
}

/**
 * Password + session signing secret for `/api/planning/*`.
 *
 * Prefer Nitro `runtimeConfig`, then live `process.env` (see `envFirst`).
 *
 * Supported Netlify keys:
 * - Password: `NUXT_PLANNING_PASSWORD`, `PLANNING_PASSWORD`
 * - Session: `NUXT_PLANNING_SESSION_SECRET`, `PLANNING_SESSION_SECRET`
 *
 * Optional: `PLANNING_AUTH_DEBUG=1` logs which keys exist (booleans only).
 */
export function getPlanningSecrets(event: H3Event) {
  const config = useRuntimeConfig(event);
  const fromRcPassword = String(config.planningPassword ?? "").trimEnd();
  const fromRcSecret = String(config.planningSessionSecret ?? "").trimEnd();

  const password =
    fromRcPassword
    || envFirst(["NUXT_PLANNING_PASSWORD", "PLANNING_PASSWORD"]);

  const sessionSecret =
    fromRcSecret
    || envFirst([
      "NUXT_PLANNING_SESSION_SECRET",
      "PLANNING_SESSION_SECRET",
    ]);

  if (process.env.PLANNING_AUTH_DEBUG === "1") {
    const probe = {
      runtimeConfigPassword: Boolean(fromRcPassword),
      runtimeConfigSecret: Boolean(fromRcSecret),
      keys: [
        "NUXT_PLANNING_PASSWORD",
        "PLANNING_PASSWORD",
        "NUXT_PLANNING_SESSION_SECRET",
        "PLANNING_SESSION_SECRET",
      ].map((k) => [k, Boolean(process.env[k]?.length)] as const),
    };
    console.warn("[planning] auth env probe (values redacted):", probe);
  }

  return { password, sessionSecret };
}
