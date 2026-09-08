import { describe, expect, it } from "vitest";

import { createEditAccountFormSchema } from "../create-edit-account-form.schema";

const common = {
  currencyCode: "BRL",
  institutionDomain: "",
  institutionName: "",
  name: "Account",
  notes: "",
};

describe("createEditAccountFormSchema", () => {
  it.each([
    {
      type: "cash",
      subtype: "checking",
    },
    { type: "investment", subtype: "brokerage" },
    { type: "crypto", subtype: "wallet", walletAddress: "", network: "" },
    {
      type: "property",
      subtype: "house",
      addressLine1: "",
      addressLine2: "",
      city: "",
      region: "",
      postalCode: "",
      countryCode: "",
      areaUnit: "",
    },
    {
      type: "vehicle",
      subtype: "car",
      make: "Toyota",
      model: "Corolla",
      trim: "",
      vin: "",
      licensePlate: "",
      mileageUnit: "",
    },
    {
      type: "loan",
      subtype: "personal",
      interestRateType: "",
      startDate: "",
      maturityDate: "",
      paymentFrequency: "",
      securedAssetAccountId: "",
    },
    { type: "other_asset", subtype: "other" },
    { type: "other_liability", subtype: "other" },
  ] as const)("accepts the $type account branch", (profile) => {
    expect(
      createEditAccountFormSchema.safeParse({
        ...common,
        ...profile,
        openingBalance: undefined,
        balanceAsOfDate: "",
      }).success,
    ).toBe(true);
  });

  it("rejects credit card values because cards use a dedicated form", () => {
    expect(
      createEditAccountFormSchema.safeParse({
        ...common,
        type: "credit_card",
        subtype: "credit",
      }).success,
    ).toBe(false);
  });

  it("returns a field-level message for an invalid institution domain", () => {
    const result = createEditAccountFormSchema.safeParse({
      ...common,
      institutionDomain: "not-a-domain",
      type: "cash",
      subtype: "checking",
      openingBalance: undefined,
      balanceAsOfDate: "",
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.issues).toContainEqual(
      expect.objectContaining({
        path: ["institutionDomain"],
        message: "Enter a valid institution domain, such as example.com.",
      }),
    );
  });

  it("accepts a full institution URL and an omitted domain", () => {
    const account = {
      ...common,
      type: "cash" as const,
      subtype: "checking" as const,
      openingBalance: undefined,
      balanceAsOfDate: "",
    };

    expect(
      createEditAccountFormSchema.safeParse({
        ...account,
        institutionDomain: "https://www.example.com/cards",
      }).success,
    ).toBe(true);
    expect(createEditAccountFormSchema.safeParse(account).success).toBe(true);
  });

  it("uses the selected discriminator and discards stale branch fields", () => {
    const parsed = createEditAccountFormSchema.parse({
      ...common,
      type: "cash",
      subtype: "checking",
      openingBalance: undefined,
      balanceAsOfDate: "",
      make: "Stale vehicle make",
    });

    expect(parsed.type).toBe("cash");
    expect("make" in parsed).toBe(false);
  });
});
