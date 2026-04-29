import { deleteCookie } from "h3";
import { COOKIE_NAME } from "../../utils/planningSession";

export default defineEventHandler((event) => {
  deleteCookie(event, COOKIE_NAME, { path: "/" });
  return { ok: true };
});
