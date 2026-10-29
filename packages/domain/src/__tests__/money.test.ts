import { describe, expect, it } from "vitest";
import { addMinorUnits, fromMinorUnits, subtractMinorUnits, toMinorUnits } from "../money";

describe("money primitives", () => {
  it("converts amounts using currency precision", () => {
    expect(toMinorUnits(12.34, 2)).toBe(1234);
    expect(fromMinorUnits(1234, 2)).toBe(12.34);
  });

  it("keeps arithmetic in integer minor units", () => {
    expect(addMinorUnits(100, 25)).toBe(125);
    expect(subtractMinorUnits(100, 25)).toBe(75);
  });
});

import { formatDecimalAmount, formatMoney } from "../money";

describe("formatMoney", () => {
  it("formats minor units with the currency's own precision", () => {
    expect(formatMoney(123456, "USD")).toBe("$1,234.56");
    expect(formatMoney(1500, "JPY")).toBe("¥1,500");
    expect(formatMoney(1050, "BRL", { locale: "pt-BR" })).toMatch(/10,50/u);
  });

  it("falls back for unknown currency codes", () => {
    expect(formatMoney(1050, "??")).toBe("10.50 ??");
  });

  it("writes plain decimals for machine output", () => {
    expect(formatDecimalAmount(1234)).toBe("12.34");
    expect(formatDecimalAmount(5, 2)).toBe("0.05");
  });
});
