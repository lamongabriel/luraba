import type { CombinedAmountWire, CombinedFx, CombinedFxRate } from "@luraba/contracts/fx";
import { type CombineFxContext, combineMinorUnits, formatISODate, now } from "@luraba/domain";
import type { HouseholdContext } from "@/config/permissions";
import { currenciesRepository } from "@/modules/currencies/currencies.repository";
import { householdsRepository } from "@/modules/households/households.repository";
import { NotFoundError } from "@/shared/errors";
import { fxService } from "./fx.service";
import { fxOverridesRepository } from "./fx-overrides.repository";

/** How long a resolved (or failed) rate is reused, so a request never waits on the provider twice. */
const RATE_TTL_MS = 30 * 60 * 1000;
const MISSING_TTL_MS = 5 * 60 * 1000;

type ResolvedRate = Pick<
  CombinedFxRate,
  "rateNumerator" | "rateDenominator" | "rateDate" | "source"
>;
const marketRateCache = new Map<string, { at: number; rate: ResolvedRate | null }>();

/** Test hook: forgets cached market rates. */
export function clearFxCombineCache(): void {
  marketRateCache.clear();
}

async function resolveMarketRate(from: string, to: string): Promise<ResolvedRate | null> {
  const key = `${from}:${to}`;
  const cached = marketRateCache.get(key);
  const nowMs = Date.now();
  if (cached && nowMs - cached.at < (cached.rate ? RATE_TTL_MS : MISSING_TTL_MS)) {
    return cached.rate;
  }

  let rate: ResolvedRate | null = null;
  try {
    const resolved = await fxService.getRate({
      fromCurrencyCode: from,
      toCurrencyCode: to,
      date: now(),
    });
    rate = {
      rateNumerator: resolved.rateNumerator,
      rateDenominator: resolved.rateDenominator,
      rateDate: formatISODate(resolved.rateDate),
      source: resolved.provider,
    };
  } catch {
    rate = null; // no provider and nothing stored: the caller shows the per-currency numbers
  }
  marketRateCache.set(key, { at: nowMs, rate });
  return rate;
}

/** The household's base currency for combined totals: its default currency. */
export async function getBaseCurrencyCode(context: HouseholdContext): Promise<string> {
  const household = await householdsRepository.findHouseholdById(context.householdId);
  if (!household) throw new NotFoundError("Household");
  return household.defaultCurrencyId;
}

/**
 * The rates that turn each of `currencyCodes` into the household base currency: the household's
 * manual override when there is one (either direction), otherwise the latest market rate. A currency
 * with no rate is listed in `missingCurrencies` and is never guessed.
 */
export async function buildCombinedFx(
  context: HouseholdContext,
  currencyCodes: readonly string[],
): Promise<CombinedFx> {
  const baseCurrencyCode = await getBaseCurrencyCode(context);
  const wanted = [...new Set(currencyCodes.map((code) => code.toUpperCase()))]
    .filter((code) => code !== baseCurrencyCode)
    .sort();
  const [precisions, overrides] = await Promise.all([
    currenciesRepository.listPrecisions([baseCurrencyCode, ...wanted]),
    fxOverridesRepository.list(context),
  ]);
  const basePrecision = precisions[baseCurrencyCode];
  if (basePrecision === undefined) throw new NotFoundError("Currency");

  const rates: CombinedFxRate[] = [];
  const missingCurrencies: string[] = [];

  for (const code of wanted) {
    const sourcePrecision = precisions[code];
    if (sourcePrecision === undefined) {
      missingCurrencies.push(code);
      continue;
    }

    let resolved: ResolvedRate | null = null;
    const direct = overrides.find(
      (item) => item.fromCurrencyId === code && item.toCurrencyId === baseCurrencyCode,
    );
    const inverse = overrides.find(
      (item) => item.fromCurrencyId === baseCurrencyCode && item.toCurrencyId === code,
    );
    if (direct) {
      resolved = {
        rateNumerator: direct.rateNumerator,
        rateDenominator: direct.rateDenominator,
        rateDate: formatISODate(direct.updatedAt),
        source: "manual",
      };
    } else if (inverse) {
      resolved = {
        rateNumerator: inverse.rateDenominator,
        rateDenominator: inverse.rateNumerator,
        rateDate: formatISODate(inverse.updatedAt),
        source: "manual",
      };
    } else {
      resolved = await resolveMarketRate(code, baseCurrencyCode);
    }

    if (!resolved) {
      missingCurrencies.push(code);
      continue;
    }
    rates.push({
      currencyCode: code,
      precision: sourcePrecision,
      rate: resolved.rateNumerator / resolved.rateDenominator,
      ...resolved,
    });
  }

  const asOf = rates.map((rate) => rate.rateDate).sort()[0] ?? null;
  return { baseCurrencyCode, basePrecision, asOf, rates, missingCurrencies };
}

/** Converts `byCurrency` with the context from {@link buildCombinedFx}; rounds once at the end. */
export function combineAmounts(
  fx: CombinedFx,
  byCurrency: Readonly<Record<string, number>>,
): CombinedAmountWire {
  return combineMinorUnits(byCurrency, fx satisfies CombineFxContext);
}

/** Sums native amounts per currency code. */
export function groupByCurrency<T>(
  items: readonly T[],
  pick: (item: T) => { currencyCode: string; amount: number },
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const item of items) {
    const { currencyCode, amount } = pick(item);
    totals[currencyCode] = (totals[currencyCode] ?? 0) + amount;
  }
  return totals;
}
