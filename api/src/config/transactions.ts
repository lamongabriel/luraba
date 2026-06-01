import type { AccountClassification } from '@/shared/validation/accounts';

export const SYSTEM_LEDGER_CLASSIFICATIONS = {
  expense: 'liability',
  income: 'asset',
  adjustment: 'liability',
} as const satisfies Record<'expense' | 'income' | 'adjustment', AccountClassification>;
