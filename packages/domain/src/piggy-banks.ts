import { addIsoDays, type BusinessCalendar, diffIsoDays } from "./investments/calendar.js";
import { Dec, d, ONE, ZERO } from "./investments/decimal.js";
import type { IndexData } from "./investments/fixed-income.js";
import { fixedIncomeRedemptionTax } from "./investments/tax.js";
import type { TaxRules } from "./investments/tax-rules.js";
import type { IsoDate } from "./investments/types.js";

/**
 * Piggy bank maths: daily accrual, "net if withdrawn today" and yield-aware goal planning.
 * Everything here is pure (no clock, no database, no network) so it is unit tested on its own.
 * Money is integer minor units at the edges and `Dec` inside. See docs/piggy-banks.md.
 */

export const PIGGY_YIELD_TYPES = [
  "cdi_percent",
  "selic_percent",
  "ipca_plus",
  "fixed_rate",
  "none",
] as const;
export type PiggyYieldType = (typeof PIGGY_YIELD_TYPES)[number];

export const PIGGY_DAY_COUNTS = [252, 365] as const;
export type PiggyDayCount = (typeof PIGGY_DAY_COUNTS)[number];

export type PiggyYield = {
  type: PiggyYieldType;
  /** A percentage: 102 = 102% of CDI, 6.5 = IPCA + 6.5% a.a., 12 = 12% a.a. */
  rate: number;
  dayCount: PiggyDayCount;
};

/** The day count a yield type uses unless the owner overrides it: 252 for CDI/Selic, else 365. */
export function defaultDayCount(type: PiggyYieldType): PiggyDayCount {
  return type === "cdi_percent" || type === "selic_percent" ? 252 : 365;
}

/** CDI and Selic always accrue on business days; the others follow the configured basis. */
export function effectiveDayCount(config: PiggyYield): PiggyDayCount {
  return config.type === "cdi_percent" || config.type === "selic_percent" ? 252 : config.dayCount;
}

export type DailyAccrualFactor = {
  /** 1 + the day's yield; exactly 1 on days that do not accrue. */
  factor: Dec;
  /** False on weekends and holidays for business-day products. */
  accrues: boolean;
  /** True when a published index was missing and a projection stood in. */
  estimated: boolean;
};

const NO_ACCRUAL: DailyAccrualFactor = { factor: ONE, accrues: false, estimated: false };

function dailyFromAnnual(annual: string, basis: number): Dec {
  return ONE.plus(d(annual)).pow(ONE.div(basis)).minus(1);
}

function daysInMonth(day: IsoDate): number {
  const [year, month] = day.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function businessDaysInMonth(day: IsoDate, calendar: BusinessCalendar): number {
  const start = `${day.slice(0, 7)}-01` as IsoDate;
  return calendar.countBusinessDays(start, addIsoDays(start, daysInMonth(day)));
}

/**
 * Growth factor of one day. Compounding is daily on the running balance, so the caller multiplies
 * the balance by this factor (or by `factor - 1` for the interest).
 */
export function dailyFactor(
  config: PiggyYield,
  day: IsoDate,
  data: IndexData,
  calendar: BusinessCalendar,
): DailyAccrualFactor {
  if (config.type === "none") return NO_ACCRUAL;
  const basis = effectiveDayCount(config);
  if (basis === 252 && !calendar.isBusinessDay(day)) return NO_ACCRUAL;
  const pct = d(config.rate).div(100);

  switch (config.type) {
    case "cdi_percent":
    case "selic_percent": {
      const isCdi = config.type === "cdi_percent";
      const lookup = isCdi ? data.cdiDaily : data.selicDaily;
      const projection = isCdi
        ? data.cdiAnnualProjection
        : (data.selicAnnualProjection ?? data.cdiAnnualProjection);
      const published = lookup?.(day);
      const daily = published ?? dailyFromAnnual(projection, 252);
      return {
        factor: ONE.plus(daily.mul(pct)),
        accrues: true,
        estimated: published === undefined,
      };
    }
    case "fixed_rate":
      return {
        factor: ONE.plus(pct).pow(ONE.div(basis)),
        accrues: true,
        estimated: false,
      };
    case "ipca_plus": {
      const published = data.ipcaMonthly?.(day.slice(0, 7));
      const monthly = published ?? d(data.ipcaProjectionMonthly);
      const units = basis === 252 ? businessDaysInMonth(day, calendar) : daysInMonth(day);
      const indexed = units > 0 ? ONE.plus(monthly).pow(ONE.div(units)) : ONE;
      return {
        factor: indexed.mul(ONE.plus(pct).pow(ONE.div(basis))),
        accrues: true,
        estimated: published === undefined,
      };
    }
  }
}

export type DayAccrual = {
  /** Interest before rounding, in fractional minor units. */
  exact: Dec;
  /** Whole minor units to post today. */
  posted: number;
  /** Fraction left over for tomorrow, in [0, 1) for positive balances. */
  carryOut: Dec;
};

/**
 * Interest for one day on a balance. The fractional part is carried instead of rounded away, so
 * a small balance still earns: 0.4 minor units today and 0.4 tomorrow post 0 and then 1 (0.8 + carry).
 */
export function accrueDay(input: {
  balance: number;
  carryIn: Dec | string | number;
  factor: Dec;
}): DayAccrual {
  const exact = new Dec(input.balance).mul(input.factor.minus(1));
  const total = exact.plus(d(input.carryIn));
  const posted = Math.max(0, total.floor().toNumber());
  return { exact, posted, carryOut: total.minus(posted) };
}

/** Yearly effective rate (a fraction) a config earns on projected indexes only; 0 for `none`. */
export function projectedAnnualRate(config: PiggyYield, data: IndexData): number {
  if (config.type === "none") return 0;
  const basis = effectiveDayCount(config);
  const projectionOnly: IndexData = {
    cdiAnnualProjection: data.cdiAnnualProjection,
    selicAnnualProjection: data.selicAnnualProjection,
    ipcaProjectionMonthly: data.ipcaProjectionMonthly,
  };
  const sampleDay = "2026-03-10" as IsoDate; // a regular business day, only the factor matters
  const calendar = {
    isBusinessDay: () => true,
    countBusinessDays: () => 21,
  } as unknown as BusinessCalendar;
  const { factor } = dailyFactor(config, sampleDay, projectionOnly, calendar);
  if (config.type === "ipca_plus") {
    // IPCA is monthly: compound the month, then the spread over the year.
    const ipcaYear = ONE.plus(d(data.ipcaProjectionMonthly)).pow(12);
    return ipcaYear
      .mul(ONE.plus(d(config.rate).div(100)))
      .minus(1)
      .toNumber();
  }
  return factor.pow(basis).minus(1).toNumber();
}

/**
 * Balance-weighted yearly rate of several piggy banks (a fraction). With nothing saved yet there
 * is no weight, so the plain average stands in: an empty piggy bank still earns its rate once it
 * gets money, and a plan for it should count that.
 */
export function weightedAnnualRate(
  items: readonly { balance: number; annualRate: number }[],
): number {
  if (items.length === 0) return 0;
  const total = items.reduce((sum, item) => sum + Math.max(0, item.balance), 0);
  if (total <= 0) return items.reduce((sum, item) => sum + item.annualRate, 0) / items.length;
  return items.reduce(
    (sum, item) => sum + (Math.max(0, item.balance) / total) * item.annualRate,
    0,
  );
}

// -------------------------------------------------------------------------------- accrual runs

export type AccrualDay = {
  date: IsoDate;
  accrues: boolean;
  estimated: boolean;
  exact: number;
  posted: number;
  balanceAfter: number;
};

/**
 * Accrues every day in `[from, to)` on a starting balance, posting the whole units each day.
 * Used by projections and by tests; the job itself posts day by day.
 */
export function accrueRange(input: {
  config: PiggyYield;
  from: IsoDate;
  to: IsoDate;
  balance: number;
  carryIn?: Dec | string | number;
  data: IndexData;
  calendar: BusinessCalendar;
}): { days: AccrualDay[]; balance: number; carry: Dec } {
  let balance = input.balance;
  let carry = d(input.carryIn);
  const days: AccrualDay[] = [];
  for (let day = input.from; day < input.to; day = addIsoDays(day, 1)) {
    const f = dailyFactor(input.config, day, input.data, input.calendar);
    const result = accrueDay({ balance, carryIn: carry, factor: f.factor });
    balance += result.posted;
    carry = result.carryOut;
    days.push({
      date: day,
      accrues: f.accrues,
      estimated: f.estimated,
      exact: result.exact.toNumber(),
      posted: result.posted,
      balanceAfter: balance,
    });
  }
  return { days, balance, carry };
}

// ------------------------------------------------------------------------- net if withdrawn

export type PiggyLot = { date: IsoDate; principal: number };

export type PiggyMovementPrincipal = {
  kind: "opening" | "deposit" | "transfer_in" | "withdrawal" | "transfer_out";
  date: IsoDate;
  /** Signed minor units: positive adds a lot, negative consumes lots oldest first. */
  amount: number;
};

/** Open lots (money still held, with the day it came in) after FIFO withdrawals. */
export function openLots(movements: readonly PiggyMovementPrincipal[]): PiggyLot[] {
  const lots: PiggyLot[] = [];
  const ordered = [...movements].sort((a, b) => a.date.localeCompare(b.date));
  for (const movement of ordered) {
    if (movement.amount > 0) {
      lots.push({ date: movement.date, principal: movement.amount });
      continue;
    }
    let remaining = -movement.amount;
    while (remaining > 0 && lots.length > 0) {
      const lot = lots[0] as PiggyLot;
      const taken = Math.min(lot.principal, remaining);
      lot.principal -= taken;
      remaining -= taken;
      if (lot.principal === 0) lots.shift();
    }
  }
  return lots;
}

export type NetIfWithdrawn = {
  /** Principal still held plus the accrued gain. */
  gross: number;
  gain: number;
  ir: number;
  iof: number;
  net: number;
};

/**
 * What the owner would receive withdrawing everything today. The accrued gain (gross minus the
 * principal of the open lots) is split between lots by `principal x days held`, and each share is
 * taxed with the regressive IR table (and the 30-day IOF table) of that lot's holding period, read
 * from `TaxRules` through the shared fixed-income helper. `taxRegime: "none"` returns gross.
 */
export function netIfWithdrawn(input: {
  grossBalance: number;
  lots: readonly PiggyLot[];
  today: IsoDate;
  rules: TaxRules;
  taxRegime: "none" | "regressive_ir";
  applyIof: boolean;
}): NetIfWithdrawn {
  const principal = input.lots.reduce((sum, lot) => sum + lot.principal, 0);
  const gain = Math.max(0, input.grossBalance - principal);
  if (input.taxRegime === "none" || gain === 0 || input.lots.length === 0) {
    return { gross: input.grossBalance, gain, ir: 0, iof: 0, net: input.grossBalance };
  }

  const weights = input.lots.map(
    (lot) => lot.principal * Math.max(1, diffIsoDays(lot.date, input.today)),
  );
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let ir = ZERO;
  let iof = ZERO;
  let allocated = 0;
  input.lots.forEach((lot, index) => {
    const isLast = index === input.lots.length - 1;
    const share = isLast
      ? gain - allocated
      : Math.round((gain * (weights[index] as number)) / totalWeight);
    allocated += share;
    if (share <= 0) return;
    const tax = fixedIncomeRedemptionTax({
      principal: new Dec(lot.principal).div(100),
      grossValue: new Dec(lot.principal + share).div(100),
      daysHeld: Math.max(0, diffIsoDays(lot.date, input.today)),
      assetClass: "CDB",
      date: input.today,
      rules: input.rules,
      applyExemptions: false,
    });
    ir = ir.plus(tax.ir);
    if (input.applyIof) iof = iof.plus(tax.iof);
  });

  const irMinor = ir.mul(100).toDecimalPlaces(0).toNumber();
  const iofMinor = iof.mul(100).toDecimalPlaces(0).toNumber();
  return {
    gross: input.grossBalance,
    gain,
    ir: irMinor,
    iof: iofMinor,
    net: input.grossBalance - irMinor - iofMinor,
  };
}

// ---------------------------------------------------------------------------- goal planning

/** Hard stop for projections: 50 years of months. */
export const MAX_PLAN_MONTHS = 600;

/** Monthly rate equivalent to a yearly rate (a fraction). */
export function monthlyRateFromAnnual(annualRate: number): number {
  if (annualRate <= -1) return -1;
  return (1 + annualRate) ** (1 / 12) - 1;
}

/**
 * Balances at the end of each month: index 0 is `start`, index n the balance after n months, each
 * month the balance grows by the monthly rate and then the deposit goes in.
 */
export function projectWithYield(input: {
  start: number;
  monthly: number;
  annualRate: number;
  months: number;
}): number[] {
  const rate = monthlyRateFromAnnual(input.annualRate);
  const out = [Math.round(input.start)];
  let balance = input.start;
  for (let month = 1; month <= input.months; month += 1) {
    balance = balance * (1 + rate) + input.monthly;
    out.push(Math.round(balance));
  }
  return out;
}

/** Months of deposits until the balance reaches the target; 0 when already there; null if never. */
export function monthsToReachWithYield(input: {
  start: number;
  target: number;
  monthly: number;
  annualRate: number;
}): number | null {
  if (input.start >= input.target) return 0;
  const rate = monthlyRateFromAnnual(input.annualRate);
  if (input.monthly <= 0 && rate <= 0) return null;
  let balance = input.start;
  for (let month = 1; month <= MAX_PLAN_MONTHS; month += 1) {
    balance = balance * (1 + rate) + input.monthly;
    if (Math.round(balance) >= input.target) return month;
  }
  return null;
}

/** Deposit per month that grows `start` to `target` in `months`, counting the yield. */
export function requiredMonthlyWithYield(input: {
  start: number;
  target: number;
  months: number;
  annualRate: number;
}): number {
  if (input.months <= 0) return Math.max(0, input.target - input.start);
  const rate = monthlyRateFromAnnual(input.annualRate);
  if (input.start >= input.target && rate >= 0) return 0;
  if (rate === 0) return Math.max(0, Math.ceil((input.target - input.start) / input.months));
  const growth = (1 + rate) ** input.months;
  const needed = ((input.target - input.start * growth) * rate) / (growth - 1);
  return Math.max(0, Math.ceil(needed));
}

export const PIGGY_PLAN_MODES = [
  "target_by_date",
  "fixed_monthly",
  "fixed_monthly_for_months",
] as const;
export type PiggyPlanMode = (typeof PIGGY_PLAN_MODES)[number];

export type PiggyGoalPlanInput =
  | { mode: "target_by_date"; start: number; target: number; months: number; annualRate: number }
  | { mode: "fixed_monthly"; start: number; target: number; monthly: number; annualRate: number }
  | {
      mode: "fixed_monthly_for_months";
      start: number;
      target: number;
      monthly: number;
      months: number;
      annualRate: number;
    };

export type PiggyGoalPlan = {
  mode: PiggyPlanMode;
  /** Monthly deposit the plan uses or requires. */
  monthly: number;
  /** Months until the target is reached (mode 2) or the plan horizon (modes 1 and 3); null if never. */
  months: number | null;
  /** Balance at the end of the plan horizon (null when mode 2 never reaches the target). */
  finalValue: number | null;
  /** Total deposited over the horizon, excluding the starting balance. */
  deposited: number | null;
  /** Interest earned over the horizon. */
  interest: number | null;
  /** True when the final value reaches the target. */
  reachesTarget: boolean;
};

/** The three plan modes with yield. Every figure is integer minor units. */
export function planWithYield(input: PiggyGoalPlanInput): PiggyGoalPlan {
  const { start, target, annualRate } = input;
  let monthly: number;
  let months: number | null;
  if (input.mode === "target_by_date") {
    months = Math.max(1, input.months);
    monthly = requiredMonthlyWithYield({ start, target, months, annualRate });
  } else if (input.mode === "fixed_monthly") {
    monthly = input.monthly;
    months = monthsToReachWithYield({ start, target, monthly, annualRate });
  } else {
    monthly = input.monthly;
    months = Math.max(0, input.months);
  }

  if (months === null) {
    return {
      mode: input.mode,
      monthly,
      months,
      finalValue: null,
      deposited: null,
      interest: null,
      reachesTarget: false,
    };
  }
  const series = projectWithYield({ start, monthly, annualRate, months });
  const finalValue = series[series.length - 1] as number;
  const deposited = monthly * months;
  return {
    mode: input.mode,
    monthly,
    months,
    finalValue,
    deposited,
    interest: finalValue - start - deposited,
    reachesTarget: finalValue >= target,
  };
}

export type ProjectionPoint = {
  /** First day of the month the point stands for (the start month is the first point). */
  date: IsoDate;
  balance: number;
  /** Cumulative deposits since the start. */
  deposits: number;
  /** Cumulative interest since the start. */
  interest: number;
  target: number;
};

function addMonths(date: IsoDate, months: number): IsoDate {
  const [year, month] = date.split("-").map(Number) as [number, number];
  const index = month - 1 + months;
  const y = year + Math.floor(index / 12);
  const m = ((index % 12) + 12) % 12;
  return `${y}-${String(m + 1).padStart(2, "0")}-01`;
}

/** Month-by-month chart series: balance with deposits plus interest, and the target line. */
export function buildProjectionSeries(input: {
  startMonth: IsoDate;
  start: number;
  monthly: number;
  annualRate: number;
  months: number;
  target: number;
}): ProjectionPoint[] {
  const balances = projectWithYield(input);
  return balances.map((balance, index) => {
    const deposits = input.monthly * index;
    return {
      date: addMonths(input.startMonth, index),
      balance,
      deposits,
      interest: balance - input.start - deposits,
      target: input.target,
    };
  });
}

// ------------------------------------------------------------------------ planned vs actual

export type MonthDeposit = { month: string; amount: number };

export type MonthTrackingStatus = "on_track" | "behind" | "ahead" | "upcoming";

export type MonthTrackingRow = {
  /** `YYYY-MM`. */
  month: string;
  planned: number;
  actual: number;
  /** actual - planned for this month alone. */
  difference: number;
  cumulativePlanned: number;
  cumulativeActual: number;
  status: MonthTrackingStatus;
  /** What the closed months still owe: max(0, cumulativePlanned - cumulativeActual); 0 for future months. */
  catchUp: number;
};

export type PiggyTracking = {
  rows: MonthTrackingRow[];
  /** Overall status through the current month. */
  status: "on_track" | "behind" | "ahead";
  /** Amount to add to catch up with the plan as of the current month (planned through today). */
  catchUp: number;
};

function monthKey(date: IsoDate): string {
  return date.slice(0, 7);
}

function monthsBetween(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number) as [number, number];
  const [ty, tm] = to.split("-").map(Number) as [number, number];
  return (ty - fy) * 12 + (tm - fm);
}

/**
 * Planned versus actual deposits per month from the plan's first month to its last (or `today`'s
 * month when the plan has no end, up to twelve months past today). `actual` for a month is what went
 * into the piggy banks that month net of withdrawals. A closed month with less than planned is
 * `behind`; the current month is `behind` only when the cumulative gap is positive.
 */
export function trackMonths(input: {
  /** First month of the plan, `YYYY-MM`. */
  startMonth: string;
  /** Last month of the plan, `YYYY-MM`, or null for no end. */
  endMonth: string | null;
  monthlyPlanned: number;
  deposits: readonly MonthDeposit[];
  today: IsoDate;
}): PiggyTracking {
  const currentMonth = monthKey(input.today);
  const last = input.endMonth ?? addMonths(`${currentMonth}-01` as IsoDate, 12).slice(0, 7);
  const span = Math.min(MAX_PLAN_MONTHS, Math.max(0, monthsBetween(input.startMonth, last)));
  const byMonth = new Map<string, number>();
  for (const deposit of input.deposits) {
    byMonth.set(deposit.month, (byMonth.get(deposit.month) ?? 0) + deposit.amount);
  }

  const rows: MonthTrackingRow[] = [];
  let cumulativePlanned = 0;
  let cumulativeActual = 0;
  let catchUpNow = 0;
  for (let offset = 0; offset <= span; offset += 1) {
    const month = addMonths(`${input.startMonth}-01` as IsoDate, offset).slice(0, 7);
    const future = month > currentMonth;
    const planned = input.monthlyPlanned;
    const actual = byMonth.get(month) ?? 0;
    cumulativePlanned += planned;
    cumulativeActual += actual;
    const gap = cumulativePlanned - cumulativeActual;
    let status: MonthTrackingStatus;
    if (future) status = "upcoming";
    else if (gap > 0) status = "behind";
    else if (gap < 0) status = "ahead";
    else status = "on_track";
    if (month === currentMonth) catchUpNow = Math.max(0, gap);
    rows.push({
      month,
      planned,
      actual,
      difference: actual - planned,
      cumulativePlanned,
      cumulativeActual,
      status,
      catchUp: future ? 0 : Math.max(0, gap),
    });
  }

  if (input.startMonth > currentMonth) {
    return { rows, status: "on_track", catchUp: 0 };
  }
  if (currentMonth > last) {
    const final = rows[rows.length - 1];
    const gap = final ? final.cumulativePlanned - final.cumulativeActual : 0;
    return {
      rows,
      status: gap > 0 ? "behind" : gap < 0 ? "ahead" : "on_track",
      catchUp: Math.max(0, gap),
    };
  }
  const current = rows.find((row) => row.month === currentMonth);
  const status = current?.status === "upcoming" || !current ? "on_track" : current.status;
  return { rows, status, catchUp: catchUpNow };
}
