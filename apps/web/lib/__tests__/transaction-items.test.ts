import { describe, expect, it } from "vitest";

import { itemsExceedTotal, itemsTotalMinor, remainingToAllocate } from "../transaction-items";

describe("transaction items", () => {
  it("sums quantity x price in minor units", () => {
    expect(
      itemsTotalMinor(
        [
          { quantity: 2, unitPrice: 15.5 },
          { quantity: 1, unitPrice: 0.99 },
        ],
        2,
      ),
    ).toBe(3199);
  });

  it("ignores blank rows", () => {
    expect(itemsTotalMinor([{ quantity: 1, unitPrice: "" }], 2)).toBe(0);
  });

  it("reports what is left to allocate", () => {
    expect(remainingToAllocate(5000, 3199)).toBe(1801);
    expect(remainingToAllocate(5000, 5000)).toBe(0);
  });

  it("flags items above the transaction total", () => {
    expect(itemsExceedTotal(5000, 5001)).toBe(true);
    expect(itemsExceedTotal(5000, 5000)).toBe(false);
  });
});
