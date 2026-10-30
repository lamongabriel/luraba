import type { BusinessCalendar } from "./calendar.js";
import { addIsoDays, diffIsoDays } from "./calendar.js";
import { Dec, d, ONE, ZERO } from "./decimal.js";
import type { DayCount, Indexer, IsoDate, RateForm } from "./types.js";

/**
 * In-app accrual of fixed-income instruments ("curve value"). Pure functions of the contract
 * terms, the macro index series and the business-day calendar. Market value (what you would get
 * selling today, e.g. the Tesouro buyback price) is a separate provider-fed number.
 *
 * Rates are decimal fractions: 110% of CDI => rate "1.10"; CDI + 2% => spread "0.02";
 * IPCA + 6% => spread "0.06"; 12% fixed => "0.12".
 */

export type FixedIncomeTerms = {
  indexer: Indexer;
  rateForm: RateForm;
  /** Percentage of the indexer (1.10), spread (0.06) or fixed annual rate (0.12). */
  rate: string;
  dayCount: DayCount;
  issueDate: IsoDate;
  maturityDate: IsoDate;
};

export type MonthlyIndex = { value: Dec; estimated: boolean };

/** Macro data an accrual needs. Daily rates and monthly variations are fractions (0.0044 = 0.44%). */
export type IndexData = {
  /** Daily CDI rate for a business day, if published. */
  cdiDaily?: (date: IsoDate) => Dec | undefined;
  /** Annual CDI used to project days with no published rate. */
  cdiAnnualProjection: string;
  selicDaily?: (date: IsoDate) => Dec | undefined;
  selicAnnualProjection?: string;
  /** Monthly IPCA/IGP-M/US CPI keyed by `YYYY-MM`. */
  ipcaMonthly?: (month: string) => Dec | undefined;
  ipcaProjectionMonthly?: string;
  igpmMonthly?: (month: string) => Dec | undefined;
  igpmProjectionMonthly?: string;
  usCpiMonthly?: (month: string) => Dec | undefined;
  usCpiProjectionMonthly?: string;
};

export type Accrual = {
  /** Growth factor from `from` to `to` (1.0 = no accrual). */
  factor: Dec;
  /** True when part of the period used a projection instead of a published index. */
  estimated: boolean;
  businessDays: number;
  calendarDays: number;
};

const BUS_252 = new Dec(252);

export function dailyRateFromAnnual(annual: Dec, basis = 252): Dec {
  return ONE.plus(annual).pow(ONE.div(basis)).minus(1);
}

function firstOfMonth(date: IsoDate): IsoDate {
  return `${date.slice(0, 7)}-01`;
}

function nextMonthStart(date: IsoDate): IsoDate {
  const [year, month] = date.split("-").map(Number) as [number, number];
  return month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
}

/** Monthly-index growth pro-rated by business days (BR) or calendar days. */
function monthlyIndexFactor(
  from: IsoDate,
  to: IsoDate,
  lookup: ((month: string) => Dec | undefined) | undefined,
  projection: string | undefined,
  calendar: BusinessCalendar,
  useBusinessDays: boolean,
): { factor: Dec; estimated: boolean } {
  let factor = ONE;
  let estimated = false;
  let cursor = from;
  while (cursor < to) {
    const monthStart = firstOfMonth(cursor);
    const monthEnd = nextMonthStart(cursor);
    const segmentEnd = to < monthEnd ? to : monthEnd;
    const elapsed = useBusinessDays
      ? calendar.countBusinessDays(cursor, segmentEnd)
      : diffIsoDays(cursor, segmentEnd);
    const total = useBusinessDays
      ? calendar.countBusinessDays(monthStart, monthEnd)
      : diffIsoDays(monthStart, monthEnd);
    const monthKey = cursor.slice(0, 7);
    const published = lookup?.(monthKey);
    const monthly = published ?? d(projection);
    if (!published) {
      estimated = true;
    }
    if (total > 0 && elapsed > 0) {
      factor = factor.mul(ONE.plus(monthly).pow(new Dec(elapsed).div(total)));
    }
    cursor = segmentEnd;
  }
  return { factor, estimated };
}

function dailyRateFactor(
  from: IsoDate,
  to: IsoDate,
  lookup: ((date: IsoDate) => Dec | undefined) | undefined,
  annualProjection: string,
  calendar: BusinessCalendar,
  percentage: Dec,
  spreadDaily: Dec,
): { factor: Dec; estimated: boolean; businessDays: number } {
  let factor = ONE;
  let estimated = false;
  let businessDays = 0;
  const projected = dailyRateFromAnnual(d(annualProjection));
  for (const day of calendar.businessDaysBetween(from, to)) {
    const published = lookup?.(day);
    if (!published) {
      estimated = true;
    }
    const daily = published ?? projected;
    // Both forms collapse to the same expression: pct=1 for CDI+spread, spreadDaily=0 for % of CDI.
    factor = factor.mul(ONE.plus(daily.mul(percentage))).mul(ONE.plus(spreadDaily));
    businessDays++;
  }
  return { factor, estimated, businessDays };
}

/** Growth factor of an instrument between two dates (start accrues, end does not). */
export function accrualFactor(
  terms: FixedIncomeTerms,
  from: IsoDate,
  to: IsoDate,
  data: IndexData,
  calendar: BusinessCalendar,
): Accrual {
  const calendarDays = Math.max(0, diffIsoDays(from, to));
  if (to <= from) {
    return { factor: ONE, estimated: false, businessDays: 0, calendarDays: 0 };
  }
  const rate = d(terms.rate);
  const businessDays = calendar.countBusinessDays(from, to);
  const spreadAnnual = terms.rateForm === "PCT_OF_INDEXER" ? ZERO : rate;
  const percentage = terms.rateForm === "PCT_OF_INDEXER" ? rate : ONE;
  const spreadFactorDaily = ONE.plus(spreadAnnual).pow(ONE.div(BUS_252));

  switch (terms.indexer) {
    case "PREFIXADO": {
      if (terms.dayCount === "BUS_252") {
        return {
          factor: ONE.plus(rate).pow(new Dec(businessDays).div(BUS_252)),
          estimated: false,
          businessDays,
          calendarDays,
        };
      }
      return {
        factor: actualDayFactor(rate, calendarDays, terms.dayCount),
        estimated: false,
        businessDays,
        calendarDays,
      };
    }
    case "CDI":
    case "SELIC": {
      const isCdi = terms.indexer === "CDI";
      const result = dailyRateFactor(
        from,
        to,
        isCdi ? data.cdiDaily : data.selicDaily,
        isCdi ? data.cdiAnnualProjection : (data.selicAnnualProjection ?? data.cdiAnnualProjection),
        calendar,
        percentage,
        spreadFactorDaily.minus(1),
      );
      return { ...result, calendarDays };
    }
    case "IPCA":
    case "IGPM": {
      const isIpca = terms.indexer === "IPCA";
      const index = monthlyIndexFactor(
        from,
        to,
        isIpca ? data.ipcaMonthly : data.igpmMonthly,
        isIpca ? data.ipcaProjectionMonthly : data.igpmProjectionMonthly,
        calendar,
        true,
      );
      const indexed =
        terms.rateForm === "PCT_OF_INDEXER"
          ? ONE.plus(index.factor.minus(1).mul(rate))
          : index.factor;
      return {
        factor: indexed.mul(ONE.plus(spreadAnnual).pow(new Dec(businessDays).div(BUS_252))),
        estimated: index.estimated,
        businessDays,
        calendarDays,
      };
    }
    case "US_FIXED":
      return {
        factor: actualDayFactor(rate, calendarDays, terms.dayCount),
        estimated: false,
        businessDays,
        calendarDays,
      };
    case "US_CPI": {
      const index = monthlyIndexFactor(
        from,
        to,
        data.usCpiMonthly,
        data.usCpiProjectionMonthly,
        calendar,
        false,
      );
      return {
        factor: index.factor.mul(ONE.plus(spreadAnnual).pow(new Dec(calendarDays).div(365))),
        estimated: index.estimated,
        businessDays,
        calendarDays,
      };
    }
  }
}

function actualDayFactor(rate: Dec, calendarDays: number, dayCount: DayCount): Dec {
  if (dayCount === "ACT_360") {
    return ONE.plus(rate.mul(calendarDays).div(360));
  }
  return ONE.plus(rate).pow(new Dec(calendarDays).div(365));
}

export type CurvePoint = { date: IsoDate; value: Dec; estimated: boolean };

/** Curve value of `principal` invested on `startDate`, valued at `asOf`. */
export function curveValue(
  principal: Dec,
  terms: FixedIncomeTerms,
  startDate: IsoDate,
  asOf: IsoDate,
  data: IndexData,
  calendar: BusinessCalendar,
): { value: Dec; accrual: Accrual } {
  const end = asOf < terms.maturityDate ? asOf : terms.maturityDate;
  const accrual = accrualFactor(terms, startDate, end, data, calendar);
  return { value: principal.mul(accrual.factor), accrual };
}

/** Value series (weekly by default) for the accrual chart and the projection to maturity. */
export function curveSeries(
  principal: Dec,
  terms: FixedIncomeTerms,
  startDate: IsoDate,
  until: IsoDate,
  data: IndexData,
  calendar: BusinessCalendar,
  stepDays = 7,
): CurvePoint[] {
  const points: CurvePoint[] = [];
  const end = until < terms.maturityDate ? until : terms.maturityDate;
  for (let date = startDate; date < end; date = addIsoDays(date, stepDays)) {
    const { value, accrual } = curveValue(principal, terms, startDate, date, data, calendar);
    points.push({ date, value, estimated: accrual.estimated });
  }
  const last = curveValue(principal, terms, startDate, end, data, calendar);
  points.push({ date: end, value: last.value, estimated: last.accrual.estimated });
  return points;
}

/** B3 custody fee accrued over business days: `value * annualRate * du/252`. */
export function custodyFee(value: Dec, annualRate: Dec, businessDays: number): Dec {
  return value.mul(annualRate).mul(new Dec(businessDays).div(BUS_252));
}
