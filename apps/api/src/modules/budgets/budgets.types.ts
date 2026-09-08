import { formatMonthKey, parseMonthKey } from "@luraba/domain";
import type { budgetsTable } from "@/db/schemas/budgets.schema";

export type BudgetRecord = typeof budgetsTable.$inferSelect;

export { formatMonthKey as formatBudgetMonthKey, parseMonthKey as parseBudgetMonthKey };
