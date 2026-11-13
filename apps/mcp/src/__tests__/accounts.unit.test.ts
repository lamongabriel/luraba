import { describe, expect, it } from "vitest";
import { connectTestClient } from "../testing/connect.js";

type Handler = (url: URL, init: RequestInit) => unknown;

const OWNER = "11111111-1111-4111-8111-111111111111";
const ids = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const now = "2026-01-01T00:00:00.000Z";

function account(over: Record<string, unknown> = {}) {
  return {
    id: OWNER,
    name: "Chase Checking",
    institutionName: "Chase",
    institutionDomain: "chase.com",
    institutionLogoUrl: null,
    imageUploadId: null,
    notes: null,
    classification: "asset",
    type: "cash",
    currencyCode: "USD",
    archivedAt: null,
    createdByUserId: null,
    createdAt: now,
    updatedAt: now,
    balance: 100000,
    details: { kind: "cash", subtype: "checking" },
    subtype: "checking",
    ...over,
  };
}

const page = (data: unknown[]) => ({
  success: true,
  data,
  meta: {
    pagination: { page: 1, perPage: 100, totalCount: data.length, totalPages: 1 },
    summary: null,
  },
});

async function setup(handler: Handler) {
  const calls: { method: string; path: string; body: unknown }[] = [];
  const fetch = async (input: string, init: RequestInit) => {
    const url = new URL(input);
    const path = url.pathname.replace("/api/v1", "");
    calls.push({
      method: init.method ?? "GET",
      path,
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    });
    const result = handler(url, init);
    if (result === undefined) return new Response(null, { status: 204 });
    return new Response(JSON.stringify(result), { status: 200 });
  };
  const connected = await connectTestClient({ baseUrl: "http://api.test", apiKey: "lur_x", fetch });
  return { ...connected, calls };
}

describe("account tools over a mocked API", () => {
  it("creates an account, mapping checking to cash and major to minor units", async () => {
    const { call, calls, close } = await setup((url, init) => {
      if (url.pathname.endsWith("/auth/me"))
        return {
          success: true,
          data: {
            user: {
              id: ids(1),
              name: "John Doe",
              email: "john@example.com",
              preferences: { currency: "USD", timezone: "UTC" },
            },
            household: null,
          },
        };
      if (init.method === "POST")
        return {
          success: true,
          data: account({
            balance: 3800000,
            type: "vehicle",
            details: {
              kind: "vehicle",
              subtype: "car",
              make: null,
              model: "Civic",
              year: null,
              trim: null,
              vin: null,
              licensePlate: null,
              mileage: 93000,
              mileageUnit: "mi",
            },
          }),
        };
      return page([]);
    });
    const dry = await call("create_account", {
      name: "Honda Civic",
      type: "vehicle",
      currency: "usd",
      openingBalance: 38000,
      details: { model: "Civic", mileage: 93000, mileageUnit: "mi" },
      dryRun: true,
    });
    expect(dry.data.status).toBe("dry_run");
    expect(dry.data.wouldCreate.openingBalance).toBe(3800000);
    expect(calls.some((c) => c.method === "POST")).toBe(false);

    const shorthand = await call("create_account", {
      name: "Savings",
      type: "savings",
      currency: "USD",
      dryRun: true,
    });
    expect(shorthand.data.wouldCreate.type).toBe("cash");
    expect(shorthand.data.wouldCreate.details).toEqual({ kind: "cash", subtype: "savings" });

    const created = await call("create_account", {
      name: "Honda Civic",
      type: "vehicle",
      currency: "USD",
      openingBalance: 38000,
      details: { model: "Civic", mileage: 93000, mileageUnit: "mi" },
    });
    expect(created.data.status).toBe("created");
    expect(calls.find((c) => c.method === "POST")?.body).toMatchObject({ openingBalance: 3800000 });
    await close();
  });

  it("explains invalid types, subtypes and details without calling the API", async () => {
    const { call, calls, close } = await setup(() => page([]));
    expect(
      (await call("create_account", { name: "A", type: "boat" })).data.allowedTypes,
    ).toBeTruthy();
    expect(
      (
        await call("create_account", {
          name: "A",
          type: "cash",
          subtype: "mortgage",
          currency: "USD",
        })
      ).data.allowedSubtypes,
    ).toContain("checking");
    const bad = await call("create_account", {
      name: "A",
      type: "vehicle",
      currency: "USD",
      details: { mileage: 10 },
    });
    expect(bad.isError).toBe(true);
    expect(bad.text).toContain("mileageUnit");
    expect(calls.some((c) => c.method === "POST")).toBe(false);
    await close();
  });

  it("requires confirm to delete an account and reports what goes with it", async () => {
    const { call, calls, close } = await setup((url, init) => {
      if (init.method === "DELETE") return undefined;
      if (url.pathname.endsWith("/transactions"))
        return {
          ...page([]),
          meta: {
            pagination: { page: 1, perPage: 1, totalCount: 7, totalPages: 7 },
            summary: null,
          },
        };
      if (url.pathname === "/api/v1/accounts") return page([account()]);
      if (url.pathname === "/api/v1/credit-cards") return page([]);
      if (url.pathname === `/api/v1/accounts/${OWNER}`) return { success: true, data: account() };
      return page([]);
    });
    const refused = await call("delete_account", { account: "chase checking" });
    expect(refused.data.status).toBe("confirmation_required");
    expect(refused.data.dependents.transactions).toBe(7);
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
    const done = await call("delete_account", { account: "chase checking", confirm: true });
    expect(done.data.status).toBe("deleted");
    expect(calls.some((c) => c.method === "DELETE" && c.path === `/accounts/${OWNER}`)).toBe(true);
    await close();
  });

  it("asks which account when the paying account is ambiguous, and rejects non-bank owners", async () => {
    const savings = account({ id: ids(2), name: "Chase Savings" });
    const loan = account({
      id: ids(3),
      name: "Car Loan",
      type: "loan",
      classification: "liability",
    });
    const { call, close } = await setup(() => page([account(), savings, loan]));
    const input = {
      name: "Amex Gold",
      brand: "American Express",
      last4: "1234",
      limit: 5000,
      closingDay: 10,
      dueDay: 20,
    };
    const ambiguous = await call("create_credit_card", { ...input, ownerAccount: "chase" });
    expect(ambiguous.data.status).toBe("needs_clarification");
    const wrong = await call("create_credit_card", { ...input, ownerAccount: "car loan" });
    expect(wrong.isError).toBe(true);
    const preview = await call("create_credit_card", {
      ...input,
      ownerAccount: "Chase Checking",
      dryRun: true,
    });
    expect(preview.data.wouldCreate.creditLimitAmount).toBe(500000);
    await close();
  });
  it("archives a zero-balance account and refuses one with a balance", async () => {
    const loan = account({ id: ids(4), name: "Loan to Mom", balance: 0 });
    const { call, calls, close } = await setup((url, init) => {
      if (init.method === "POST" && url.pathname.endsWith("/archive"))
        return {
          success: true,
          data: account({ id: ids(4), name: "Loan to Mom", balance: 0, archivedAt: now }),
        };
      if (url.pathname === "/api/v1/accounts") return page([account(), loan]);
      if (url.pathname === `/api/v1/accounts/${ids(4)}`) return { success: true, data: loan };
      if (url.pathname === `/api/v1/accounts/${OWNER}`) return { success: true, data: account() };
      return page([]);
    });
    const refused = await call("archive_account", { account: "chase checking" });
    expect(refused.isError).toBe(true);
    expect(refused.data.status).toBe("balance_not_zero");
    expect(calls.some((c) => c.method === "POST")).toBe(false);

    const preview = await call("archive_account", { account: "loan to mom", dryRun: true });
    expect(preview.data.status).toBe("dry_run");
    expect(calls.some((c) => c.method === "POST")).toBe(false);

    const done = await call("archive_account", { account: "loan to mom" });
    expect(done.data.status).toBe("archived");
    expect(calls.some((c) => c.method === "POST" && c.path === `/accounts/${ids(4)}/archive`)).toBe(
      true,
    );
    await close();
  });

  it("asks the API for archived accounts when unarchiving and when includeArchived is set", async () => {
    const archived = account({ id: ids(5), name: "Old Savings", balance: 0, archivedAt: now });
    const { call, calls, close } = await setup((url, init) => {
      if (init.method === "POST" && url.pathname.endsWith("/unarchive"))
        return { success: true, data: { ...archived, archivedAt: null } };
      if (url.pathname === "/api/v1/accounts")
        return page(
          url.searchParams.get("includeArchived") === "true" ? [account(), archived] : [account()],
        );
      return page([]);
    });
    const listed = await call("list_accounts", { includeArchived: true });
    expect(listed.data.accounts.map((a: { archived: boolean }) => a.archived)).toEqual([
      false,
      true,
    ]);
    const hidden = await call("list_accounts");
    expect(hidden.data.accounts).toHaveLength(1);

    const restored = await call("unarchive_account", { account: "old savings" });
    expect(restored.data.status).toBe("unarchived");
    expect(
      calls.some((c) => c.method === "POST" && c.path === `/accounts/${ids(5)}/unarchive`),
    ).toBe(true);
    await close();
  });

  it("archives and unarchives credit cards and filters list_credit_cards", async () => {
    const card = {
      id: ids(6),
      ownerAccountId: OWNER,
      ledgerAccountId: ids(7),
      name: "Old Visa",
      institutionName: null,
      institutionDomain: null,
      institutionLogoUrl: null,
      notes: null,
      ownerAccount: {
        id: OWNER,
        name: "Chase Checking",
        institutionName: "Chase",
        institutionLogoUrl: null,
        type: "cash",
        classification: "asset",
        currencyCode: "USD",
      },
      classification: "liability",
      type: "credit_card",
      currencyCode: "USD",
      brand: "Visa",
      productType: "credit",
      last4: "4242",
      color: null,
      closingDay: 10,
      dueDay: 20,
      creditLimitAmount: 100000,
      remainingCreditAmount: 100000,
      balance: 0,
      archivedAt: null,
      createdByUserId: null,
      createdAt: now,
      updatedAt: now,
    };
    const { call, calls, close } = await setup((url, init) => {
      if (init.method === "POST" && url.pathname.endsWith("/archive"))
        return { success: true, data: { ...card, archivedAt: now } };
      if (init.method === "POST" && url.pathname.endsWith("/unarchive"))
        return { success: true, data: card };
      if (url.pathname === "/api/v1/credit-cards")
        return page(
          url.searchParams.get("includeArchived") === "true"
            ? [{ ...card, archivedAt: now }]
            : [card],
        );
      if (url.pathname === `/api/v1/credit-cards/${card.id}`) return { success: true, data: card };
      return page([]);
    });
    const done = await call("archive_credit_card", { creditCard: "old visa" });
    expect(done.data.status).toBe("archived");
    const restored = await call("unarchive_credit_card", { creditCard: "4242" });
    expect(restored.data.status).toBe("unarchived");
    expect(calls.filter((c) => c.method === "POST").map((c) => c.path)).toEqual([
      `/credit-cards/${card.id}/archive`,
      `/credit-cards/${card.id}/unarchive`,
    ]);
    const listed = await call("list_credit_cards", { includeArchived: true });
    expect(listed.data.creditCards[0].archived).toBe(true);
    await close();
  });
});
