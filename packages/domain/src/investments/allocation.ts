import { Dec, ZERO } from "./decimal.js";

export type AllocationSlice = { key: string; value: Dec; percent: Dec };

export function allocate(items: readonly { key: string; value: Dec }[]): AllocationSlice[] {
  const grouped = new Map<string, Dec>();
  for (const item of items) {
    grouped.set(item.key, (grouped.get(item.key) ?? ZERO).plus(item.value));
  }
  const total = [...grouped.values()].reduce((acc, value) => acc.plus(value), ZERO);
  return [...grouped.entries()]
    .map(([key, value]) => ({
      key,
      value,
      percent: total.isZero() ? ZERO : value.div(total).mul(100),
    }))
    .sort((a, b) => b.value.comparedTo(a.value));
}

export type RebalanceRow = {
  key: string;
  value: Dec;
  targetPercent: Dec;
  currentPercent: Dec;
  /** Current minus target, in percentage points. */
  drift: Dec;
  /** Amount to add (buy) to this bucket from the new contribution. */
  buy: Dec;
};

/**
 * How to split a new contribution to move toward the targets without selling: each bucket's gap to
 * its post-contribution target is filled proportionally; any remainder follows the target weights.
 */
export function rebalanceWithContribution(
  current: readonly { key: string; value: Dec }[],
  targets: readonly { key: string; percent: Dec }[],
  contribution: Dec,
): RebalanceRow[] {
  const keys = [...new Set([...current.map((c) => c.key), ...targets.map((t) => t.key)])];
  const valueFor = (key: string): Dec => current.find((c) => c.key === key)?.value ?? ZERO;
  const targetOf = (key: string): Dec => targets.find((t) => t.key === key)?.percent ?? ZERO;
  const total = current.reduce((acc, c) => acc.plus(c.value), ZERO);
  const newTotal = total.plus(contribution);

  const gaps = keys.map((key) =>
    Dec.max(newTotal.mul(targetOf(key)).div(100).minus(valueFor(key)), ZERO),
  );
  const gapSum = gaps.reduce((acc, gap) => acc.plus(gap), ZERO);
  const targetSum = keys.reduce((acc, key) => acc.plus(targetOf(key)), ZERO);

  return keys.map((key, index) => {
    const gap = gaps[index] as Dec;
    let buy = ZERO;
    if (gapSum.gt(0)) {
      buy = gapSum.lte(contribution) ? gap : gap.mul(contribution).div(gapSum);
      if (gapSum.lt(contribution) && targetSum.gt(0)) {
        buy = buy.plus(contribution.minus(gapSum).mul(targetOf(key)).div(targetSum));
      }
    }
    return {
      key,
      value: valueFor(key),
      targetPercent: targetOf(key),
      currentPercent: total.isZero() ? ZERO : valueFor(key).div(total).mul(100),
      drift: (total.isZero() ? ZERO : valueFor(key).div(total).mul(100)).minus(targetOf(key)),
      buy,
    };
  });
}
