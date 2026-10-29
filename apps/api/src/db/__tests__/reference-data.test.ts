import { currenciesTable } from "@luraba/db/schemas/currencies.schema";
import { paymentMethodsTable } from "@luraba/db/schemas/payment-methods.schema";
import { and, eq, isNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";

describe("required reference data", () => {
  it("is installed by migrations and survives test database resets", async () => {
    const currencies = await db.select({ code: currenciesTable.code }).from(currenciesTable);
    const paymentMethods = await db
      .select({ code: paymentMethodsTable.code })
      .from(paymentMethodsTable)
      .where(
        and(
          isNull(paymentMethodsTable.householdId),
          eq(paymentMethodsTable.translationKey, "paymentMethods.system.cash"),
        ),
      );

    expect(currencies).toHaveLength(19);
    expect(paymentMethods).toEqual([{ code: "cash" }]);
  });
});
