/**
 * How a card purchase is split into installments. Card issuers and stores round differently, so a purchase can
 * be created with the amounts the invoice shows: the list of installment amounts is the source of truth and the
 * purchase total is their sum. All amounts are minor units (cents).
 */

export const MAX_INSTALLMENTS = 60;

export const INSTALLMENT_ROUNDING_MODES = [
  "remainder_last",
  "remainder_first",
  "round_up_all",
] as const;
export type InstallmentRoundingMode = (typeof INSTALLMENT_ROUNDING_MODES)[number];

/**
 * Splits `totalAmount` into `installmentCount` parts.
 * - `remainder_last` (default): every part is `floor(total / count)`, the last takes the leftover cents.
 * - `remainder_first`: same, the first takes the leftover cents.
 * - `round_up_all`: every part is `ceil(total / count)`; the parts then add up to a little more than the total.
 */
export function splitInstallmentAmounts(
  totalAmount: number,
  installmentCount: number,
  mode: InstallmentRoundingMode = "remainder_last",
): number[] {
  if (!Number.isInteger(installmentCount) || installmentCount < 1) return [];
  if (mode === "round_up_all") {
    return Array.from({ length: installmentCount }, () =>
      Math.ceil(totalAmount / installmentCount),
    );
  }
  const baseAmount = Math.floor(totalAmount / installmentCount);
  const remainder = totalAmount - baseAmount * installmentCount;
  const remainderIndex = mode === "remainder_first" ? 0 : installmentCount - 1;
  return Array.from({ length: installmentCount }, (_value, index) =>
    index === remainderIndex ? baseAmount + remainder : baseAmount,
  );
}

export type InstallmentPlanInput = {
  /** The purchase total. Optional when the amounts are given; when both are given they must agree. */
  amount?: number | undefined;
  installmentCount?: number | undefined;
  /** Every installment's exact amount; its length is the count. */
  installmentAmounts?: number[] | undefined;
  /** Every installment has this amount (count from `installmentCount`). */
  installmentAmount?: number | undefined;
  roundingMode?: InstallmentRoundingMode | undefined;
};

export type InstallmentPlan =
  | { ok: true; amounts: number[]; total: number }
  | { ok: false; error: string };

/**
 * Resolves what the caller asked for into the final list of installment amounts and the purchase total (their sum).
 * Pass `fallbackCount` (an existing purchase's count) for updates that do not repeat the count.
 */
export function resolveInstallmentPlan(
  input: InstallmentPlanInput,
  fallbackCount = 1,
): InstallmentPlan {
  const fail = (error: string): InstallmentPlan => ({ ok: false, error });
  const { amount, installmentAmounts, installmentAmount, roundingMode } = input;
  if (installmentAmounts && (installmentAmount !== undefined || roundingMode)) {
    return fail(
      "Send installmentAmounts on its own, or installmentAmount, or roundingMode, not several",
    );
  }
  if (installmentAmount !== undefined && roundingMode) {
    return fail("installmentAmount and roundingMode cannot be combined");
  }

  let amounts: number[];
  if (installmentAmounts) {
    if (
      input.installmentCount !== undefined &&
      input.installmentCount !== installmentAmounts.length
    ) {
      return fail(
        `installmentCount (${input.installmentCount}) does not match the ${installmentAmounts.length} installmentAmounts`,
      );
    }
    amounts = [...installmentAmounts];
  } else {
    const count = input.installmentCount ?? fallbackCount;
    if (!Number.isInteger(count) || count < 1 || count > MAX_INSTALLMENTS) {
      return fail(`Installments must be between 1 and ${MAX_INSTALLMENTS}`);
    }
    if (installmentAmount !== undefined) {
      amounts = Array.from({ length: count }, () => installmentAmount);
    } else {
      if (amount === undefined)
        return fail("Send the purchase amount, installmentAmounts or installmentAmount");
      amounts = splitInstallmentAmounts(amount, count, roundingMode ?? "remainder_last");
    }
  }

  if (amounts.length < 1 || amounts.length > MAX_INSTALLMENTS) {
    return fail(`Installments must be between 1 and ${MAX_INSTALLMENTS}`);
  }
  if (amounts.some((value) => !Number.isInteger(value) || value <= 0)) {
    return fail("Every installment amount must be greater than zero");
  }
  const total = amounts.reduce((sum, value) => sum + value, 0);
  // With a rounding mode the total is derived (round_up_all adds cents), so only exact lists must match `amount`.
  if (
    amount !== undefined &&
    (installmentAmounts || installmentAmount !== undefined) &&
    amount !== total
  ) {
    return fail(
      `The installments add up to ${total} (minor units) but amount is ${amount}; the installments are the source of truth, so send a matching amount or leave it out`,
    );
  }
  return { ok: true, amounts, total };
}
