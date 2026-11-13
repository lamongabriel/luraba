import { describe, expect, it } from "vitest";
import { resolveInstallmentPlan, splitInstallmentAmounts } from "../installments.js";

describe("splitInstallmentAmounts", () => {
  it("puts the leftover cents on the last installment by default", () => {
    expect(splitInstallmentAmounts(17028, 5)).toEqual([3405, 3405, 3405, 3405, 3408]);
  });
  it("can put them on the first one", () => {
    expect(splitInstallmentAmounts(17028, 5, "remainder_first")).toEqual([
      3408, 3405, 3405, 3405, 3405,
    ]);
  });
  it("can round every installment up", () => {
    expect(splitInstallmentAmounts(17028, 5, "round_up_all")).toEqual([
      3406, 3406, 3406, 3406, 3406,
    ]);
  });
});

describe("resolveInstallmentPlan", () => {
  it("uses a custom list as is and sums it", () => {
    const plan = resolveInstallmentPlan({ installmentAmounts: [3406, 3406, 3406, 3406, 3406] });
    expect(plan).toEqual({ ok: true, amounts: [3406, 3406, 3406, 3406, 3406], total: 17030 });
  });
  it("repeats a single installment amount", () => {
    expect(resolveInstallmentPlan({ installmentAmount: 3406, installmentCount: 5 })).toMatchObject({
      amounts: [3406, 3406, 3406, 3406, 3406],
      total: 17030,
    });
  });
  it("derives the total for round_up_all", () => {
    expect(
      resolveInstallmentPlan({ amount: 17028, installmentCount: 5, roundingMode: "round_up_all" }),
    ).toMatchObject({
      total: 17030,
    });
  });
  it("rejects an amount that disagrees with the list", () => {
    const plan = resolveInstallmentPlan({
      amount: 17028,
      installmentAmounts: [3406, 3406, 3406, 3406, 3406],
    });
    expect(plan.ok).toBe(false);
  });
  it("rejects a count that disagrees with the list, zero amounts and more than 60", () => {
    expect(resolveInstallmentPlan({ installmentAmounts: [100, 100], installmentCount: 3 }).ok).toBe(
      false,
    );
    expect(resolveInstallmentPlan({ installmentAmounts: [100, 0] }).ok).toBe(false);
    expect(resolveInstallmentPlan({ amount: 100000, installmentCount: 61 }).ok).toBe(false);
  });
  it("keeps today's split when only amount and count are given", () => {
    expect(resolveInstallmentPlan({ amount: 10000, installmentCount: 3 })).toMatchObject({
      amounts: [3333, 3333, 3334],
      total: 10000,
    });
  });
});
