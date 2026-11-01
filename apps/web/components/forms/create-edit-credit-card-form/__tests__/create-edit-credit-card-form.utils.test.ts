import { describe, expect, it } from "vitest";

import { createEditCreditCardFormSchema } from "../create-edit-credit-card-form.schema";
import {
  buildCreateCreditCardPayload,
  buildUpdateCreditCardPayload,
  getCreateEditCreditCardDefaultValues,
} from "../create-edit-credit-card-form.utils";

const values = {
  brand: "Visa" as const,
  closingDay: 25,
  color: "#164e63",
  creditLimitAmount: 1500,
  currencyCode: "USD",
  dueDay: 5,
  institutionDomain: "northstar.example",
  institutionName: "Northstar Bank",
  last4: "4242",
  name: "Northstar Rewards",
  notes: "Travel purchases",
  ownerAccountId: "11111111-1111-4111-8111-111111111111",
};

describe("credit card form payload helpers", () => {
  it("starts empty when a legacy card has no limit, and defaults to dark gray", () => {
    const defaults = getCreateEditCreditCardDefaultValues("USD");
    expect(defaults.color).toBe("#3f3f46");
    expect(defaults.creditLimitAmount).toBe("");
  });

  it("requires a positive credit limit", () => {
    const parse = (creditLimitAmount: number | "") =>
      createEditCreditCardFormSchema.safeParse({ ...values, creditLimitAmount }).success;

    expect(parse("")).toBe(false);
    expect(parse(0)).toBe(false);
    expect(parse(1500)).toBe(true);
  });

  it("sends the owner account and omits derived currency on create", () => {
    expect(buildCreateCreditCardPayload(values, 2)).toEqual({
      brand: "Visa",
      closingDay: 25,
      color: "#164e63",
      creditLimitAmount: 150_000,
      dueDay: 5,
      institutionDomain: "northstar.example",
      institutionName: "Northstar Bank",
      last4: "4242",
      name: "Northstar Rewards",
      notes: "Travel purchases",
      ownerAccountId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("does not send immutable ownership or currency on update", () => {
    const payload = buildUpdateCreditCardPayload(values, 2);

    expect(payload).toMatchObject({
      brand: "Visa",
      creditLimitAmount: 150_000,
      name: "Northstar Rewards",
    });
    expect(payload).not.toHaveProperty("ownerAccountId");
    expect(payload).not.toHaveProperty("currencyCode");
  });
});
