import type { H3Event } from "h3";

/**
 * Read env without referencing `process.env.FOO` as a static identifier so Rollup/esbuild
 * does not replace it at build time with `""` when secrets exist only at Lambda runtime.
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
 * Prefer Nitro `runtimeConfig`, then dynamic `process.env` lookups (see `envFirst`).
 *
 * Supported Netlify keys (use `NUXT_*` first; duplicates without prefix help typos):
 * - Password: `NUXT_PLANNING_PASSWORD`, `PLANNING_PASSWORD`
 * - Session: `NUXT_PLANNING_SESSION_SECRET`, `PLANNING_SESSION_SECRET`
 *
 * Optional: set `PLANNING_AUTH_DEBUG=1` (no secret values logged) to print which keys exist.
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
