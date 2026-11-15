import { convertMinorUnitsWithRate, normalizeFxRate } from "@luraba/domain";
import { currenciesRepository } from "@/modules/currencies/currencies.repository";
import { fxService } from "@/modules/fx/fx.service";
import { NotFoundError, ValidationError } from "@/shared/errors";

/** The rate a contribution is converted with, at full precision, and where it came from. */
export type ContributionRate = {
  /** Goal units per 1 unit of the original currency, up to 14 decimals. Never rounded. */
  rate: string;
  /** A provider id, or `manual` when the rate was given by hand. */
  source: string;
  /** The market day the rate is from (`manual` rates carry the contribution day). */
  rateDate: Date;
};

export const MANUAL_RATE_SOURCE = "manual";

/**
 * The rate for converting `from` into `to` on `day`: the explicit `fxRate` when given (kept exactly as
 * typed, up to 14 decimals), else the provider's historical rate for that day (the closest previous
 * business day within a week). Never today's rate for a past day; no rate is an error asking for one.
 */
export async function resolveContributionRate(input: {
  from: string;
  to: string;
  day: Date;
  fxRate?: number | string | null | undefined;
}): Promise<ContributionRate> {
  if (input.fxRate !== undefined && input.fxRate !== null) {
    try {
      return {
        rate: normalizeFxRate(input.fxRate),
        source: MANUAL_RATE_SOURCE,
        rateDate: input.day,
      };
    } catch {
      throw new ValidationError("fxRate must be a positive number");
    }
  }
  const found = await fxService.getDayRate({
    fromCurrencyCode: input.from,
    toCurrencyCode: input.to,
    date: input.day,
  });
  return { rate: found.rate, source: found.source, rateDate: found.rateDate };
}

/** Minor units of `from` converted into minor units of `to`: the rate is exact, only the result is rounded (half up). */
export async function convertWithContributionRate(input: {
  amount: number;
  rate: string;
  from: string;
  to: string;
}): Promise<number> {
  const precisions = await currenciesRepository.listPrecisions([input.from, input.to]);
  const sourcePrecision = precisions[input.from];
  const targetPrecision = precisions[input.to];
  if (sourcePrecision === undefined || targetPrecision === undefined) {
    throw new NotFoundError("Currency");
  }
  return convertMinorUnitsWithRate(input.amount, input.rate, sourcePrecision, targetPrecision);
}
