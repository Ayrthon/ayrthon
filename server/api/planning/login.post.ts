import { createError, getRequestURL, readBody, setCookie } from "h3";
import {
  COOKIE_NAME,
  signPlanningSession,
  verifyPlanningPassword,
} from "../../utils/planningSession";
import { getPlanningSecrets } from "../../utils/planningSecrets";

export default defineEventHandler(async (event) => {
  const { password, sessionSecret: secret } = getPlanningSecrets(event);

  if (!secret || secret.length < 16) {
    throw createError({
      statusCode: 503,
      statusMessage:
        "Planning login is not configured (set NUXT_PLANNING_SESSION_SECRET on Netlify).",
    });
  }
  if (!password) {
    throw createError({
      statusCode: 503,
      statusMessage:
        "Planning login is not configured (set NUXT_PLANNING_PASSWORD on Netlify).",
    });
  }

  const body = await readBody(event).catch(() => ({})) as {
    password?: unknown;
  };
  const pw = typeof body?.password === "string" ? body.password : "";
  if (!verifyPlanningPassword(pw, password)) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid password",
    });
  }

  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
  const token = signPlanningSession({ v: 1, exp }, secret);
  const secureCookie = getRequestURL(event).protocol === "https:";

  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    secure: secureCookie,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return { ok: true };
});
