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

export const UpdateAccountRequestParamsSchema = z.object({
  id: z.uuid(),
});

export const UpdateAccountRequestBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  institutionName: z.string().min(1).max(255).nullable().optional(),
  institutionDomain: z.string().min(1).max(255).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
}).refine(
  (value) => Object.keys(value).length > 0,
  'At least one field must be provided',
);

export const UpdateAccountResponseSchema = accountSchema;

export const DeleteAccountRequestParamsSchema = z.object({
  id: z.uuid(),
});

export type Account = z.infer<typeof accountSchema>;
export type AccountDetails = z.infer<typeof accountDetailsSchema>;
export type CreateAccountRequestBody = z.infer<typeof CreateAccountRequestBodySchema>;
export type CreateAccountResponse = z.infer<typeof CreateAccountResponseSchema>;
export type ListAccountsResponse = z.infer<typeof ListAccountsResponseSchema>;
export type GetAccountDetailsRequestParams = z.infer<typeof GetAccountDetailsRequestParamsSchema>;
export type GetAccountDetailsResponse = z.infer<typeof GetAccountDetailsResponseSchema>;
export type UpdateAccountRequestParams = z.infer<typeof UpdateAccountRequestParamsSchema>;
export type UpdateAccountRequestBody = z.infer<typeof UpdateAccountRequestBodySchema>;
export type UpdateAccountResponse = z.infer<typeof UpdateAccountResponseSchema>;
export type DeleteAccountRequestParams = z.infer<typeof DeleteAccountRequestParamsSchema>;
