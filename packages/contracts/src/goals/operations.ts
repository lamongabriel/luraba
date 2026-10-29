import type { EndpointResult } from "../api.js";
import type { goalsEndpoints } from "./endpoints.js";

export type ListGoalsResult = EndpointResult<typeof goalsEndpoints.list>;
export type GetGoalResult = EndpointResult<typeof goalsEndpoints.get>;
export type GoalContributionResult = EndpointResult<typeof goalsEndpoints.addContribution>;
