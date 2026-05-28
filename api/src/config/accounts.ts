import type { AccountClassification, AccountType } from '@/shared/validation/accounts';

export const ACCOUNT_TYPE_TO_CLASSIFICATION = {
  depository: 'asset',
  loan: 'liability',
  credit_card: 'liability',
  property: 'asset',
  vehicle: 'asset',
  other_asset: 'asset',
  other_liability: 'liability',
} as const satisfies Record<AccountType, AccountClassification>;
