import { z } from "zod";
import {
  currencyCodeSchema,
  idParamsSchema,
  institutionDomainInputSchema,
  moneyBalanceSchema,
} from "../common.js";
import {
  booleanQuerySchema,
  commaSeparatedArraySchema,
  createListQuerySchema,
  temporalQuerySchema,
  validateRange,
} from "../list.js";
import { createAccountProfileSchema, updateAccountProfileSchema } from "./profiles.js";
import { accountClassificationSchema, accountSubtypeSchema, accountTypeSchema } from "./values.js";

export const listAccountsQuerySchema = createListQuerySchema(
  {
    types: commaSeparatedArraySchema(accountTypeSchema),
    subtypes: commaSeparatedArraySchema(accountSubtypeSchema),
    classifications: commaSeparatedArraySchema(accountClassificationSchema),
    currencyCodes: commaSeparatedArraySchema(currencyCodeSchema),
    balanceMin: z.coerce.number().int().optional(),
    balanceMax: z.coerce.number().int().optional(),
    hasInstitution: booleanQuerySchema.optional(),
    createdAtFrom: temporalQuerySchema.optional(),
    createdAtTo: temporalQuerySchema.optional(),
    updatedAtFrom: temporalQuerySchema.optional(),
    updatedAtTo: temporalQuerySchema.optional(),
  },
  [
    "name",
    "institutionName",
    "type",
    "subtype",
    "classification",
    "currencyCode",
    "balance",
    "createdAt",
    "updatedAt",
  ],
).superRefine((query, ctx) => {
  validateRange(query, ctx, "balanceMin", "balanceMax");
  validateRange(query, ctx, "createdAtFrom", "createdAtTo");
  validateRange(query, ctx, "updatedAtFrom", "updatedAtTo");
});
const common = {
  name: z.string().trim().min(1).max(255),
  institutionName: z.string().trim().min(1).max(255).optional(),
  institutionDomain: institutionDomainInputSchema.optional(),
  notes: z.string().trim().max(4000).optional(),
  currencyCode: currencyCodeSchema,
  openingBalance: moneyBalanceSchema.optional(),
  balanceAsOfDate: z.iso.date().optional(),
};
export const createAccountInputSchema = z
  .strictObject({
    ...common,
    type: accountTypeSchema.exclude(["credit_card"]),
    details: createAccountProfileSchema,
  })
  .superRefine((value, ctx) => {
    if (value.type !== value.details.kind)
      ctx.addIssue({
        code: "custom",
        path: ["details", "kind"],
        message: "Account details must match the selected account type",
      });
  });
export const updateAccountInputSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(255).optional(),
    institutionName: z.string().trim().min(1).max(255).nullable().optional(),
    institutionDomain: institutionDomainInputSchema.nullable().optional(),
    notes: z.string().trim().max(4000).nullable().optional(),
    details: updateAccountProfileSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");
export const accountIdParamsSchema = idParamsSchema;

export type ListAccountsQuery = z.input<typeof listAccountsQuerySchema>;
export type CreateAccountInput = z.input<typeof createAccountInputSchema>;
export type UpdateAccountInput = z.input<typeof updateAccountInputSchema>;
