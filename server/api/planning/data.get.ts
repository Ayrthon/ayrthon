import type { StoredState } from "~~/shared/planning-state";
import { loadPlanningState } from "../../utils/planningStorage";
import { requirePlanningAuth } from "../../utils/requirePlanningAuth";

const emptyState = (): StoredState => ({
  comfortTarget: 48,
  entries: [],
});

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const secret = config.planningSessionSecret as string;
  requirePlanningAuth(event, secret);

  const state = await loadPlanningState();
  return state ?? emptyState();
});
