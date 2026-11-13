import { describe, expect, it } from "vitest";

import { goalPace } from "../goal-pace";

const base = {
  targetAmount: 1_000_00,
  startDate: "2026-01-01",
  targetDate: "2026-12-31" as string | null,
  monthlyContribution: null as number | null,
  state: "on_track",
};

describe("goalPace", () => {
  it("is ahead when more is saved than a steady pace to the date", () => {
    const pace = goalPace({ ...base, saved: 700_00 }, "2026-07-01");
    expect(pace.status).toBe("ahead");
    expect(pace.expectedSaved).toBeGreaterThan(490_00);
    expect(pace.expectedSaved).toBeLessThan(510_00);
    expect(pace.expectedPercent).toBeCloseTo(50, 0);
    expect(pace.difference).toBeGreaterThan(0);
    expect(pace.daysDifference).toBeGreaterThan(0);
  });

  it("is behind when less is saved than the pace", () => {
    const pace = goalPace({ ...base, saved: 100_00 }, "2026-07-01");
    expect(pace.status).toBe("behind");
    expect(pace.daysDifference).toBeLessThan(0);
  });

  it("is on pace within two percent of the target", () => {
    expect(goalPace({ ...base, saved: 505_00 }, "2026-07-01").status).toBe("on_pace");
  });

  it("is behind once the date has passed without reaching the target", () => {
    const pace = goalPace({ ...base, saved: 900_00 }, "2027-02-01");
    expect(pace.status).toBe("behind");
    expect(pace.expectedPercent).toBe(100);
  });

  it("uses the monthly plan when there is no date", () => {
    const goal = { ...base, targetDate: null, monthlyContribution: 100_00 };
    expect(goalPace({ ...goal, saved: 400_00 }, "2026-03-15").status).toBe("ahead");
    expect(goalPace({ ...goal, saved: 100_00 }, "2026-03-15").status).toBe("behind");
  });

  it("has no pace without a date or plan, when paused, and is achieved at the target", () => {
    expect(goalPace({ ...base, targetDate: null, saved: 10 }, "2026-03-15").status).toBe("none");
    expect(goalPace({ ...base, state: "paused", saved: 10 }, "2026-03-15").status).toBe("none");
    expect(goalPace({ ...base, saved: 1_000_00 }, "2026-03-15").status).toBe("achieved");
  });

  it("projects the finish date from the current rate", () => {
    const pace = goalPace({ ...base, saved: 500_00 }, "2026-07-01");
    expect(pace.projectedDate).toMatch(/^2026-/);
  });
});
