import type { H3Event } from "h3";
import { createError, getCookie } from "h3";
import {
  COOKIE_NAME,
  verifyPlanningSessionToken,
} from "./planningSession";

export function requirePlanningAuth(event: H3Event, secret: string): void {
  const token = getCookie(event, COOKIE_NAME);
  const session = token
    ? verifyPlanningSessionToken(token, secret)
    : null;
  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }
}
