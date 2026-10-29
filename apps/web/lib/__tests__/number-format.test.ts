import { describe, expect, it } from "vitest";
import {
  maskDecimalString,
  toCanonicalString,
  unmaskDecimalString,
  unmaskMoneyString,
} from "../number-format";

describe("number masks", () => {
  it("pushes money digits in from the right", () => {
    expect(unmaskMoneyString("1", { precision: 2 })).toBe("0.01");
    expect(unmaskMoneyString("0.012", { precision: 2 })).toBe("0.12");
    expect(unmaskMoneyString("1,234.56", { precision: 2 })).toBe("1234.56");
    expect(unmaskMoneyString("1234567", { precision: 0 })).toBe("1234567");
    expect(unmaskMoneyString("", { precision: 2 })).toBe("");
  });

  it("keeps a sign only when negatives are allowed", () => {
    expect(unmaskMoneyString("-150", { precision: 2, allowNegative: true })).toBe("-1.50");
    expect(unmaskMoneyString("-150", { precision: 2 })).toBe("1.50");
  });

  it("groups thousands for display", () => {
    expect(maskDecimalString("1234567.5")).toBe("1,234,567.5");
    expect(maskDecimalString("-1234.00")).toBe("-1,234.00");
    expect(maskDecimalString("1234", "pt-BR")).toBe("1.234");
    expect(maskDecimalString("")).toBe("");
  });

  it("reads typed decimals and caps fraction digits", () => {
    expect(unmaskDecimalString("1,234.567", { decimals: 2 })).toBe("1234.56");
    expect(unmaskDecimalString("12.", { decimals: 2 })).toBe("12.");
    expect(unmaskDecimalString("abc", { decimals: 2 })).toBe("");
    expect(unmaskDecimalString("12.5", { decimals: 0 })).toBe("125");
    expect(unmaskDecimalString("007", { decimals: 0 })).toBe("7");
  });

  it("normalizes values to canonical strings", () => {
    expect(toCanonicalString(12.5)).toBe("12.5");
    expect(toCanonicalString(null)).toBe("");
    expect(toCanonicalString(Number.NaN)).toBe("");
  });
});
