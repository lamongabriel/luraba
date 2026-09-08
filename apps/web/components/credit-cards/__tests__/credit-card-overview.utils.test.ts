import type { CreditCard, CreditCardCycle } from "@luraba/contracts";
import { describe, expect, it } from "vitest";

import {
  getCreditCardUtilization,
  getCurrentCreditCardCycle,
  getCycleAmount,
  getNextCreditCardCycle,
} from "../credit-card-overview.utils";

const card = {
  creditLimitAmount: 100_000,
  balance: 25_000,
} as CreditCard;

const cycles = [
  { id: "next", isCurrent: false, isNext: true, remainingAmount: 40_000 },
  { id: "current", isCurrent: true, isNext: false, remainingAmount: 10_000 },
] as CreditCardCycle[];

describe("credit card overview helpers", () => {
  it("calculates utilization as a bounded percentage", () => {
    expect(getCreditCardUtilization(card)).toBe(25);
    expect(getCreditCardUtilization({ ...card, balance: 125_000 })).toBe(100);
    expect(getCreditCardUtilization({ ...card, balance: -10_000 })).toBe(0);
  });

  it("does not calculate utilization without a credit limit", () => {
    expect(getCreditCardUtilization({ ...card, creditLimitAmount: 0 })).toBeNull();
  });

  it("selects the current and next cycles and reads their remaining amounts", () => {
    expect(getCurrentCreditCardCycle(cycles)?.id).toBe("current");
    expect(getNextCreditCardCycle(cycles)?.id).toBe("next");
    expect(getCycleAmount(getCurrentCreditCardCycle(cycles))).toBe(10_000);
    expect(getCycleAmount(undefined)).toBe(0);
  });
});
