import { FX_FALLBACK_PROVIDER_IDS, FX_PRIMARY_PROVIDER_ID } from "@/config/fx";
import type { FxProvider, FxProviderId } from "./fx.types";
import { FrankfurterFxProvider } from "./providers/frankfurter.provider";
import { YahooFinanceFxProvider } from "./providers/yahoo-finance.provider";

export const fxProvidersById: Record<FxProviderId, FxProvider> = {
  frankfurter: new FrankfurterFxProvider(),
  "yahoo-finance2": new YahooFinanceFxProvider(),
};

export const fxProviderOrder: FxProviderId[] = [
  FX_PRIMARY_PROVIDER_ID,
  ...FX_FALLBACK_PROVIDER_IDS,
];
