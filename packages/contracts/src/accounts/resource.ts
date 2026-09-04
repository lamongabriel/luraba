import { z } from "zod";
import { currencyCodeSchema, moneyBalanceSchema, wireDateTimeSchema } from "../common.js";
import {
  cashAccountDetailsSchema,
  cryptoAccountDetailsSchema,
  investmentAccountDetailsSchema,
  loanAccountDetailsSchema,
  otherAssetAccountDetailsSchema,
  otherLiabilityAccountDetailsSchema,
  propertyAccountDetailsSchema,
  vehicleAccountDetailsSchema,
} from "./profiles.js";
import { accountClassificationSchema, accountSubtypeSchema, accountTypeSchema } from "./values.js";

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
  createdAt: wireDateTimeSchema,
  updatedAt: wireDateTimeSchema,
});
export const accountSummarySchema = accountSchema.extend({
  subtype: accountSubtypeSchema,
  balance: moneyBalanceSchema,
});
export const accountDetailsSchema = accountSchema.extend({
  type: accountTypeSchema.exclude(["credit_card"]),
  balance: moneyBalanceSchema,
  details: z.discriminatedUnion("kind", [
    cashAccountDetailsSchema,
    investmentAccountDetailsSchema,
    cryptoAccountDetailsSchema,
    propertyAccountDetailsSchema,
    vehicleAccountDetailsSchema,
    loanAccountDetailsSchema,
    otherAssetAccountDetailsSchema,
    otherLiabilityAccountDetailsSchema,
  ]),
});

export type Account = z.output<typeof accountSchema>;
export type AccountSummary = z.output<typeof accountSummarySchema>;
export type AccountDetails = z.output<typeof accountDetailsSchema>;
