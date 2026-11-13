import { describe, expect, it } from "vitest";

import { isMonthOutOfRange, MONTH_PRESETS } from "../month-select";

describe("isMonthOutOfRange", () => {
  it("is false without limits", () => {
    expect(isMonthOutOfRange("2026-11")).toBe(false);
  });

  it("checks both ends", () => {
    expect(isMonthOutOfRange("2023-12", "2024-01", "2027-01")).toBe(true);
    expect(isMonthOutOfRange("2027-02", "2024-01", "2027-01")).toBe(true);
    expect(isMonthOutOfRange("2024-01", "2024-01", "2027-01")).toBe(false);
  });
});

describe("MONTH_PRESETS", () => {
  it("offers last, this and next month", () => {
    expect(MONTH_PRESETS.map((preset) => preset.offset).sort()).toEqual([-1, 0, 1]);
  });
});
