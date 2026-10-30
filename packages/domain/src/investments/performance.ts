import { diffIsoDays } from "./calendar.js";
import { Dec, ONE, ZERO } from "./decimal.js";
import type { IsoDate } from "./types.js";

export type CashFlow = { date: IsoDate; amount: Dec };

/**
 * XIRR / money-weighted return: the annual rate r solving sum(amount_i / (1+r)^(days_i/365)) = 0.
 * Investor outflows (contributions) are negative, inflows (withdrawals, final value) positive.
 * Newton's method with a bisection fallback; returns null when no sign change exists.
 */
export function xirr(flows: readonly CashFlow[]): Dec | null {
  if (flows.length < 2) return null;
  const sorted = [...flows].sort((a, b) => a.date.localeCompare(b.date));
  const hasPositive = sorted.some((flow) => flow.amount.gt(0));
  const hasNegative = sorted.some((flow) => flow.amount.lt(0));
  if (!hasPositive || !hasNegative) return null;
  const origin = (sorted[0] as CashFlow).date;
  const years = sorted.map((flow) => new Dec(diffIsoDays(origin, flow.date)).div(365));

  const npv = (rate: Dec): Dec =>
    sorted.reduce(
      (total, flow, index) => total.plus(flow.amount.div(ONE.plus(rate).pow(years[index] as Dec))),
      ZERO,
    );

  let low = new Dec("-0.9999");
  let high = new Dec(10);
  let fLow = npv(low);
  const fHigh = npv(high);
  if (fLow.mul(fHigh).gt(0)) {
    // Widen the upper bound for extreme returns before giving up.
    high = new Dec(1000);
    if (fLow.mul(npv(high)).gt(0)) return null;
  }
  for (let i = 0; i < 200; i++) {
    const mid = low.plus(high).div(2);
    const fMid = npv(mid);
    if (fMid.abs().lt("1e-12") || high.minus(low).lt("1e-14")) return mid;
    if (fLow.mul(fMid).lte(0)) {
      high = mid;
    } else {
      low = mid;
      fLow = fMid;
    }
  }
  return low.plus(high).div(2);
}

export type ValuePoint = {
  date: IsoDate;
  /** Portfolio value at the end of the day, after the day's flow. */
  value: Dec;
  /** Net external contribution of the day (deposits positive, withdrawals negative). */
  flow: Dec;
};

/**
 * Time-weighted return: chain-linked daily returns `(V_t - F_t) / V_{t-1} - 1`, which removes the
 * effect of when money was added. Days starting from a zero value are skipped (no base to earn on).
 */
export function timeWeightedReturn(points: readonly ValuePoint[]): {
  total: Dec;
  daily: { date: IsoDate; return: Dec }[];
} {
  let growth = ONE;
  const daily: { date: IsoDate; return: Dec }[] = [];
  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1] as ValuePoint;
    const current = points[i] as ValuePoint;
    if (previous.value.lte(0)) continue;
    const r = current.value.minus(current.flow).div(previous.value).minus(1);
    growth = growth.mul(ONE.plus(r));
    daily.push({ date: current.date, return: r });
  }
  return { total: growth.minus(1), daily };
}

/** Cumulative return of a benchmark series between two dates (e.g. index levels). */
export function seriesReturn(
  levels: readonly { date: IsoDate; value: Dec }[],
  from: IsoDate,
  to: IsoDate,
): Dec | null {
  const at = (date: IsoDate): Dec | undefined => {
    let found: Dec | undefined;
    for (const level of levels) {
      if (level.date <= date) found = level.value;
      else break;
    }
    return found;
  };
  const start = at(from);
  const end = at(to);
  if (!start || !end || start.isZero()) return null;
  return end.div(start).minus(1);
}

export const PERFORMANCE_PERIODS = ["1M", "3M", "6M", "YTD", "1Y", "5Y", "MAX"] as const;
export type PerformancePeriod = (typeof PERFORMANCE_PERIODS)[number];

export function periodStart(period: PerformancePeriod, today: IsoDate, earliest: IsoDate): IsoDate {
  const [year, month, day] = today.split("-").map(Number) as [number, number, number];
  const shift = (months: number): IsoDate => {
    const target = new Date(Date.UTC(year, month - 1 - months, 1));
    const lastDay = new Date(
      Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
    ).getUTCDate();
    target.setUTCDate(Math.min(day, lastDay));
    return target.toISOString().slice(0, 10);
  };
  const start =
    period === "1M"
      ? shift(1)
      : period === "3M"
        ? shift(3)
        : period === "6M"
          ? shift(6)
          : period === "YTD"
            ? `${year - 1}-12-31`
            : period === "1Y"
              ? shift(12)
              : period === "5Y"
                ? shift(60)
                : earliest;
  return start < earliest ? earliest : start;
}
