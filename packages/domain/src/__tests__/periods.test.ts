import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMonthRangeWithOpenCycles } from "../periods";

describe("getMonthRangeWithOpenCycles", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-13T15:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("is the calendar month when no card has an open cycle", () => {
    expect(getMonthRangeWithOpenCycles("UTC")).toEqual({
      dateFrom: "2026-11-01",
      dateTo: "2026-11-30",
    });
  });

  it("reaches back to the earliest open cycle start", () => {
    expect(getMonthRangeWithOpenCycles("UTC", ["2026-10-27", "2026-10-20"])).toEqual({
      dateFrom: "2026-10-20",
      dateTo: "2026-11-30",
    });
  });

  it("ignores a cycle that starts after the 1st", () => {
    expect(getMonthRangeWithOpenCycles("UTC", ["2026-11-08"]).dateFrom).toBe("2026-11-01");
  });
});
