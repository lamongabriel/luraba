import type { SafeToSpendCurrency } from "@luraba/contracts";

export type PurchaseMode = "cash" | "card";

export interface WhatIfResult {
  /** What is left on the horizon the purchase lands on, after it. Null when that horizon has no income plan. */
  remaining: number | null;
  /** True when the purchase would leave that horizon below zero. */
  compromises: boolean;
}

/**
 * The effect of one purchase. Cash comes out of this month's left to spend; a card purchase is
 * billed next month, so it comes out of next month's left for the card.
 */
export function applyPurchase(
  group: Pick<SafeToSpendCurrency, "thisMonth" | "nextMonth">,
  amount: number,
  mode: PurchaseMode,
): WhatIfResult {
  const base = mode === "cash" ? group.thisMonth.leftToSpend : group.nextMonth.leftForCard;
  if (base === null) return { remaining: null, compromises: false };
  const remaining = base - amount;
  return { remaining, compromises: remaining < 0 };
}

/** Share of a goal's planned contribution already made this month, 0 to 100. */
export function contributionPercent(planned: number, contributed: number): number {
  if (planned <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((contributed / planned) * 100)));
}
