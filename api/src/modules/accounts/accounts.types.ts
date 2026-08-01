import { z } from 'zod';
import type { accountsTable } from '@/db/schemas/accounts.schema';
import { TransactionFeedRowSchema } from '@/modules/transactions/transactions.types';
import {
  type AccountClassification,
  type AccountSubtype,
  type AccountType,
  accountClassificationSchema,
  accountSubtypeSchema,
  accountTypeSchema,
} from '@/shared/validation/accounts';
import { institutionDomainInputSchema } from '@/shared/validation/domain';
import { moneyBalanceSchema } from '@/shared/validation/money';
import {
  type AccountProfile,
  accountProfileSchema,
  createAccountProfileSchema,
  updateAccountProfileSchema,
} from './accounts.profiles';

export type { AccountClassification, AccountProfile, AccountSubtype, AccountType };
export { accountClassificationSchema, accountSubtypeSchema, accountTypeSchema };

export type AccountRecord = typeof accountsTable.$inferSelect;

export const currencyCodeSchema = z
  .string()
  .trim()
  .length(3)
  .transform((value) => value.toUpperCase());

export const accountSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  institutionName: z.string().nullable(),
  institutionDomain: z.string().nullable(),
  institutionLogoUrl: z.string().nullable(),
  notes: z.string().nullable(),
  classification: accountClassificationSchema,
  type: accountTypeSchema,
  currencyCode: currencyCodeSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const accountSummarySchema = accountSchema.extend({
  subtype: accountSubtypeSchema,
  balance: moneyBalanceSchema,
});

export const accountDetailsSchema = accountSchema.extend({
  balance: moneyBalanceSchema,
  details: accountProfileSchema,
});

const createAccountCommonSchema = z.strictObject({
  name: z.string().trim().min(1).max(255),
  institutionName: z.string().trim().min(1).max(255).optional(),
  institutionDomain: institutionDomainInputSchema.optional(),
  notes: z.string().trim().max(4000).optional(),
  currencyCode: currencyCodeSchema,
  openingBalance: moneyBalanceSchema.optional(),
  balanceAsOfDate: z.iso.date().optional(),
});

export const CreateAccountRequestBodySchema = createAccountCommonSchema
  .extend({
    type: accountTypeSchema.exclude(['credit_card']),
    details: createAccountProfileSchema,
  })
  .superRefine((value, ctx) => {
    if (value.type !== value.details.kind) {
      ctx.addIssue({
        code: 'custom',
        path: ['details', 'kind'],
        message: 'Account details must match the selected account type',
      });
    }
  });

export const CreateAccountResponseSchema = accountDetailsSchema;
export const ListAccountsResponseSchema = z.array(accountSummarySchema);

export const GetAccountDetailsRequestParamsSchema = z.object({ id: z.uuid() });
export const GetAccountDetailsResponseSchema = accountDetailsSchema;

export const ListAccountTransactionsRequestParamsSchema = z.object({ id: z.uuid() });
export const ListAccountTransactionsResponseSchema = z.array(TransactionFeedRowSchema);

export const UpdateAccountRequestParamsSchema = z.object({ id: z.uuid() });
export const UpdateAccountRequestBodySchema = z
  .strictObject({
    name: z.string().trim().min(1).max(255).optional(),
    institutionName: z.string().trim().min(1).max(255).nullable().optional(),
    institutionDomain: institutionDomainInputSchema.nullable().optional(),
    notes: z.string().trim().max(4000).nullable().optional(),
    details: updateAccountProfileSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided');

export const UpdateAccountResponseSchema = accountDetailsSchema;
export const DeleteAccountRequestParamsSchema = z.object({ id: z.uuid() });

export type Account = z.infer<typeof accountSchema>;
export type AccountSummary = z.infer<typeof accountSummarySchema>;
export type AccountDetails = z.infer<typeof accountDetailsSchema>;
export type CreateAccountRequestBody = z.infer<typeof CreateAccountRequestBodySchema>;
export type CreateAccountResponse = z.infer<typeof CreateAccountResponseSchema>;
export type ListAccountsResponse = z.infer<typeof ListAccountsResponseSchema>;
export type GetAccountDetailsRequestParams = z.infer<typeof GetAccountDetailsRequestParamsSchema>;
export type GetAccountDetailsResponse = z.infer<typeof GetAccountDetailsResponseSchema>;
export type ListAccountTransactionsRequestParams = z.infer<
  typeof ListAccountTransactionsRequestParamsSchema
>;
export type ListAccountTransactionsResponse = z.infer<typeof ListAccountTransactionsResponseSchema>;
export type UpdateAccountRequestParams = z.infer<typeof UpdateAccountRequestParamsSchema>;
export type UpdateAccountRequestBody = z.infer<typeof UpdateAccountRequestBodySchema>;
export type UpdateAccountResponse = z.infer<typeof UpdateAccountResponseSchema>;
export type DeleteAccountRequestParams = z.infer<typeof DeleteAccountRequestParamsSchema>;
