import type { AccountClassification } from '@/shared/validation/accounts';

export const SYSTEM_LEDGER_CLASSIFICATIONS = {
  expense: 'liability',
  income: 'asset',
  adjustment: 'liability',
  offshoreTransfer: 'liability',
} as const satisfies Record<
  'expense' | 'income' | 'adjustment' | 'offshoreTransfer',
  AccountClassification
>;
