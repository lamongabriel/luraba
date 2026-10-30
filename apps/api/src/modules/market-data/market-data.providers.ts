import { env } from "@/config/env";
import { MarketDataRegistry } from "./market-data.registry";
import { MarketDataRouter } from "./market-data.router";
import { AlphaVantageProvider } from "./providers/alpha-vantage.provider";
import { BcbProvider } from "./providers/bcb.provider";
import { BrapiProvider } from "./providers/brapi.provider";
import { MockProvider } from "./providers/mock.provider";
import { TesouroProvider } from "./providers/tesouro.provider";
import { YahooProvider } from "./providers/yahoo.provider";

/**
 * The one place providers are registered, like fx.providers.ts. A new provider is an adapter file
 * plus one line here (and its id in config/market-data.ts).
 */
export const marketDataRegistry = new MarketDataRegistry()
  .register(new YahooProvider())
  .register(new AlphaVantageProvider())
  .register(new BrapiProvider())
  .register(new BcbProvider())
  .register(new TesouroProvider())
  .register(new MockProvider());

marketDataRegistry.applyPremium("alphavantage", env.marketData.alphaVantagePremium);

export const marketDataRouter = new MarketDataRouter(marketDataRegistry, env.marketData.timeoutMs);
