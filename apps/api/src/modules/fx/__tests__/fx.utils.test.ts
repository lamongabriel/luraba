import { describe, expect, it } from "vitest";
import { toFxFraction } from "../fx.utils";

describe("toFxFraction", () => {
  it("normalizes noisy floating-point provider rates into sane decimal fractions", () => {
    expect(toFxFraction(1.1190849999999999)).toEqual({
      rateNumerator: 223817,
      rateDenominator: 200000,
    });
  });

  it("reduces exact decimal rates to their simplest fraction", () => {
    expect(toFxFraction("5.2500")).toEqual({
      rateNumerator: 21,
      rateDenominator: 4,
    });
  });
});
