import { describe, expect, it } from "vitest";
import { majorToMinor, majorToMoney, toMoney } from "../format/money.js";

describe("money formatting", () => {
  it("formats major units without dividing twice", () => {
    expect(majorToMoney(130, "BRL").formatted).toMatch(/130\.00/u);
    expect(majorToMoney(130, "BRL").amount).toBe(130);
    expect(majorToMoney(248.11, "USD").formatted).toBe("$248.11");
  });

  it("round-trips with minor units and respects zero-decimal currencies", () => {
    expect(toMoney(majorToMinor(12.5, "USD"), "USD").amount).toBe(12.5);
    expect(majorToMoney(500, "JPY").formatted).toBe("¥500");
  });
});

describe("create_transaction summary", () => {
  it("states the amount the agent sent, not a hundredth of it", async () => {
    const { connectTestClient } = await import("../testing/connect.js");
    const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
    const now = "2026-11-01T00:00:00.000Z";
    const account = {
      id: id(1),
      name: "Inter",
      institutionName: null,
      institutionDomain: null,
      institutionLogoUrl: null,
      imageUploadId: null,
      notes: null,
      classification: "asset",
      type: "cash",
      subtype: "checking",
      currencyCode: "BRL",
      createdByUserId: null,
      createdAt: now,
      updatedAt: now,
      balance: 0,
    };
    const row = {
      id: id(2),
      type: "expense",
      description: "Casio watch",
      amount: 13000,
      currencyCode: "BRL",
      toAmount: null,
      toCurrencyCode: null,
      accountId: id(1),
      accountName: "Inter",
      accountClassification: "asset",
      toAccountId: null,
      toAccountName: null,
      toAccountClassification: null,
      categoryId: null,
      merchantId: null,
      paymentMethodId: null,
      paymentMethodCode: "pix",
      paymentMethodName: "Pix",
      paymentMethodScope: null,
      paymentMethodTranslationKey: null,
      tags: [],
      includeInBudget: true,
      purchaseDate: "2026-11-01",
      postedDate: "2026-11-01",
      createdByUserId: null,
      createdAt: now,
      updatedAt: now,
      rowId: id(2),
      rowKind: "transaction",
      originType: "expense",
      creditCardId: null,
      purchaseId: null,
      paymentId: null,
      installmentId: null,
      installmentNumber: null,
      installmentCount: null,
    };
    const page = (data: unknown[]) => ({
      success: true,
      data,
      meta: {
        pagination: { page: 1, perPage: 100, totalCount: data.length, totalPages: 1 },
        summary: null,
      },
    });
    const fetch = async (input: string, init: RequestInit) => {
      const path = new URL(input).pathname.replace("/api/v1", "");
      if (init.method === "POST") return new Response(JSON.stringify({ success: true, data: row }));
      if (path === "/payment-methods")
        return new Response(
          JSON.stringify(
            page([
              {
                id: id(3),
                code: "pix",
                name: "Pix",
                scope: "system",
                currencyCode: null,
                translationKey: null,
                color: null,
                icon: null,
                createdAt: now,
                updatedAt: now,
              },
            ]),
          ),
        );
      if (path === "/accounts") return new Response(JSON.stringify(page([account])));
      if (path === "/auth/me")
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              user: {
                id: id(9),
                name: "John Doe",
                email: "john@example.com",
                preferences: { currency: "BRL", timezone: "UTC" },
              },
              household: null,
            },
          }),
        );
      return new Response(JSON.stringify(page([])));
    };
    const { call, close } = await connectTestClient({
      baseUrl: "http://api.test",
      apiKey: "lur_x",
      fetch,
    });
    const created = await call("create_transaction", {
      kind: "expense",
      description: "Casio watch",
      amount: 130,
      account: "Inter",
      paymentMethod: "pix",
      date: "2026-11-01",
    });
    expect(created.data.status, created.text).toBe("created");
    expect(JSON.parse(created.text).summary).toMatch(/R\$130\.00/u);
    const preview = await call("create_transaction", {
      kind: "expense",
      description: "Casio watch",
      amount: 130,
      account: "Inter",
      paymentMethod: "pix",
      date: "2026-11-01",
      dryRun: true,
    });
    expect(preview.data.wouldCreate.amountDisplay.amount).toBe(130);
    await close();
  });
});
