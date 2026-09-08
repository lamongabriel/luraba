import { listPaymentMethodsQuerySchema } from "@luraba/contracts/payment-methods";
import { describe, expect, it } from "vitest";

describe("payment methods list query", () => {
  it("parses every column filter and rejects invalid input", () => {
    const query = listPaymentMethodsQuerySchema.parse({
      codes: "pix,cash",
      scopes: "system,household",
      currencyCode: "brl",
      hasCurrency: "true",
      createdAtFrom: "2025-01-01",
      createdAtTo: "2025-12-31",
      updatedAtFrom: "2025-01-01",
      updatedAtTo: "2025-12-31",
    });

    expect(query.codes).toEqual(["pix", "cash"]);
    expect(query.currencyCode).toBe("BRL");
    expect(listPaymentMethodsQuerySchema.safeParse({ scopes: "private" }).success).toBe(false);
    expect(listPaymentMethodsQuerySchema.safeParse({ unknown: true }).success).toBe(false);
  });
});
