import { createError, readBody } from "h3";
import {
  parsePlanningStoredState,
  savePlanningState,
} from "../../utils/planningStorage";
import { getPlanningSecrets } from "../../utils/planningSecrets";
import { requirePlanningAuth } from "../../utils/requirePlanningAuth";

export default defineEventHandler(async (event) => {
  const { sessionSecret: secret } = getPlanningSecrets(event);
  requirePlanningAuth(event, secret);

  const body = await readBody(event).catch(() => null);
  const parsed = parsePlanningStoredState(body);
  if (!parsed) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid planning payload",
    });
  }
  await savePlanningState(event, parsed);
  return { ok: true };
});
