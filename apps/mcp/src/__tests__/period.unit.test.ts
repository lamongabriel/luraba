import { describe, expect, it } from "vitest";
import { majorToMinor, toMoney } from "../format/money.js";
import { monthKey, periodRange } from "../format/period.js";

describe("periods", () => {
  it("computes named ranges", () => {
    expect(periodRange("2026-11-15", { period: "this_month" })).toEqual({
      dateFrom: "2026-11-01",
      dateTo: "2026-11-15",
    });
    expect(periodRange("2026-01-10", { period: "last_month" })).toEqual({
      dateFrom: "2025-12-01",
      dateTo: "2025-12-31",
    });
    expect(periodRange("2026-03-10", { period: "last_30_days" })).toEqual({
      dateFrom: "2026-02-09",
      dateTo: "2026-03-10",
    });
    expect(periodRange("2026-03-10", { period: "this_year" }).dateFrom).toBe("2026-01-01");
    expect(
      periodRange("2026-03-10", { period: "custom", dateFrom: "2026-01-05", dateTo: "2026-01-20" }),
    ).toEqual({ dateFrom: "2026-01-05", dateTo: "2026-01-20" });
  });

  it("builds month keys", () => {
    expect(monthKey("2026-12-31")).toBe("2026-12");
    expect(monthKey("2026-12-31", 1)).toBe("2027-01");
  });
});

describe("money", () => {
  it("converts between major and minor units", () => {
    expect(majorToMinor(12.5, "USD")).toBe(1250);
    expect(majorToMinor(0.1 + 0.2, "USD")).toBe(30);
    expect(toMoney(1250, "USD")).toMatchObject({ amount: 12.5, currency: "USD" });
  });
});
