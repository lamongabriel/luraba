import { describe, expect, it } from "vitest";
import { BusinessCalendar, DEFAULT_TAX_RULES, Dec, d, type IndexData, TaxRules } from "../index.js";
import {
  accrueDay,
  accrueRange,
  buildProjectionSeries,
  dailyFactor,
  defaultDayCount,
  effectiveDayCount,
  monthsToReachWithYield,
  netIfWithdrawn,
  openLots,
  type PiggyYield,
  planWithYield,
  projectedAnnualRate,
  projectWithYield,
  requiredMonthlyWithYield,
  trackMonths,
  weightedAnnualRate,
} from "../piggy-banks.js";

const calendar = BusinessCalendar.anbima();
const rules = new TaxRules(DEFAULT_TAX_RULES);

/** CDI at 0.0551% a day on every day it is asked for, the way BCB publishes it. */
const flatData: IndexData = {
  cdiDaily: () => d("0.000551"),
  selicDaily: () => d("0.000550"),
  cdiAnnualProjection: "0.1465",
  ipcaMonthly: () => d("0.004"),
  ipcaProjectionMonthly: "0.004",
};
const emptyData: IndexData = { cdiAnnualProjection: "0.1465", ipcaProjectionMonthly: "0.004" };

const cdi = (rate: number): PiggyYield => ({ type: "cdi_percent", rate, dayCount: 252 });

describe("day count", () => {
  it("uses 252 for CDI and Selic and 365 otherwise", () => {
    expect(defaultDayCount("cdi_percent")).toBe(252);
    expect(defaultDayCount("selic_percent")).toBe(252);
    expect(defaultDayCount("ipca_plus")).toBe(365);
    expect(defaultDayCount("fixed_rate")).toBe(365);
  });

  it("forces 252 for CDI even when configured with 365", () => {
    expect(effectiveDayCount({ type: "cdi_percent", rate: 100, dayCount: 365 })).toBe(252);
    expect(effectiveDayCount({ type: "fixed_rate", rate: 10, dayCount: 252 })).toBe(252);
  });
});

describe("dailyFactor", () => {
  it("accrues a percentage of the daily CDI", () => {
    const result = dailyFactor(cdi(102), "2026-03-10", flatData, calendar);
    expect(result.accrues).toBe(true);
    expect(result.estimated).toBe(false);
    expect(result.factor.toFixed(12)).toBe(new Dec(1).plus(d("0.000551").mul("1.02")).toFixed(12));
  });

  it("does not accrue a CDI product on weekends or holidays", () => {
    expect(dailyFactor(cdi(100), "2026-03-14", flatData, calendar).accrues).toBe(false); // Saturday
    expect(dailyFactor(cdi(100), "2026-03-14", flatData, calendar).factor.eq(1)).toBe(true);
    expect(dailyFactor(cdi(100), "2026-04-21", flatData, calendar).accrues).toBe(false); // Tiradentes
  });

  it("projects and flags days with no published CDI", () => {
    const result = dailyFactor(cdi(100), "2026-03-10", emptyData, calendar);
    expect(result.estimated).toBe(true);
    // 14.65% a year over 252 days
    expect(result.factor.pow(252).minus(1).toNumber()).toBeCloseTo(0.1465, 6);
  });

  it("uses the Selic series for selic_percent", () => {
    const result = dailyFactor(
      { type: "selic_percent", rate: 100, dayCount: 252 },
      "2026-03-10",
      flatData,
      calendar,
    );
    expect(result.factor.toFixed(9)).toBe("1.000550000");
  });

  it("compounds a fixed rate over 365 calendar days, including weekends", () => {
    const config: PiggyYield = { type: "fixed_rate", rate: 12, dayCount: 365 };
    const saturday = dailyFactor(config, "2026-03-14", flatData, calendar);
    expect(saturday.accrues).toBe(true);
    expect(saturday.factor.pow(365).toNumber()).toBeCloseTo(1.12, 9);
  });

  it("compounds a fixed rate over 252 business days when asked", () => {
    const config: PiggyYield = { type: "fixed_rate", rate: 12, dayCount: 252 };
    expect(dailyFactor(config, "2026-03-14", flatData, calendar).accrues).toBe(false);
    expect(
      dailyFactor(config, "2026-03-10", flatData, calendar).factor.pow(252).toNumber(),
    ).toBeCloseTo(1.12, 9);
  });

  it("adds a spread to the monthly IPCA, spread over the month's days", () => {
    const config: PiggyYield = { type: "ipca_plus", rate: 6, dayCount: 365 };
    const result = dailyFactor(config, "2026-03-10", flatData, calendar);
    const expected = 1.004 ** (1 / 31) * 1.06 ** (1 / 365);
    expect(result.factor.toNumber()).toBeCloseTo(expected, 12);
    expect(result.estimated).toBe(false);
  });

  it("flags IPCA+ as estimated when the month is not published", () => {
    const config: PiggyYield = { type: "ipca_plus", rate: 6, dayCount: 365 };
    expect(dailyFactor(config, "2026-03-10", emptyData, calendar).estimated).toBe(true);
  });

  it("does nothing for none", () => {
    const result = dailyFactor(
      { type: "none", rate: 0, dayCount: 365 },
      "2026-03-10",
      flatData,
      calendar,
    );
    expect(result).toMatchObject({ accrues: false, estimated: false });
  });
});

describe("accrueDay", () => {
  it("posts whole minor units and carries the fraction", () => {
    const factor = new Dec("1.0004");
    const first = accrueDay({ balance: 1000, carryIn: 0, factor }); // 0.4
    expect(first.posted).toBe(0);
    expect(first.carryOut.toNumber()).toBeCloseTo(0.4, 9);
    const second = accrueDay({ balance: 1000, carryIn: first.carryOut, factor }); // 0.8
    expect(second.posted).toBe(0);
    const third = accrueDay({ balance: 1000, carryIn: second.carryOut, factor }); // 1.2
    expect(third.posted).toBe(1);
    expect(third.carryOut.toNumber()).toBeCloseTo(0.2, 9);
  });

  it("never posts negative interest", () => {
    expect(accrueDay({ balance: 1000, carryIn: 0, factor: new Dec("0.999") }).posted).toBe(0);
  });
});

describe("accrueRange", () => {
  it("accrues only business days for CDI and compounds daily", () => {
    // Fri 2026-03-06 .. Tue 2026-03-10: Fri accrues, Sat/Sun do not, Mon accrues.
    const result = accrueRange({
      config: cdi(100),
      from: "2026-03-06",
      to: "2026-03-10",
      balance: 100_000_000,
      data: flatData,
      calendar,
    });
    expect(result.days.map((day) => day.accrues)).toEqual([true, false, false, true]);
    const perDay = Math.round(100_000_000 * 0.000551);
    expect(result.days[0]?.posted).toBe(Math.floor(perDay));
    expect(result.days[1]?.posted).toBe(0);
    expect(result.balance).toBeGreaterThan(100_000_000 + 2 * Math.floor(perDay) - 1);
  });

  it("a year of 100% CDI at 14.65% projected earns about that rate", () => {
    const result = accrueRange({
      config: cdi(100),
      from: "2026-01-01",
      to: "2027-01-01",
      balance: 10_000_000,
      data: emptyData,
      calendar,
    });
    expect(result.days.every((day) => day.estimated || !day.accrues)).toBe(true);
    // ~250 business days in 2026 rather than 252, so a touch below the annual rate
    expect(result.balance / 10_000_000 - 1).toBeGreaterThan(0.14);
    expect(result.balance / 10_000_000 - 1).toBeLessThan(0.1475);
  });

  it("a fixed 12% a.a. earns exactly 12% in 365 days", () => {
    const result = accrueRange({
      config: { type: "fixed_rate", rate: 12, dayCount: 365 },
      from: "2026-01-01",
      to: "2027-01-01",
      balance: 100_000_000,
      data: flatData,
      calendar,
    });
    // balance is rounded down each day, so allow a few units
    expect(Math.abs(result.balance - 112_000_000)).toBeLessThan(400);
  });

  it("is deterministic: the same inputs give the same days", () => {
    const run = () =>
      accrueRange({
        config: cdi(120),
        from: "2026-02-01",
        to: "2026-03-01",
        balance: 5_000_000,
        data: flatData,
        calendar,
      });
    expect(run().days).toEqual(run().days);
  });
});

describe("projectedAnnualRate and weightedAnnualRate", () => {
  it("projects 102% of CDI from the annual projection", () => {
    const rate = projectedAnnualRate(cdi(102), emptyData);
    expect(rate).toBeGreaterThan(0.1465);
    expect(rate).toBeLessThan(0.15);
  });

  it("projects a fixed rate as itself and none as zero", () => {
    expect(
      projectedAnnualRate({ type: "fixed_rate", rate: 13.4, dayCount: 365 }, emptyData),
    ).toBeCloseTo(0.134, 9);
    expect(projectedAnnualRate({ type: "none", rate: 0, dayCount: 365 }, emptyData)).toBe(0);
  });

  it("projects IPCA+ as the year of IPCA plus the spread", () => {
    const rate = projectedAnnualRate({ type: "ipca_plus", rate: 6, dayCount: 365 }, emptyData);
    expect(rate).toBeCloseTo(1.004 ** 12 * 1.06 - 1, 9);
  });

  it("weights by balance", () => {
    expect(
      weightedAnnualRate([
        { balance: 100, annualRate: 0.1 },
        { balance: 300, annualRate: 0.2 },
      ]),
    ).toBeCloseTo(0.175, 12);
    expect(weightedAnnualRate([])).toBe(0);
    expect(weightedAnnualRate([{ balance: 0, annualRate: 0.5 }])).toBe(0);
  });
});

describe("openLots", () => {
  it("consumes lots first in, first out", () => {
    const lots = openLots([
      { kind: "deposit", date: "2026-01-01", amount: 1000 },
      { kind: "deposit", date: "2026-02-01", amount: 500 },
      { kind: "withdrawal", date: "2026-03-01", amount: -1200 },
    ]);
    expect(lots).toEqual([{ date: "2026-02-01", principal: 300 }]);
  });

  it("ignores withdrawals beyond the lots", () => {
    expect(openLots([{ kind: "withdrawal", date: "2026-01-01", amount: -50 }])).toEqual([]);
  });
});

describe("netIfWithdrawn", () => {
  const today = "2026-07-01";

  it("returns gross when there is no tax regime", () => {
    const result = netIfWithdrawn({
      grossBalance: 105_000,
      lots: [{ date: "2026-01-01", principal: 100_000 }],
      today,
      rules,
      taxRegime: "none",
      applyIof: true,
    });
    expect(result).toEqual({ gross: 105_000, gain: 5_000, ir: 0, iof: 0, net: 105_000 });
  });

  it("applies 22.5% in the first 180 days", () => {
    const result = netIfWithdrawn({
      grossBalance: 105_000,
      lots: [{ date: "2026-02-01", principal: 100_000 }], // 150 days
      today,
      rules,
      taxRegime: "regressive_ir",
      applyIof: true,
    });
    expect(result.ir).toBe(1_125);
    expect(result.iof).toBe(0);
    expect(result.net).toBe(103_875);
  });

  it("drops to 15% after 720 days", () => {
    const result = netIfWithdrawn({
      grossBalance: 120_000,
      lots: [{ date: "2024-01-01", principal: 100_000 }],
      today,
      rules,
      taxRegime: "regressive_ir",
      applyIof: true,
    });
    expect(result.ir).toBe(3_000);
    expect(result.net).toBe(117_000);
  });

  it("charges IOF inside 30 days and reduces the IR base by it", () => {
    const result = netIfWithdrawn({
      grossBalance: 100_100,
      lots: [{ date: "2026-06-26", principal: 100_000 }], // 5 days: IOF 83%
      today,
      rules,
      taxRegime: "regressive_ir",
      applyIof: true,
    });
    expect(result.iof).toBe(83); // day 5: 83% of the 1.00 gain
    expect(result.ir).toBe(4); // 22.5% of the remaining 0.17, rounded to the cent
    expect(result.net).toBe(100_100 - 83 - result.ir);
  });

  it("skips IOF when disabled", () => {
    const result = netIfWithdrawn({
      grossBalance: 100_100,
      lots: [{ date: "2026-06-26", principal: 100_000 }],
      today,
      rules,
      taxRegime: "regressive_ir",
      applyIof: false,
    });
    expect(result.iof).toBe(0);
  });

  it("splits the gain between lots of different ages", () => {
    const result = netIfWithdrawn({
      grossBalance: 210_000,
      lots: [
        { date: "2024-01-01", principal: 100_000 }, // old, 15%
        { date: "2026-06-01", principal: 100_000 }, // 30 days, 22.5% + IOF 0
      ],
      today,
      rules,
      taxRegime: "regressive_ir",
      applyIof: true,
    });
    expect(result.gain).toBe(10_000);
    // the old lot carries most of the gain, so the blended rate is near 15%
    expect(result.ir).toBeGreaterThan(1_500);
    expect(result.ir).toBeLessThan(2_250);
    expect(result.net).toBe(210_000 - result.ir - result.iof);
  });

  it("charges nothing on a loss or no gain", () => {
    const result = netIfWithdrawn({
      grossBalance: 99_000,
      lots: [{ date: "2026-01-01", principal: 100_000 }],
      today,
      rules,
      taxRegime: "regressive_ir",
      applyIof: true,
    });
    expect(result).toMatchObject({ gain: 0, ir: 0, iof: 0, net: 99_000 });
  });
});

describe("projectWithYield", () => {
  it("is a straight line without yield", () => {
    expect(projectWithYield({ start: 1000, monthly: 100, annualRate: 0, months: 3 })).toEqual([
      1000, 1100, 1200, 1300,
    ]);
  });

  it("compounds monthly at the equivalent of the annual rate", () => {
    const series = projectWithYield({ start: 100_000, monthly: 0, annualRate: 0.12, months: 12 });
    expect(series[12]).toBe(112_000);
  });

  it("counts deposits that earn from the following month", () => {
    const series = projectWithYield({ start: 0, monthly: 1000, annualRate: 0.12, months: 2 });
    expect(series[1]).toBe(1000);
    expect(series[2]).toBe(Math.round(1000 * 1.12 ** (1 / 12) + 1000));
  });
});

describe("requiredMonthlyWithYield", () => {
  it("is the simple division without yield", () => {
    expect(requiredMonthlyWithYield({ start: 1000, target: 4000, months: 3, annualRate: 0 })).toBe(
      1000,
    );
  });

  it("asks for less with yield than without", () => {
    const flat = requiredMonthlyWithYield({ start: 0, target: 120_000, months: 24, annualRate: 0 });
    const withYield = requiredMonthlyWithYield({
      start: 0,
      target: 120_000,
      months: 24,
      annualRate: 0.12,
    });
    expect(withYield).toBeLessThan(flat);
  });

  it("reaches the target when deposited", () => {
    const monthly = requiredMonthlyWithYield({
      start: 20_000,
      target: 500_000,
      months: 36,
      annualRate: 0.1,
    });
    const series = projectWithYield({ start: 20_000, monthly, annualRate: 0.1, months: 36 });
    expect(series[36]).toBeGreaterThanOrEqual(500_000);
    expect(series[36]).toBeLessThan(500_000 + monthly);
  });

  it("is zero when the start already grows past the target", () => {
    expect(
      requiredMonthlyWithYield({ start: 100_000, target: 100_000, months: 12, annualRate: 0.1 }),
    ).toBe(0);
    expect(
      requiredMonthlyWithYield({ start: 90_000, target: 100_000, months: 12, annualRate: 0.2 }),
    ).toBe(0);
  });

  it("handles a zero horizon", () => {
    expect(requiredMonthlyWithYield({ start: 10, target: 100, months: 0, annualRate: 0.1 })).toBe(
      90,
    );
  });
});

describe("monthsToReachWithYield", () => {
  it("is zero when the balance is already there", () => {
    expect(monthsToReachWithYield({ start: 100, target: 100, monthly: 0, annualRate: 0 })).toBe(0);
  });

  it("is null with nothing to deposit and no yield", () => {
    expect(
      monthsToReachWithYield({ start: 10, target: 100, monthly: 0, annualRate: 0 }),
    ).toBeNull();
  });

  it("can reach the target on yield alone", () => {
    const months = monthsToReachWithYield({
      start: 100_000,
      target: 120_000,
      monthly: 0,
      annualRate: 0.12,
    });
    expect(months).toBe(20);
  });

  it("is faster with yield", () => {
    const flat = monthsToReachWithYield({
      start: 0,
      target: 100_000,
      monthly: 5_000,
      annualRate: 0,
    });
    const withYield = monthsToReachWithYield({
      start: 0,
      target: 100_000,
      monthly: 5_000,
      annualRate: 0.15,
    });
    expect(flat).toBe(20);
    expect(withYield).toBeLessThan(20);
  });

  it("gives up after fifty years", () => {
    expect(
      monthsToReachWithYield({ start: 0, target: 10 ** 12, monthly: 1, annualRate: 0 }),
    ).toBeNull();
  });
});

describe("planWithYield", () => {
  it("mode 1: target by date returns the required monthly deposit", () => {
    const plan = planWithYield({
      mode: "target_by_date",
      start: 0,
      target: 120_000,
      months: 12,
      annualRate: 0,
    });
    expect(plan).toMatchObject({
      mode: "target_by_date",
      monthly: 10_000,
      months: 12,
      finalValue: 120_000,
      reachesTarget: true,
    });
    expect(plan.interest).toBe(0);
  });

  it("mode 1 with yield deposits less and earns interest", () => {
    const plan = planWithYield({
      mode: "target_by_date",
      start: 0,
      target: 120_000,
      months: 12,
      annualRate: 0.12,
    });
    expect(plan.monthly).toBeLessThan(10_000);
    expect(plan.interest).toBeGreaterThan(0);
    expect(plan.reachesTarget).toBe(true);
  });

  it("mode 2: fixed monthly returns the months to reach the target", () => {
    const plan = planWithYield({
      mode: "fixed_monthly",
      start: 0,
      target: 100_000,
      monthly: 10_000,
      annualRate: 0,
    });
    expect(plan).toMatchObject({
      months: 10,
      finalValue: 100_000,
      deposited: 100_000,
      reachesTarget: true,
    });
  });

  it("mode 2 reports never when nothing is deposited", () => {
    const plan = planWithYield({
      mode: "fixed_monthly",
      start: 0,
      target: 100_000,
      monthly: 0,
      annualRate: 0,
    });
    expect(plan).toMatchObject({ months: null, finalValue: null, reachesTarget: false });
  });

  it("mode 3: fixed monthly for N months returns the final value", () => {
    const plan = planWithYield({
      mode: "fixed_monthly_for_months",
      start: 50_000,
      target: 200_000,
      monthly: 5_000,
      months: 12,
      annualRate: 0,
    });
    expect(plan).toMatchObject({
      months: 12,
      finalValue: 110_000,
      deposited: 60_000,
      interest: 0,
      reachesTarget: false,
    });
  });

  it("mode 3 with yield ends above the flat figure", () => {
    const flat = planWithYield({
      mode: "fixed_monthly_for_months",
      start: 50_000,
      target: 1,
      monthly: 5_000,
      months: 12,
      annualRate: 0,
    });
    const better = planWithYield({
      mode: "fixed_monthly_for_months",
      start: 50_000,
      target: 1,
      monthly: 5_000,
      months: 12,
      annualRate: 0.1,
    });
    expect(better.finalValue as number).toBeGreaterThan(flat.finalValue as number);
  });
});

describe("buildProjectionSeries", () => {
  it("splits the balance into deposits and interest and carries the target line", () => {
    const series = buildProjectionSeries({
      startMonth: "2026-11-01",
      start: 10_000,
      monthly: 1_000,
      annualRate: 0.12,
      months: 3,
      target: 50_000,
    });
    expect(series.map((p) => p.date)).toEqual([
      "2026-11-01",
      "2026-12-01",
      "2027-01-01",
      "2027-02-01",
    ]);
    expect(series[0]).toMatchObject({ balance: 10_000, deposits: 0, interest: 0, target: 50_000 });
    const last = series[3];
    expect(last?.deposits).toBe(3_000);
    expect((last?.balance ?? 0) - 10_000 - 3_000).toBe(last?.interest);
    expect(last?.interest).toBeGreaterThan(0);
  });
});

describe("trackMonths", () => {
  it("compares planned and actual per month with cumulative catch-up", () => {
    const tracking = trackMonths({
      startMonth: "2026-08",
      endMonth: "2026-12",
      monthlyPlanned: 1_000,
      deposits: [
        { month: "2026-08", amount: 1_000 },
        { month: "2026-09", amount: 400 },
        { month: "2026-10", amount: 1_200 },
        { month: "2026-11", amount: 100 },
      ],
      today: "2026-11-15",
    });
    expect(tracking.rows.map((row) => row.status)).toEqual([
      "on_track",
      "behind",
      "behind",
      "behind",
      "upcoming",
    ]);
    expect(tracking.rows[1]).toMatchObject({
      planned: 1_000,
      actual: 400,
      difference: -600,
      cumulativePlanned: 2_000,
      cumulativeActual: 1_400,
      catchUp: 600,
    });
    expect(tracking.rows[2]).toMatchObject({ difference: 200, catchUp: 400 });
    expect(tracking.catchUp).toBe(1_000 + 1_000 + 1_000 + 1_000 - (1_000 + 400 + 1_200 + 100));
    expect(tracking.status).toBe("behind");
    expect(tracking.rows[4]?.catchUp).toBe(0);
  });

  it("is ahead when more went in than planned", () => {
    const tracking = trackMonths({
      startMonth: "2026-10",
      endMonth: "2026-12",
      monthlyPlanned: 1_000,
      deposits: [{ month: "2026-10", amount: 3_000 }],
      today: "2026-11-15",
    });
    expect(tracking.status).toBe("ahead");
    expect(tracking.catchUp).toBe(0);
  });

  it("is on track when the cumulative figures match", () => {
    const tracking = trackMonths({
      startMonth: "2026-10",
      endMonth: null,
      monthlyPlanned: 500,
      deposits: [
        { month: "2026-10", amount: 500 },
        { month: "2026-11", amount: 500 },
      ],
      today: "2026-11-30",
    });
    expect(tracking.status).toBe("on_track");
    expect(tracking.rows.length).toBe(14); // Oct 2026 through Dec 2027 (a year past today)
  });

  it("has nothing to chase before the plan starts", () => {
    const tracking = trackMonths({
      startMonth: "2027-01",
      endMonth: "2027-03",
      monthlyPlanned: 100,
      deposits: [],
      today: "2026-11-15",
    });
    expect(tracking).toMatchObject({ status: "on_track", catchUp: 0 });
    expect(tracking.rows.every((row) => row.status === "upcoming")).toBe(true);
  });

  it("reports the final gap once the plan has ended", () => {
    const tracking = trackMonths({
      startMonth: "2026-01",
      endMonth: "2026-03",
      monthlyPlanned: 100,
      deposits: [{ month: "2026-01", amount: 100 }],
      today: "2026-11-15",
    });
    expect(tracking.status).toBe("behind");
    expect(tracking.catchUp).toBe(200);
  });
});
