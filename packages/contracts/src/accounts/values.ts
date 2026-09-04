import { z } from "zod";

export const accountClassificationSchema = z.enum(["asset", "liability"]);
export const accountTypeSchema = z.enum([
  "cash",
  "investment",
  "crypto",
  "loan",
  "credit_card",
  "property",
  "vehicle",
  "other_asset",
  "other_liability",
]);
export const cashAccountSubtypeSchema = z.enum([
  "checking",
  "savings",
  "cash",
  "money_market",
  "certificate_of_deposit",
  "prepaid",
  "other",
]);
export const investmentAccountSubtypeSchema = z.enum([
  "brokerage",
  "retirement",
  "pension",
  "education",
  "employee_stock",
  "other",
]);
export const cryptoAccountSubtypeSchema = z.enum([
  "exchange",
  "wallet",
  "custody",
  "staking",
  "other",
]);
export const propertyAccountSubtypeSchema = z.enum([
  "house",
  "apartment",
  "condominium",
  "land",
  "commercial",
  "storage",
  "parking",
  "other",
]);
export const propertyAreaUnitSchema = z.enum(["sqm", "sqft"]);
export const vehicleAccountSubtypeSchema = z.enum([
  "car",
  "motorcycle",
  "truck",
  "van",
  "recreational_vehicle",
  "boat",
  "aircraft",
  "other",
]);
export const vehicleMileageUnitSchema = z.enum(["km", "mi"]);
export const loanAccountSubtypeSchema = z.enum([
  "mortgage",
  "auto",
  "student",
  "personal",
  "business",
  "line_of_credit",
  "other",
]);
export const loanInterestRateTypeSchema = z.enum(["fixed", "variable"]);
export const loanPaymentFrequencySchema = z.enum([
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "annually",
  "other",
]);
export const otherAssetSubtypeSchema = z.enum([
  "collectible",
  "precious_metal",
  "business_ownership",
  "receivable",
  "other",
]);
export const otherLiabilitySubtypeSchema = z.enum(["tax", "medical", "payable", "legal", "other"]);
export const accountSubtypeSchema = z.union([
  cashAccountSubtypeSchema,
  investmentAccountSubtypeSchema,
  cryptoAccountSubtypeSchema,
  propertyAccountSubtypeSchema,
  vehicleAccountSubtypeSchema,
  loanAccountSubtypeSchema,
  otherAssetSubtypeSchema,
  otherLiabilitySubtypeSchema,
  z.literal("credit"),
]);

export type AccountClassification = z.output<typeof accountClassificationSchema>;
export type AccountType = z.output<typeof accountTypeSchema>;
export type AccountSubtype = z.output<typeof accountSubtypeSchema>;
export const ACCOUNT_TYPES = accountTypeSchema.options;
export const ACCOUNT_CLASSIFICATIONS = accountClassificationSchema.options;
export type CreatableNonCardAccountType = Exclude<AccountType, "credit_card">;
