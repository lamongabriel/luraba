import { z } from 'zod';
import { accountsTable } from '@/db/schemas/accounts.schema';

export type AccountRecord = typeof accountsTable.$inferSelect;

export const accountClassificationSchema = z.enum(['asset', 'liability']);
export const accountTypeSchema = z.enum([
  'depository',
  'loan',
  'credit_card',
  'property',
  'vehicle',
  'other_asset',
  'other_liability',
]);
const createAccountTypeSchema = z.enum(['depository', 'loan', 'property', 'vehicle', 'other_asset', 'other_liability']);
export const currencyCodeSchema = z.string().trim().length(3).transform((value) => value.toUpperCase());

export const ACCOUNT_TYPE_TO_CLASSIFICATION = {
  depository: 'asset',
  loan: 'liability',
  credit_card: 'liability',
  property: 'asset',
  vehicle: 'asset',
  other_asset: 'asset',
  other_liability: 'liability',
} as const;

export const createAccountSchema = z.object({
  name: z.string().min(1).max(255),
  institutionName: z.string().min(1).max(255).optional(),
  institutionDomain: z.string().min(1).max(255).optional(),
  notes: z.string().max(4000).optional(),
  classification: accountClassificationSchema,
  type: createAccountTypeSchema,
  currencyCode: currencyCodeSchema,
}).superRefine((value, ctx) => {
  if (ACCOUNT_TYPE_TO_CLASSIFICATION[value.type] !== value.classification) {
    ctx.addIssue({
      code: 'custom',
      path: ['classification'],
      message: `Account type ${value.type} must use classification ${ACCOUNT_TYPE_TO_CLASSIFICATION[value.type]}`,
    });
  }
});

export const accountIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type AccountClassification = z.infer<typeof accountClassificationSchema>;
export type AccountType = z.infer<typeof accountTypeSchema>;
export type CreateAccountDto = z.infer<typeof createAccountSchema>;

export type AccountResponse = {
  id: string;
  userId: string;
  name: string;
  institutionName: string | null;
  institutionDomain: string | null;
  notes: string | null;
  classification: AccountClassification;
  type: AccountType;
  currencyCode: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AccountListItemResponse = AccountResponse & {
  balance: number;
};

export function mapAccountRecord(account: AccountRecord): AccountResponse {
  return {
    id: account.id,
    userId: account.userId,
    name: account.name,
    institutionName: account.institutionName ?? null,
    institutionDomain: account.institutionDomain ?? null,
    notes: account.notes ?? null,
    classification: account.classification,
    type: account.type,
    currencyCode: account.currencyId,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}
