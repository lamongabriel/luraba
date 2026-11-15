import { z } from "zod";

export const PIGGY_BANK_YIELD_TYPES = [
  "cdi_percent",
  "selic_percent",
  "ipca_plus",
  "fixed_rate",
  "none",
] as const;
export const PIGGY_BANK_LIQUIDITIES = ["daily", "at_maturity"] as const;
export const PIGGY_BANK_TAX_REGIMES = ["none", "regressive_ir"] as const;
export const PIGGY_BANK_DAY_COUNTS = [252, 365] as const;
export const PIGGY_BANK_MOVEMENT_KINDS = [
  "opening",
  "deposit",
  "withdrawal",
  "transfer_in",
  "transfer_out",
  "interest",
  "adjustment",
] as const;
export const PIGGY_PLAN_MODES = [
  "target_by_date",
  "fixed_monthly",
  "fixed_monthly_for_months",
] as const;

/** Built-in covers, shown when a piggy bank has no uploaded picture. The web maps each to an icon. */
export const PIGGY_BANK_COVER_PRESETS = [
  "savings",
  "travel",
  "home",
  "car",
  "phone",
  "education",
  "emergency",
  "gift",
  "health",
  "land",
  "taxes",
  "investment",
] as const;

export const piggyBankYieldTypeSchema = z.enum(PIGGY_BANK_YIELD_TYPES);
export const piggyBankLiquiditySchema = z.enum(PIGGY_BANK_LIQUIDITIES);
export const piggyBankTaxRegimeSchema = z.enum(PIGGY_BANK_TAX_REGIMES);
export const piggyBankDayCountSchema = z.union([z.literal(252), z.literal(365)]);
export const piggyBankMovementKindSchema = z.enum(PIGGY_BANK_MOVEMENT_KINDS);
export const piggyBankCoverPresetSchema = z.enum(PIGGY_BANK_COVER_PRESETS);
export const piggyPlanModeSchema = z.enum(PIGGY_PLAN_MODES);

export type PiggyBankYieldType = z.output<typeof piggyBankYieldTypeSchema>;
export type PiggyBankMovementKind = z.output<typeof piggyBankMovementKindSchema>;
export type PiggyBankCoverPreset = z.output<typeof piggyBankCoverPresetSchema>;
export type PiggyPlanMode = z.output<typeof piggyPlanModeSchema>;

export const PIGGY_YIELD_TYPE_LABELS: Record<PiggyBankYieldType, string> = {
  cdi_percent: "% of CDI",
  selic_percent: "% of Selic",
  ipca_plus: "IPCA + rate",
  fixed_rate: "Fixed rate (a.a.)",
  none: "No yield",
};

function trimNumber(value: number): string {
  return Number(value.toFixed(4)).toString();
}

/** "102% CDI", "IPCA + 6.5%", "12% a.a.", "No yield": the label shown next to a piggy bank. */
export function formatPiggyYield(config: { type: PiggyBankYieldType; rate: number }): string {
  const rate = trimNumber(config.rate);
  switch (config.type) {
    case "cdi_percent":
      return `${rate}% CDI`;
    case "selic_percent":
      return `${rate}% Selic`;
    case "ipca_plus":
      return `IPCA + ${rate}%`;
    case "fixed_rate":
      return `${rate}% a.a.`;
    default:
      return "No yield";
  }
}

/** The day count a yield type uses unless set otherwise: 252 for CDI and Selic, else 365. */
export function defaultPiggyDayCount(type: PiggyBankYieldType): 252 | 365 {
  return type === "cdi_percent" || type === "selic_percent" ? 252 : 365;
}
