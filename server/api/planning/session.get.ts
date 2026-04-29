import { getCookie } from "h3";
import {
  COOKIE_NAME,
  verifyPlanningSessionToken,
} from "../../utils/planningSession";
import { getPlanningSecrets } from "../../utils/planningSecrets";

export default defineEventHandler((event) => {
  const { sessionSecret: secret } = getPlanningSecrets(event);
  const token = getCookie(event, COOKIE_NAME);
  const ok = !!(
    secret
    && token
    && verifyPlanningSessionToken(token, secret)
  );
  return { ok };
});
