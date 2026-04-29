import { createError, readBody, setCookie } from "h3";
import {
  COOKIE_NAME,
  signPlanningSession,
  verifyPlanningPassword,
} from "../../utils/planningSession";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const password = config.planningPassword as string;
  const secret = config.planningSessionSecret as string;

  if (!secret || secret.length < 16) {
    throw createError({
      statusCode: 503,
      statusMessage:
        "Planning login is not configured (set PLANNING_SESSION_SECRET).",
    });
  }
  if (!password) {
    throw createError({
      statusCode: 503,
      statusMessage:
        "Planning login is not configured (set PLANNING_PASSWORD).",
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
  const isProd = process.env.NODE_ENV === "production";

  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return { ok: true };
});
