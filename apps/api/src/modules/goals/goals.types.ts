import type { goalContributionsTable, goalsTable } from "@luraba/db/schemas/goals.schema";

export type GoalRecord = typeof goalsTable.$inferSelect;
export type GoalContributionRecord = typeof goalContributionsTable.$inferSelect;
