import { listCurrenciesQuerySchema } from "@luraba/contracts/currencies";
import { describe, expect, it } from "vitest";

describe("currencies list query", () => {
  it("parses column filters and rejects invalid input", () => {
    const query = listCurrenciesQuerySchema.parse({
      codes: "brl,usd",
      precisions: "0,2",
    });

    expect(query.codes).toEqual(["BRL", "USD"]);
    expect(query.precisions).toEqual([0, 2]);
    expect(listCurrenciesQuerySchema.safeParse({ precisions: 9 }).success).toBe(false);
    expect(listCurrenciesQuerySchema.safeParse({ unknown: true }).success).toBe(false);
  });
});
