import { describe, expect, it } from "vitest";

import {
  formatAge,
  formatPercent,
  formatQuantity,
  formatSignedPercent,
  formatUnitPrice,
  fractionToPercentText,
  percentToFraction,
  shiftDecimal,
  signOf,
} from "../format";

describe("investment formatting", () => {
  it("formats percent values that are already in percent units", () => {
    expect(formatPercent("12.5")).toBe("12.50%");
    expect(formatPercent(null)).toBe("—");
    expect(formatSignedPercent("1.25")).toBe("+1.25%");
    expect(formatSignedPercent("-0.5")).toBe("-0.50%");
    expect(formatSignedPercent("0")).toBe("0.00%");
  });

  it("keeps fractional quantities and unit prices", () => {
    expect(formatQuantity("0.12345678")).toBe("0.12345678");
    expect(formatQuantity("1500")).toBe("1,500");
    expect(formatUnitPrice("12.3456", "USD")).toBe("$12.3456");
    expect(formatUnitPrice("10", "USD")).toBe("$10.00");
  });

  it("classifies signs", () => {
    expect(signOf("3")).toBe("positive");
    expect(signOf(-1)).toBe("negative");
    expect(signOf("0")).toBe("zero");
  });

  it("describes how old a price is", () => {
    const now = Date.parse("2026-01-01T12:00:00Z");
    expect(formatAge("2026-01-01T11:59:40Z", now)).toBe("just now");
    expect(formatAge("2026-01-01T11:55:00Z", now)).toBe("5 min ago");
    expect(formatAge("2026-01-01T09:00:00Z", now)).toBe("3 h ago");
    expect(formatAge("2025-12-30T12:00:00Z", now)).toBe("2 d ago");
    expect(formatAge(null, now)).toBe("never");
  });

  it("shifts decimals exactly", () => {
    expect(shiftDecimal("110", -2)).toBe("1.1");
    expect(shiftDecimal("12", -2)).toBe("0.12");
    expect(shiftDecimal("0.5", -2)).toBe("0.005");
    expect(shiftDecimal("1.1", 2)).toBe("110");
    expect(shiftDecimal("0.125", 2)).toBe("12.5");
    expect(shiftDecimal("abc", 2)).toBe("");
    expect(percentToFraction("6")).toBe("0.06");
    expect(fractionToPercentText("0.06")).toBe("6");
  });
});
