import { describe, expect, it } from "vitest";
import {
  buildLimitBreakdown,
  classifyCycleForLimit,
  pickDefaultInvoiceMonth,
  sumLimitBreakdowns,
} from "../credit-cards.js";

const today = "2026-10-29";
const cycle = (periodStart: string, closingDate: string, remainingAmount: number) => ({
  periodStart,
  closingDate,
  remainingAmount,
});

describe("classifyCycleForLimit", () => {
  it("treats the closing day itself as still open", () => {
    expect(classifyCycleForLimit(cycle("2026-10-01", "2026-10-29", 0), today)).toBe("open");
    expect(classifyCycleForLimit(cycle("2026-09-01", "2026-09-28", 0), today)).toBe("closed");
    expect(classifyCycleForLimit(cycle("2026-10-30", "2026-11-28", 0), today)).toBe("future");
  });
});

describe("buildLimitBreakdown", () => {
  const cycles = [
    cycle("2026-09-29", "2026-10-28", 69_593),
    cycle("2026-10-29", "2026-11-28", 54_573),
    cycle("2026-11-29", "2026-12-28", 54_573),
    cycle("2026-12-29", "2027-01-28", 54_573),
    cycle("2026-08-29", "2026-09-28", 0),
  ];

  it("splits what is owed into closed, open and future invoices", () => {
    expect(buildLimitBreakdown(1_171_000, cycles, today)).toEqual({
      limit: 1_171_000,
      closedInvoice: 69_593,
      openInvoice: 54_573,
      futureInvoices: 109_146,
      used: 233_312,
      available: 937_688,
    });
  });

  it("never reports a negative available amount", () => {
    expect(buildLimitBreakdown(100_000, cycles, today).available).toBe(0);
  });

  it("has no limit or availability for an unlimited card", () => {
    const breakdown = buildLimitBreakdown(-1, cycles, today);
    expect(breakdown.limit).toBeNull();
    expect(breakdown.available).toBeNull();
    expect(breakdown.used).toBe(233_312);
  });
});

describe("sumLimitBreakdowns", () => {
  it("adds limited cards and keeps unlimited usage out of the limit", () => {
    const a = buildLimitBreakdown(100_000, [cycle("2026-10-01", "2026-10-31", 20_000)], today);
    const b = buildLimitBreakdown(-1, [cycle("2026-10-01", "2026-10-31", 5_000)], today);
    expect(sumLimitBreakdowns([a, b])).toMatchObject({
      limit: 100_000,
      openInvoice: 25_000,
      used: 25_000,
      available: 80_000,
    });
  });

  it("is limitless when no card has a limit", () => {
    expect(sumLimitBreakdowns([buildLimitBreakdown(-1, [], today)]).limit).toBeNull();
  });
});

describe("pickDefaultInvoiceMonth", () => {
  it("skips the paid invoice and shows the open one, even though it is due next month", () => {
    expect(
      pickDefaultInvoiceMonth(
        [
          { dueDate: "2026-10-17", displayStatus: "paid" },
          { dueDate: "2026-11-17", displayStatus: "current" },
          { dueDate: "2026-12-17", displayStatus: "upcoming" },
        ],
        "2026-10",
      ),
    ).toBe("2026-11");
  });

  it("prefers a closed unpaid or overdue invoice over the open one", () => {
    expect(
      pickDefaultInvoiceMonth(
        [
          { dueDate: "2026-11-05", displayStatus: "due" },
          { dueDate: "2026-12-05", displayStatus: "current" },
        ],
        "2026-10",
      ),
    ).toBe("2026-11");
  });

  it("falls back when no invoice is active", () => {
    expect(pickDefaultInvoiceMonth([], "2026-10")).toBe("2026-10");
  });
});
