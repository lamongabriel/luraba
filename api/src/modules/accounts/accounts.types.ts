import { z } from 'zod';
import { accountsTable } from '@/db/schemas/accounts.schema';
import {
  accountClassificationSchema,
  accountTypeSchema,
  type AccountClassification,
  type AccountType,
} from '@/shared/validation/accounts';

export { accountClassificationSchema, accountTypeSchema };
export type { AccountClassification, AccountType };

export type AccountRecord = typeof accountsTable.$inferSelect;

const createAccountTypeSchema = accountTypeSchema.exclude(['credit_card']);
export const currencyCodeSchema = z.string().trim().length(3).transform((value) => value.toUpperCase());
const dateTimeSchema = z.iso.datetime();

export const accountSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  institutionName: z.string().nullable(),
  institutionDomain: z.string().nullable(),
  notes: z.string().nullable(),
  classification: accountClassificationSchema,
  type: accountTypeSchema,
  currencyCode: currencyCodeSchema,
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});

export const accountDetailsSchema = accountSchema.extend({
  balance: z.number().int(),
});

export const CreateAccountRequestBodySchema = z.object({
  name: z.string().min(1).max(255),
  institutionName: z.string().min(1).max(255).optional(),
  institutionDomain: z.string().min(1).max(255).optional(),
  notes: z.string().max(4000).optional(),
  type: createAccountTypeSchema,
  currencyCode: currencyCodeSchema,
});

export const CreateAccountResponseSchema = accountSchema;

export const ListAccountsResponseSchema = z.array(accountDetailsSchema);

export const GetAccountDetailsRequestParamsSchema = z.object({
  id: z.uuid(),
});

export const GetAccountDetailsResponseSchema = accountDetailsSchema;

export type Account = z.infer<typeof accountSchema>;
export type AccountDetails = z.infer<typeof accountDetailsSchema>;
export type CreateAccountRequestBody = z.infer<typeof CreateAccountRequestBodySchema>;
export type CreateAccountResponse = z.infer<typeof CreateAccountResponseSchema>;
export type ListAccountsResponse = z.infer<typeof ListAccountsResponseSchema>;
export type GetAccountDetailsRequestParams = z.infer<typeof GetAccountDetailsRequestParamsSchema>;
export type GetAccountDetailsResponse = z.infer<typeof GetAccountDetailsResponseSchema>;
