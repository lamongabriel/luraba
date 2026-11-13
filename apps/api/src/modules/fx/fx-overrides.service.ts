import type { FxOverride, SetFxOverrideBody } from "@luraba/contracts/fx";
import { formatISODate } from "@luraba/domain";
import type { HouseholdContext } from "@/config/permissions";
import { currenciesRepository } from "@/modules/currencies/currencies.repository";
import { NotFoundError } from "@/shared/errors";
import { toFxFraction } from "./fx.utils";
import { clearFxCombineCache } from "./fx-combine.service";
import { type FxOverrideRecord, fxOverridesRepository } from "./fx-overrides.repository";

function toWire(record: FxOverrideRecord): FxOverride {
  return {
    fromCurrencyCode: record.fromCurrencyId,
    toCurrencyCode: record.toCurrencyId,
    rate: record.rateNumerator / record.rateDenominator,
    updatedAt: formatISODate(record.updatedAt),
  };
}

export async function listOverrides(context: HouseholdContext): Promise<FxOverride[]> {
  return (await fxOverridesRepository.list(context)).map(toWire);
}

/** Pins `1 from = rate to` for the household; replaces an earlier override of the same pair. */
export async function setOverride(
  context: HouseholdContext,
  body: SetFxOverrideBody,
): Promise<FxOverride> {
  const from = body.fromCurrencyCode.toUpperCase();
  const to = body.toCurrencyCode.toUpperCase();
  const precisions = await currenciesRepository.listPrecisions([from, to]);
  if (precisions[from] === undefined || precisions[to] === undefined) {
    throw new NotFoundError("Currency");
  }

  const fraction = toFxFraction(body.rate);
  const existing = await fxOverridesRepository.findByPair(context, from, to);
  const saved = existing
    ? await fxOverridesRepository.update(existing.id, context, fraction)
    : await fxOverridesRepository.create(context, {
        fromCurrencyId: from,
        toCurrencyId: to,
        ...fraction,
      });
  clearFxCombineCache();
  if (!saved) throw new NotFoundError("Exchange rate override");
  return toWire(saved);
}

export async function deleteOverride(
  context: HouseholdContext,
  fromCurrencyCode: string,
  toCurrencyCode: string,
): Promise<void> {
  const existing = await fxOverridesRepository.findByPair(
    context,
    fromCurrencyCode.toUpperCase(),
    toCurrencyCode.toUpperCase(),
  );
  if (!existing) throw new NotFoundError("Exchange rate override");
  await fxOverridesRepository.delete(existing.id, context);
  clearFxCombineCache();
}
