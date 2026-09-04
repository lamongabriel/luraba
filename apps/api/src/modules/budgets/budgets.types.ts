import type { budgetsTable } from '@/db/schemas/budgets.schema';
import { formatMonthKey, parseMonthKey } from '@/shared/lib/date';

export type BudgetRecord = typeof budgetsTable.$inferSelect;

export { formatMonthKey as formatBudgetMonthKey, parseMonthKey as parseBudgetMonthKey };
