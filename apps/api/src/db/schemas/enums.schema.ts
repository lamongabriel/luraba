import {
  CREDIT_EXPENSE_TIMING_VALUES,
  CREDIT_INSTALLMENT_BUDGET_MODE_VALUES,
  DATE_FORMAT_VALUES,
  LANGUAGE_VALUES,
  PREFERRED_PERIOD_VALUES,
  PREFERRED_THEME_VALUES,
} from "@luraba/contracts/preferences";
import { pgEnum } from "drizzle-orm/pg-core";

// ─── User Preference Enums ───────────────────────────────────────────────
export const preferredLanguageEnum = pgEnum("preferred_language", LANGUAGE_VALUES);
export const preferredCurrencyEnum = pgEnum("preferred_currency", ["BRL", "USD", "EUR"]);
export const preferredDateFormatEnum = pgEnum("preferred_date_format", DATE_FORMAT_VALUES);
export const defaultPeriodEnum = pgEnum("default_period", PREFERRED_PERIOD_VALUES);
export const defaultAccountOrderEnum = pgEnum("default_account_order", [
  "name_asc",
  "name_desc",
  "newest",
  "oldest",
]);
export const themePreferenceEnum = pgEnum("theme_preference", PREFERRED_THEME_VALUES);

// ─── Account & Ledger Enums ──────────────────────────────────────────────
export const accountClassificationEnum = pgEnum("account_classification", ["asset", "liability"]);
export const accountTypeEnum = pgEnum("account_type", [
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
export const cashAccountSubtypeEnum = pgEnum("cash_account_subtype", [
  "checking",
  "savings",
  "cash",
  "money_market",
  "certificate_of_deposit",
  "prepaid",
  "other",
]);
export const investmentAccountSubtypeEnum = pgEnum("investment_account_subtype", [
  "brokerage",
  "retirement",
  "pension",
  "education",
  "employee_stock",
  "other",
]);
export const cryptoAccountSubtypeEnum = pgEnum("crypto_account_subtype", [
  "exchange",
  "wallet",
  "custody",
  "staking",
  "other",
]);
export const propertyAccountSubtypeEnum = pgEnum("property_account_subtype", [
  "house",
  "apartment",
  "condominium",
  "land",
  "commercial",
  "storage",
  "parking",
  "other",
]);
export const propertyAreaUnitEnum = pgEnum("property_area_unit", ["sqm", "sqft"]);
export const vehicleAccountSubtypeEnum = pgEnum("vehicle_account_subtype", [
  "car",
  "motorcycle",
  "truck",
  "van",
  "recreational_vehicle",
  "boat",
  "aircraft",
  "other",
]);
export const vehicleMileageUnitEnum = pgEnum("vehicle_mileage_unit", ["km", "mi"]);
export const loanAccountSubtypeEnum = pgEnum("loan_account_subtype", [
  "mortgage",
  "auto",
  "student",
  "personal",
  "business",
  "line_of_credit",
  "other",
]);
export const loanInterestRateTypeEnum = pgEnum("loan_interest_rate_type", ["fixed", "variable"]);
export const loanPaymentFrequencyEnum = pgEnum("loan_payment_frequency", [
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "annually",
  "other",
]);
export const otherAssetSubtypeEnum = pgEnum("other_asset_subtype", [
  "collectible",
  "precious_metal",
  "business_ownership",
  "receivable",
  "other",
]);
export const otherLiabilitySubtypeEnum = pgEnum("other_liability_subtype", [
  "tax",
  "medical",
  "payable",
  "legal",
  "other",
]);
export const ledgerClassificationEnum = pgEnum("ledger_classification", ["asset", "liability"]);
export const ledgerAccountTypeEnum = ledgerClassificationEnum;
export const ledgerOwnerTypeEnum = pgEnum("ledger_owner_type", ["account", "system"]);
export const householdRoleEnum = pgEnum("household_role", ["owner", "admin", "member", "viewer"]);
export const householdInviteStatusEnum = pgEnum("household_invite_status", [
  "pending",
  "accepted",
  "rejected",
  "canceled",
]);

// ─── Transaction & Category Enums ────────────────────────────────────────
export const transactionTypeEnum = pgEnum("transaction_type", [
  "expense",
  "income",
  "transfer",
  "adjustment",
]);
export const categoryTypeEnum = pgEnum("category_type", ["expense", "income"]);

export const creditExpenseTimingEnum = pgEnum(
  "credit_expense_timing",
  CREDIT_EXPENSE_TIMING_VALUES,
);
export const creditInstallmentBudgetModeEnum = pgEnum(
  "credit_installment_budget_mode",
  CREDIT_INSTALLMENT_BUDGET_MODE_VALUES,
);
export const creditCardProductTypeEnum = pgEnum("credit_card_product_type", ["credit"]);
export const creditCardCycleStatusEnum = pgEnum("credit_card_cycle_status", [
  "open",
  "closed",
  "paid",
]);
