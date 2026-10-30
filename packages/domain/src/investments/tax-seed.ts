import type { TaxRuleRow } from "./tax-rules.js";

/**
 * Default tax data (⚠ every value must be verified against current legislation; see
 * docs/investments/DECISIONS.md). This list is the single source for migration `0043` and tests.
 */
const FROM = "2000-01-01";

const exemptClasses = ["LCI", "LCA", "CRI", "CRA", "DEBENTURE_INCENTIVADA", "POUPANCA"];

const IOF_PERCENT_BY_DAY = [
  96, 93, 90, 86, 83, 80, 76, 73, 70, 66, 63, 60, 56, 53, 50, 46, 43, 40, 36, 33, 30, 26, 23, 20,
  16, 13, 10, 6, 3, 0,
];

export const DEFAULT_TAX_RULES: TaxRuleRow[] = [
  // Brazil: regressive IR on fixed-income gains.
  {
    country: "BR",
    ruleKey: "BR_FI_IR_BRACKET",
    rate: "0.225",
    minDays: 0,
    maxDays: 180,
    effectiveFrom: FROM,
  },
  {
    country: "BR",
    ruleKey: "BR_FI_IR_BRACKET",
    rate: "0.20",
    minDays: 181,
    maxDays: 360,
    effectiveFrom: FROM,
  },
  {
    country: "BR",
    ruleKey: "BR_FI_IR_BRACKET",
    rate: "0.175",
    minDays: 361,
    maxDays: 720,
    effectiveFrom: FROM,
  },
  {
    country: "BR",
    ruleKey: "BR_FI_IR_BRACKET",
    rate: "0.15",
    minDays: 721,
    maxDays: null,
    effectiveFrom: FROM,
  },
  // IOF on the gain for redemptions within 30 days (day 1..30).
  ...IOF_PERCENT_BY_DAY.map(
    (percent, index): TaxRuleRow => ({
      country: "BR",
      ruleKey: "BR_FI_IOF_DAY",
      rate: (percent / 100).toFixed(2),
      minDays: index + 1,
      maxDays: index + 1,
      effectiveFrom: FROM,
    }),
  ),
  // Exempt for individuals (configurable).
  ...exemptClasses.map(
    (assetClass): TaxRuleRow => ({
      country: "BR",
      ruleKey: "BR_FI_IR_EXEMPT",
      assetClass,
      rate: "0",
      effectiveFrom: FROM,
      notes: "Exempt for resident individuals",
    }),
  ),
  // Brazil: variable income, monthly apuração.
  {
    country: "BR",
    ruleKey: "BR_VAR_RATE",
    rate: "0.15",
    params: { bucket: "COMMON_SWING" },
    effectiveFrom: FROM,
    notes: "Stocks, units, ETFs, BDRs",
  },
  {
    country: "BR",
    ruleKey: "BR_VAR_RATE",
    rate: "0.20",
    params: { bucket: "FII_SWING" },
    effectiveFrom: FROM,
    notes: "FIIs and FIAGROs",
  },
  {
    country: "BR",
    ruleKey: "BR_VAR_RATE",
    rate: "0.20",
    params: { bucket: "DAY_TRADE" },
    effectiveFrom: FROM,
  },
  {
    country: "BR",
    ruleKey: "BR_VAR_SALES_EXEMPTION",
    assetClass: "STOCK",
    threshold: "20000",
    effectiveFrom: FROM,
    notes: "Monthly stock sales up to this amount are exempt (not ETF/FII/BDR/day trade)",
  },
  {
    country: "BR",
    ruleKey: "BR_IRRF_DEDO_DURO",
    rate: "0.00005",
    params: { bucket: "COMMON_SWING" },
    effectiveFrom: FROM,
  },
  {
    country: "BR",
    ruleKey: "BR_IRRF_DEDO_DURO",
    rate: "0.00005",
    params: { bucket: "FII_SWING" },
    effectiveFrom: FROM,
  },
  {
    country: "BR",
    ruleKey: "BR_IRRF_DEDO_DURO",
    rate: "0.01",
    params: { bucket: "DAY_TRADE" },
    effectiveFrom: FROM,
  },
  {
    country: "BR",
    ruleKey: "BR_DARF",
    threshold: "10",
    params: { code: "6015" },
    effectiveFrom: FROM,
    notes: "DARF code and minimum payable amount",
  },
  // Brazil: income.
  { country: "BR", ruleKey: "BR_JCP_IRRF", eventType: "JCP", rate: "0.15", effectiveFrom: FROM },
  {
    country: "BR",
    ruleKey: "BR_DIVIDEND_WITHHOLDING",
    eventType: "DIVIDEND",
    rate: "0.10",
    threshold: "50000",
    effectiveFrom: "2026-01-01",
    notes:
      "Lei 15.270/2025: monthly dividends from one company to one individual above the threshold",
  },
  {
    country: "BR",
    ruleKey: "BR_FII_INCOME_EXEMPT",
    eventType: "FII_INCOME",
    rate: "0",
    effectiveFrom: FROM,
    notes: "Exempt when legal conditions are met",
  },
  {
    country: "BR",
    ruleKey: "BR_CUSTODY_FEE",
    assetClass: "TESOURO_DIRETO",
    rate: "0.002",
    threshold: "10000",
    params: { exemptSubtype: "SELIC" },
    effectiveFrom: FROM,
    notes: "B3 custody fee, annual; Tesouro Selic exempt up to the threshold",
  },
  // Brazil: foreign assets.
  {
    country: "BR",
    ruleKey: "BR_OFFSHORE_FLAT",
    rate: "0.15",
    effectiveFrom: "2024-01-01",
    notes: "Lei 14.754/2023: flat annual rate on foreign gains/income; foreign tax credit applies",
  },
  // United States.
  {
    country: "US",
    ruleKey: "US_NRA_DIVIDEND_WITHHOLDING",
    eventType: "DIVIDEND",
    rate: "0.30",
    effectiveFrom: FROM,
    notes: "Non-resident alien statutory withholding (treaty rates may differ)",
  },
  { country: "US", ruleKey: "US_LONG_TERM_DAYS", threshold: "365", effectiveFrom: FROM },
  {
    country: "US",
    ruleKey: "US_CAPITAL_GAINS",
    rate: "0.24",
    params: { term: "SHORT" },
    effectiveFrom: FROM,
    notes: "Placeholder ordinary bracket; configure per taxpayer",
  },
  {
    country: "US",
    ruleKey: "US_CAPITAL_GAINS",
    rate: "0.15",
    params: { term: "LONG" },
    effectiveFrom: FROM,
  },
  { country: "US", ruleKey: "US_QUALIFIED_DIVIDEND", rate: "0.15", effectiveFrom: FROM },
];
