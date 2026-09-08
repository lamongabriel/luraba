import { describe, expect, it } from "vitest";

import {
  buildCreateAccountPayload,
  getCreateEditAccountDefaultValues,
} from "../create-edit-account-form.utils";

describe("create account form helpers", () => {
  it("returns branch defaults for the selected account type", () => {
    expect(getCreateEditAccountDefaultValues("USD", "cash")).toMatchObject({
      type: "cash",
      subtype: "checking",
      currencyCode: "USD",
    });
  });

  it("builds a minor-unit cash account payload", () => {
    const payload = buildCreateAccountPayload(
      {
        balanceAsOfDate: "2026-01-31",
        currencyCode: "usd",
        institutionDomain: "https://www.chase.com/accounts",
        institutionName: "Chase",
        name: "Main checking",
        notes: "",
        openingBalance: 1250.5,
        type: "cash",
        subtype: "checking",
      },
      2,
    );

    expect(payload).toEqual({
      balanceAsOfDate: "2026-01-31",
      currencyCode: "USD",
      details: {
        kind: "cash",
        subtype: "checking",
      },
      institutionDomain: "https://www.chase.com/accounts",
      institutionName: "Chase",
      name: "Main checking",
      notes: undefined,
      openingBalance: 125_050,
      type: "cash",
    });
  });
});
