import { describe, expect, it } from "vitest";
import { parseISODate } from "../date.js";
import {
  buildGoalTimeline,
  estimateGoal,
  monthsToReach,
  projectBalances,
  shiftMonths,
  wholeMonthsBetween,
} from "../goals.js";

const d = parseISODate;
const base = {
  targetAmount: 120_000,
  saved: 0,
  startDate: d("2026-01-15"),
  targetDate: null,
  monthlyContribution: null,
  expectedReturnBps: null,
  today: d("2026-01-15"),
};

describe("month helpers", () => {
  it("counts only whole months", () => {
    expect(wholeMonthsBetween(d("2026-01-15"), d("2026-02-14"))).toBe(0);
    expect(wholeMonthsBetween(d("2026-01-15"), d("2026-02-15"))).toBe(1);
    expect(wholeMonthsBetween(d("2026-01-15"), d("2027-01-15"))).toBe(12);
    expect(wholeMonthsBetween(d("2026-03-01"), d("2026-01-01"))).toBe(0);
  });

  it("shifts months and clamps the day", () => {
    expect(shiftMonths(d("2026-01-31"), 1).toISOString().slice(0, 10)).toBe("2026-02-28");
    expect(shiftMonths(d("2026-01-15"), -2).toISOString().slice(0, 10)).toBe("2025-11-15");
    expect(shiftMonths(d("2026-11-15"), 3).toISOString().slice(0, 10)).toBe("2027-02-15");
  });
});

describe("estimateGoal", () => {
  it("works out the monthly amount needed to hit a date", () => {
    const estimate = estimateGoal({
      ...base,
      saved: 20_000,
      targetDate: d("2027-01-15"),
    });

    expect(estimate.remaining).toBe(100_000);
    expect(estimate.percent).toBe(16);
    expect(estimate.monthsLeft).toBe(12);
    expect(estimate.requiredMonthly).toBe(8334);
    expect(estimate.expectedSaved).toBe(0);
    expect(estimate.onTrack).toBe(true);
  });

  it("compares with a steady pace when there is a date but no monthly plan", () => {
    const halfway = { ...base, targetDate: d("2027-01-15"), today: d("2026-07-15") };

    expect(estimateGoal({ ...halfway, saved: 70_000 })).toMatchObject({
      expectedSaved: 59_506,
      onTrack: true,
    });
    expect(estimateGoal({ ...halfway, saved: 10_000 }).onTrack).toBe(false);
  });

  it("projects the completion date of a monthly plan", () => {
    const estimate = estimateGoal({
      ...base,
      targetAmount: 120_000,
      monthlyContribution: 10_000,
      targetDate: d("2027-01-15"),
    });

    expect(estimate.projectedCompletionDate?.toISOString().slice(0, 10)).toBe("2027-01-15");
    expect(estimate.projectedAtTargetDate).toBe(120_000);
    expect(estimate.shortfall).toBe(0);
    expect(estimate.onTrack).toBe(true);
  });

  it("flags a plan that falls short of the date", () => {
    const estimate = estimateGoal({
      ...base,
      monthlyContribution: 5000,
      targetDate: d("2027-01-15"),
    });

    expect(estimate.projectedAtTargetDate).toBe(60_000);
    expect(estimate.shortfall).toBe(60_000);
    expect(estimate.onTrack).toBe(false);
  });

  it("treats a reached goal as done", () => {
    const estimate = estimateGoal({ ...base, saved: 130_000, targetDate: d("2026-06-15") });

    expect(estimate.remaining).toBe(0);
    expect(estimate.percent).toBe(100);
    expect(estimate.requiredMonthly).toBeNull();
    expect(estimate.onTrack).toBe(true);
  });

  it("has nothing to compare without a date or a plan", () => {
    const estimate = estimateGoal(base);
    expect(estimate.onTrack).toBeNull();
    expect(estimate.projectedCompletionDate).toBeNull();
    expect(estimate.requiredMonthly).toBeNull();
  });

  it("never shows 100% before the target is reached", () => {
    expect(estimateGoal({ ...base, saved: 119_999 }).percent).toBe(99);
  });
});

describe("investment growth", () => {
  it("compounds monthly contributions at the expected return", () => {
    const balances = projectBalances(
      { saved: 500_000, monthlyContribution: 10_000, expectedReturnBps: 1200 },
      12,
    );

    expect(balances).toHaveLength(13);
    expect(balances[0]).toBe(500_000);
    // Without growth it would be 500_000 + 12 * 10_000.
    expect(balances[12]).toBeGreaterThan(620_000);
    expect(balances[12]).toBeLessThan(700_000);
  });

  it("reaches the target sooner with a return than without", () => {
    const plan = { targetAmount: 1_000_000, saved: 500_000, monthlyContribution: 10_000 };
    const flat = monthsToReach({ ...plan, expectedReturnBps: null });
    const growing = monthsToReach({ ...plan, expectedReturnBps: 800 });

    expect(flat).toBe(50);
    expect(growing).toBeLessThan(flat as number);
  });

  it("gives up when the plan cannot get there", () => {
    expect(
      monthsToReach({
        targetAmount: 1_000_000,
        saved: 0,
        monthlyContribution: 1,
        expectedReturnBps: null,
      }),
    ).toBeNull();
    expect(
      monthsToReach({
        targetAmount: 1000,
        saved: 0,
        monthlyContribution: null,
        expectedReturnBps: 500,
      }),
    ).toBeNull();
  });
});

describe("buildGoalTimeline", () => {
  it("joins what was saved with where the plan leads", () => {
    const timeline = buildGoalTimeline(
      {
        ...base,
        saved: 20_000,
        monthlyContribution: 10_000,
        targetDate: d("2026-06-15"),
        startDate: d("2025-11-15"),
      },
      [
        { date: d("2025-11-20"), amount: 10_000 },
        { date: d("2026-01-10"), amount: 10_000 },
      ],
    );

    const today = timeline.find((point) => point.date === "2026-01-15");
    expect(today).toEqual({ date: "2026-01-15", actual: 20_000, projected: 20_000 });
    expect(timeline[0]).toMatchObject({ date: "2025-11-15", projected: null });
    expect(timeline.at(-1)).toMatchObject({ date: "2026-11-15", actual: null });
  });

  it("stays within the point limit for long goals", () => {
    const timeline = buildGoalTimeline(
      {
        ...base,
        monthlyContribution: 100,
        targetAmount: 1_000_000,
        targetDate: d("2056-01-15"),
        startDate: d("2026-01-15"),
      },
      [],
    );

    expect(timeline.length).toBeLessThanOrEqual(121);
  });
});
