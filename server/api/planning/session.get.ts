import { getCookie } from "h3";
import {
  COOKIE_NAME,
  verifyPlanningSessionToken,
} from "../../utils/planningSession";

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event);
  const secret = config.planningSessionSecret as string;
  const token = getCookie(event, COOKIE_NAME);
  const ok = !!(
    secret
    && token
    && verifyPlanningSessionToken(token, secret)
  );
  return { ok };
});
