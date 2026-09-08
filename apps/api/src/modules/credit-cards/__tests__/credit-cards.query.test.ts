import {
  listCreditCardCyclesQuerySchema,
  listCreditCardsQuerySchema,
} from "@luraba/contracts/credit-cards";
import { describe, expect, it } from "vitest";

describe("credit card list queries", () => {
  it("parses every card filter and rejects invalid ranges", () => {
    const query = listCreditCardsQuerySchema.parse({
      brands: "Visa,Mastercard",
      currencyCodes: "BRL,USD",
      ownerAccountIds: "1456d4ee-2f8d-4cec-92be-a780d54312c2",
      closingDays: "5,25",
      dueDays: "10,31",
      balanceMin: 0,
      balanceMax: 10000,
      creditLimitMin: 100,
      creditLimitMax: 20000,
      hasCreditLimit: "true",
      createdAtFrom: "2025-01-01",
      createdAtTo: "2025-12-31",
      updatedAtFrom: "2025-01-01",
      updatedAtTo: "2025-12-31",
    });

    expect(query.closingDays).toEqual([5, 25]);
    expect(query.hasCreditLimit).toBe(true);
    expect(
      listCreditCardsQuerySchema.safeParse({
        creditLimitMin: 2,
        creditLimitMax: 1,
      }).success,
    ).toBe(false);
  });

  it("parses every cycle filter and rejects invalid ranges", () => {
    const query = listCreditCardCyclesQuerySchema.parse({
      scope: "all",
      statuses: "open,paid",
      displayStatuses: "current,due,paid",
      closingDateFrom: "2025-01-01",
      closingDateTo: "2025-12-31",
      dueDateFrom: "2025-01-01",
      dueDateTo: "2025-12-31",
      statementAmountMin: 0,
      statementAmountMax: 100,
      paidAmountMin: 0,
      paidAmountMax: 100,
      remainingAmountMin: 0,
      remainingAmountMax: 100,
    });

    expect(query.statuses).toEqual(["open", "paid"]);
    expect(
      listCreditCardCyclesQuerySchema.safeParse({
        remainingAmountMin: 2,
        remainingAmountMax: 1,
      }).success,
    ).toBe(false);
  });
});
