import type { AddressInfo } from "node:net";
import request from "supertest";
import app from "@/app";
import { createAuthenticatedContext, createAuthHeaders } from "@/test/auth";
import { buildAccountInput, buildCreditCardInput } from "@/test/factories";
import { connectTestClient } from "../../../../../mcp/src/testing/connect";

/**
 * End to end: a real API key created through the API, the real MCP server and the real REST API
 * (listening on a port) with the test database.
 */
describe("Luraba MCP server (end to end)", () => {
  let baseUrl: string;
  let close: () => void;
  let call: Awaited<ReturnType<typeof connectTestClient>>["call"];
  let mcp: Awaited<ReturnType<typeof connectTestClient>>["mcp"];
  let closeMcp: () => Promise<void>;
  let cookie: string;
  let householdId: string;

  beforeAll(async () => {
    const server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    close = () => server.close();
  });

  // The test database is reset before every test, so the user, key and connection are per test.
  beforeEach(async () => {
    const context = await createAuthenticatedContext();
    cookie = context.token;
    householdId = context.household.id;
    const created = await request(app)
      .post("/api/v1/api-keys")
      .set(createAuthHeaders(cookie))
      .send({ name: "MCP e2e" });
    expect(created.status).toBe(201);

    const connected = await connectTestClient({ baseUrl, apiKey: created.body.data.secret });
    call = connected.call;
    mcp = connected.mcp;
    closeMcp = connected.close;
  });

  afterEach(async () => {
    await closeMcp?.();
  });

  afterAll(() => {
    close?.();
  });

  it("lists tools and resources", async () => {
    const { tools } = await mcp.listTools();
    const names = tools.map((tool) => tool.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "create_transaction",
        "search_transactions",
        "bulk_delete_transactions",
        "report_credit_cards",
        "report_balances",
        "create_account",
        "update_account",
        "delete_account",
        "create_credit_card",
        "update_credit_card",
        "delete_credit_card",
      ]),
    );
    expect(tools.every((tool) => tool.inputSchema.type === "object")).toBe(true);
    const { resources } = await mcp.listResources();
    expect(resources.length).toBeGreaterThan(0);
  });

  it("answers questions about the owner's household and rejects a bad key", async () => {
    const me = await call("whoami");
    expect(me.isError).toBe(false);
    expect(JSON.stringify(me.data)).toContain(householdId);

    const bad = await connectTestClient({ baseUrl, apiKey: "lur_not-a-real-key" });
    const response = await bad.call("list_accounts");
    expect(response.isError).toBe(true);
    expect(response.text).toMatch(/API key/);
    await bad.close();
  });

  it("creates, finds, updates and deletes a transaction by name", async () => {
    const account = await request(app)
      .post("/api/v1/accounts")
      .set(createAuthHeaders(cookie, householdId))
      .send(buildAccountInput({ name: "Chase Checking", currencyCode: "USD" }));
    expect(account.status).toBe(201);

    const preview = await call("create_transaction", {
      kind: "expense",
      description: "Groceries",
      amount: 42.5,
      account: "chase",
      category: "Food",
      merchant: "Whole Foods",
      createMissing: true,
      dryRun: true,
    });
    expect(preview.isError).toBe(false);

    const created = await call("create_transaction", {
      kind: "expense",
      description: "Groceries",
      amount: 42.5,
      account: "chase",
      category: "Food",
      merchant: "Whole Foods",
      createMissing: true,
    });
    expect(created.isError, created.text).toBe(false);
    const id = created.data.transaction?.id ?? created.data.id;
    expect(id).toBeTruthy();

    const found = await call("search_transactions", { search: "Groceries" });
    expect(JSON.stringify(found.data)).toContain("Groceries");

    const balance = await call("report_balances", { search: "chase" });
    expect(JSON.stringify(balance.data)).toContain("Chase Checking");

    const refused = await call("delete_transaction", { id });
    expect(refused.data.status ?? refused.text).toMatch(/confirm/i);
    const deleted = await call("delete_transaction", { id, confirm: true });
    expect(deleted.isError, deleted.text).toBe(false);
  });

  it("sets up a household from scratch and logs an expense end to end", async () => {
    const make = async (args: Record<string, unknown>) => {
      const result = await call("create_account", args);
      expect(result.isError, result.text).toBe(false);
      expect(result.data.status).toBe("created");
      return result.data.account;
    };
    const checking = await make({
      name: "Chase Checking",
      type: "checking",
      currency: "USD",
      institution: "Chase",
      institutionDomain: "chase.com",
      openingBalance: 1000,
    });
    expect(checking.subtype).toBe("checking");
    expect(checking.balance.amount).toBe(1000);
    await make({ name: "Business Checking", type: "cash", subtype: "checking", currency: "USD" });
    await make({ name: "Fidelity Brokerage", type: "investment", currency: "USD" });
    const car = await make({
      name: "Honda Civic",
      type: "vehicle",
      currency: "USD",
      openingBalance: 40000,
      notes: "93k mi",
      details: { make: "Honda", model: "Civic", year: 2019, mileage: 93000, mileageUnit: "mi" },
    });
    expect(car.details.mileage).toBe(93000);

    const duplicate = await call("create_account", { name: "chase checking", type: "cash" });
    expect(duplicate.data.status).toBe("already_exists");
    const badType = await call("create_account", { name: "X", type: "spaceship" });
    expect(badType.data.status).toBe("invalid_input");

    const revalued = await call("update_account", { account: "civic", balance: 38000 });
    expect(revalued.isError, revalued.text).toBe(false);
    expect(revalued.data.account.balance.amount).toBe(38000);
    const renamed = await call("update_account", {
      account: "Honda Civic",
      notes: "93k mi, new tires",
      details: { mileage: 94000 },
    });
    expect(renamed.data.account.details.mileage).toBe(94000);

    const card = await call("create_credit_card", {
      name: "Amex Gold",
      ownerAccount: "chase",
      brand: "American Express",
      last4: "1234",
      limit: 5000,
      closingDay: 10,
      dueDay: 20,
    });
    expect(card.isError, card.text).toBe(false);
    expect(card.data.creditCard.limit.amount).toBe(5000);
    const raised = await call("update_credit_card", { creditCard: "amex", limit: 8000 });
    expect(raised.data.creditCard.limit.amount).toBe(8000);

    const expense = await call("create_transaction", {
      kind: "expense",
      description: "Headphones",
      amount: 130,
      account: "Chase Checking",
      category: "Shopping > Electronics",
      createMissing: true,
    });
    expect(expense.isError, expense.text).toBe(false);
    expect(expense.data.status).toBe("created");
    const categories = (await call("list_categories")).data.categories as {
      name: string;
      parent: string | null;
    }[];
    expect(categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Electronics", parent: "Shopping" }),
      ]),
    );
    const again = await call("create_transaction", {
      kind: "expense",
      description: "Cable",
      amount: 9,
      account: "Chase Checking",
      category: "shopping > electronics",
    });
    expect(again.data.status).toBe("created");

    const refused = await call("delete_account", { account: "Chase Checking" });
    expect(refused.data.status).toBe("confirmation_required");
    expect(refused.data.dependents.transactions).toBeGreaterThan(0);
    expect(refused.data.dependents.creditCards).toContain("Amex Gold");
    const cardRefused = await call("delete_credit_card", { creditCard: "amex" });
    expect(cardRefused.data.status).toBe("confirmation_required");
    const cardGone = await call("delete_credit_card", { creditCard: "amex", confirm: true });
    expect(cardGone.data.status).toBe("deleted");
    const gone = await call("delete_account", { account: "Chase Checking", confirm: true });
    expect(gone.data.status).toBe("deleted");
    const left = await call("list_accounts");
    expect(JSON.stringify(left.data)).not.toContain("Chase Checking");
  });

  it("asks for clarification instead of guessing an ambiguous account", async () => {
    for (const name of ["Savings Alpha", "Savings Beta"]) {
      await request(app)
        .post("/api/v1/accounts")
        .set(createAuthHeaders(cookie, householdId))
        .send(buildAccountInput({ name, currencyCode: "USD" }));
    }
    const response = await call("create_transaction", {
      kind: "expense",
      description: "Coffee",
      amount: 4,
      account: "savings",
    });
    expect(response.isError).toBe(false);
    expect(response.data.status).toBe("needs_clarification");
    expect(JSON.stringify(response.data)).toContain("Savings Alpha");
  });

  it("reports credit cards", async () => {
    const owner = await request(app)
      .post("/api/v1/accounts")
      .set(createAuthHeaders(cookie, householdId))
      .send(buildAccountInput({ name: "Card owner", currencyCode: "USD" }));
    const card = await request(app)
      .post("/api/v1/credit-cards")
      .set(createAuthHeaders(cookie, householdId))
      .send(buildCreditCardInput({ name: "Amex Gold", ownerAccountId: owner.body.data.id }));
    expect(card.status).toBe(201);

    const report = await call("report_credit_cards");
    expect(report.isError, report.text).toBe(false);
    expect(report.data.cardCount).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(report.data)).toContain("Amex Gold");
  });

  it("does not let the key manage API keys", async () => {
    const response = await request(app)
      .get("/api/v1/api-keys")
      .set("Authorization", "Bearer lur_whatever");
    expect(response.status).toBeGreaterThanOrEqual(401);
    expect(response.status).toBeLessThan(404);
  });
});
