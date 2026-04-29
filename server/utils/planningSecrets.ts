import type { H3Event } from "h3";

/**
 * Password + session signing secret for `/api/planning/*`.
 *
 * Uses Nitro `runtimeConfig` first; falls back to `process.env` because some hosts
 * expose env on Functions without hydrating `runtimeConfig` as expected.
 *
 * Netlify variables must be named exactly:
 * - `NUXT_PLANNING_PASSWORD`
 * - `NUXT_PLANNING_SESSION_SECRET`
 *
 * `trimEnd()` avoids failed login when the dashboard pasted value has a trailing newline.
 */
export function getPlanningSecrets(event: H3Event) {
  const config = useRuntimeConfig(event);
  const password = String(
    config.planningPassword ?? process.env.NUXT_PLANNING_PASSWORD ?? "",
  ).trimEnd();
  const sessionSecret = String(
    config.planningSessionSecret ?? process.env.NUXT_PLANNING_SESSION_SECRET ?? "",
  ).trimEnd();
  return { password, sessionSecret };
}
