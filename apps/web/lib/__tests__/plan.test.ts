import { describe, expect, it } from "vitest";

import { applyPurchase, contributionPercent } from "../plan";

const group = (leftToSpend: number, leftForCard: number | null) =>
  ({
    thisMonth: { leftToSpend },
    nextMonth: { leftForCard },
  }) as Parameters<typeof applyPurchase>[0];

describe("applyPurchase", () => {
  it("takes a cash purchase out of this month and a card purchase out of next month", () => {
    expect(applyPurchase(group(100_000, 50_000), 30_000, "cash")).toEqual({
      remaining: 70_000,
      compromises: false,
    });
    expect(applyPurchase(group(100_000, 50_000), 60_000, "card")).toEqual({
      remaining: -10_000,
      compromises: true,
    });
  });

  it("has nothing to compare a card purchase to without an income plan", () => {
    expect(applyPurchase(group(100_000, null), 1, "card")).toEqual({
      remaining: null,
      compromises: false,
    });
  });
});

describe("contributionPercent", () => {
  it("is the share contributed, capped at 100", () => {
    expect(contributionPercent(1000, 250)).toBe(25);
    expect(contributionPercent(1000, 5000)).toBe(100);
    expect(contributionPercent(0, 500)).toBe(0);
  });
});
