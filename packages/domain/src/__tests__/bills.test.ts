import { describe, expect, it } from "vitest";
import { daysUntilDue, getBillDueDates } from "../bills.js";
import { formatISODate, parseISODate } from "../date.js";

const iso = (dates: { dueDate: Date }[]) => dates.map(({ dueDate }) => formatISODate(dueDate));

describe("getBillDueDates", () => {
  it("starts a monthly bill on its due day, not on the start date", () => {
    const dates = getBillDueDates(
      { frequency: "monthly", startDate: "2026-01-10", dayOfMonth: 28 },
      "2026-04-30",
    );

    expect(iso(dates)).toEqual(["2026-01-28", "2026-02-28", "2026-03-28", "2026-04-28"]);
  });

  it("moves to next month when the due day already passed in the start month", () => {
    const dates = getBillDueDates(
      { frequency: "monthly", startDate: "2026-01-30", dayOfMonth: 5 },
      "2026-03-31",
    );

    expect(iso(dates)).toEqual(["2026-02-05", "2026-03-05"]);
  });

  it("clamps day 31 to the end of shorter months", () => {
    const dates = getBillDueDates(
      { frequency: "monthly", startDate: "2026-01-01", dayOfMonth: 31 },
      "2026-04-30",
    );

    expect(iso(dates)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });

  it("numbers every payment of a finite plan regardless of the horizon", () => {
    const dates = getBillDueDates(
      { frequency: "monthly", startDate: "2026-01-01", dayOfMonth: 1, installmentCount: 48 },
      "2026-01-31",
    );

    expect(dates).toHaveLength(48);
    expect(dates[0]?.installmentNumber).toBe(1);
    expect(dates[47]?.installmentNumber).toBe(48);
    expect(formatISODate(dates[47]?.dueDate as Date)).toBe("2029-12-01");
  });

  it("stops open-ended bills at the end date", () => {
    const dates = getBillDueDates(
      { frequency: "monthly", startDate: "2026-01-01", dayOfMonth: 10, endDate: "2026-03-15" },
      "2030-01-01",
    );

    expect(iso(dates)).toEqual(["2026-01-10", "2026-02-10", "2026-03-10"]);
    expect(dates.every((date) => date.installmentNumber === null)).toBe(true);
  });

  it("supports weekly bills on a chosen weekday", () => {
    const dates = getBillDueDates(
      { frequency: "weekly", startDate: "2026-01-01", dayOfWeek: 1 },
      "2026-01-20",
    );

    expect(iso(dates)).toEqual(["2026-01-05", "2026-01-12", "2026-01-19"]);
  });
});

describe("daysUntilDue", () => {
  it("is negative for overdue dates", () => {
    expect(daysUntilDue(parseISODate("2026-01-10"), parseISODate("2026-01-13"))).toBe(-3);
    expect(daysUntilDue(parseISODate("2026-01-13"), parseISODate("2026-01-10"))).toBe(3);
  });
});
