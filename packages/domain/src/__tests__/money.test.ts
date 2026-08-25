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
