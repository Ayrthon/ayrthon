import type { StoredState } from "~~/shared/planning-state";
import { loadPlanningState } from "../../utils/planningStorage";
import { getPlanningSecrets } from "../../utils/planningSecrets";
import { requirePlanningAuth } from "../../utils/requirePlanningAuth";

const emptyState = (): StoredState => ({
  comfortTarget: 48,
  entries: [],
});

export default defineEventHandler(async (event) => {
  const { sessionSecret: secret } = getPlanningSecrets(event);
  requirePlanningAuth(event, secret);

  const state = await loadPlanningState();
  return state ?? emptyState();
});
