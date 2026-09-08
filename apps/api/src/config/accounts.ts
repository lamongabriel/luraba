import type { AccountClassification, AccountType } from "@/shared/validation/accounts";

export const ACCOUNT_TYPE_TO_CLASSIFICATION = {
  cash: "asset",
  investment: "asset",
  crypto: "asset",
  loan: "liability",
  credit_card: "liability",
  property: "asset",
  vehicle: "asset",
  other_asset: "asset",
  other_liability: "liability",
} as const satisfies Record<AccountType, AccountClassification>;
