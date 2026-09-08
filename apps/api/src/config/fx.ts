export const FX_PRIMARY_PROVIDER_ID = "frankfurter";
export const FX_FALLBACK_PROVIDER_IDS = ["yahoo-finance2"] as const;
export const FX_PROVIDER_IDS = [FX_PRIMARY_PROVIDER_ID, ...FX_FALLBACK_PROVIDER_IDS] as const;

export const FRANKFURTER_API_URL = "https://api.frankfurter.dev/v2";

export const FX_PROVIDER_FAILURE_MESSAGES = {
  unavailable: "Exchange-rate providers are currently unavailable",
  missingRate: "Exchange rate not available for the requested currencies and date",
} as const;
