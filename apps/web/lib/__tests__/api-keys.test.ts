import { addDays, formatISODate, now } from "@luraba/domain";
import { describe, expect, it } from "vitest";
import { expiryDateToDays } from "../api-keys";

describe("expiryDateToDays", () => {
  it("returns null without a date", () => {
    expect(expiryDateToDays("")).toBeNull();
    expect(expiryDateToDays(undefined)).toBeNull();
  });

  it("counts calendar days from today", () => {
    expect(expiryDateToDays(formatISODate(addDays(now(), 30)))).toBe(30);
  });

  it("never returns less than one day", () => {
    expect(expiryDateToDays(formatISODate(now()))).toBe(1);
  });
});
