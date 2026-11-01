import { describe, expect, it } from "vitest";

import {
  describeInstallments,
  INSTALLMENT_COUNT_OPTIONS,
  MAX_INSTALLMENTS,
  splitInstallments,
} from "../installments";

describe("splitInstallments", () => {
  it("splits evenly", () => {
    expect(splitInstallments(300_000, 5)).toEqual([60_000, 60_000, 60_000, 60_000, 60_000]);
  });

  it("gives the rounding remainder to the last installment, like the API", () => {
    const parts = splitInstallments(100_000, 3);
    expect(parts).toEqual([33_333, 33_333, 33_334]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100_000);
  });

  it("returns nothing for an invalid count", () => {
    expect(splitInstallments(1000, 0)).toEqual([]);
    expect(splitInstallments(1000, 1.5)).toEqual([]);
  });
});

describe("describeInstallments", () => {
  it("describes equal installments", () => {
    expect(describeInstallments(300_000, 5, "USD")).toBe("5 installments of $600.00");
  });

  it("mentions the different last installment", () => {
    expect(describeInstallments(100_000, 3, "USD")).toBe(
      "3 installments: 2 of $333.33 and 1 of $333.34",
    );
  });

  it("is empty for one payment or no amount", () => {
    expect(describeInstallments(300_000, 1, "USD")).toBe("");
    expect(describeInstallments(0, 5, "USD")).toBe("");
  });
});

describe("INSTALLMENT_COUNT_OPTIONS", () => {
  it("offers 1x to the maximum", () => {
    expect(INSTALLMENT_COUNT_OPTIONS[0]).toEqual({ value: "1", label: "1x" });
    expect(INSTALLMENT_COUNT_OPTIONS).toHaveLength(MAX_INSTALLMENTS);
  });
});
