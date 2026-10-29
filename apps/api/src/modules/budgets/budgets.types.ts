import type { budgetsTable } from "@luraba/db/schemas/budgets.schema";
import { formatMonthKey, parseMonthKey } from "@luraba/domain";

export type BudgetRecord = typeof budgetsTable.$inferSelect;

export { formatMonthKey as formatBudgetMonthKey, parseMonthKey as parseBudgetMonthKey };
