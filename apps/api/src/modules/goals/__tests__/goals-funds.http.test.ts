import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "@/app";
import * as accountsService from "@/modules/accounts/accounts.service";
import * as categoriesService from "@/modules/categories/categories.service";
import * as transactionsService from "@/modules/transactions/transactions.service";
import { createAuthenticatedContext, createAuthHeaders } from "@/test/auth";
import { buildAccountInput, buildCategoryInput } from "@/test/factories";

const usd = (amount: number) => amount * 100;
const day = (value: string) => new Date(`${value}T00:00:00.000Z`);

async function setup() {
  const context = await createAuthenticatedContext({ role: "owner" });
  const headers = createAuthHeaders(context.token, context.household.id);
  const household = context.householdContext;
  const account = (name: string, currencyCode = "USD") =>
    accountsService.createAccount(
      household,
      buildAccountInput({
        name,
        type: "cash",
        details: { kind: "cash", subtype: "savings" },
        currencyCode,
      }),
    );
  const [interGlobal, savingsA, savingsB, brl] = await Promise.all([
    account("Inter Global"),
    account("Savings A"),
    account("Savings B"),
    account("Brazil Checking", "BRL"),
  ]);
  const hotels = await categoriesService.createCategory(
    household,
    buildCategoryInput({ name: "Hotels", type: "expense" }),
  );

  const createGoal = async (name: string, monthly: number) => {
    const response = await request(app)
      .post("/api/v1/goals")
      .set(headers)
      .send({
        name,
        kind: "savings",
        currencyCode: "USD",
        monthlyContribution: usd(monthly),
        targetAmount: usd(monthly * 13),
        startDate: "2026-11-01",
        endMonth: "2027-11",
      });
    expect(response.status).toBe(201);
    return response.body.data.id as string;
  };
  const post = (path: string, body: unknown) =>
    request(app).post(`/api/v1/goals/${path}`).set(headers).send(body);
  const getGoal = async (id: string) =>
    (await request(app).get(`/api/v1/goals/${id}`).set(headers)).body.data;
  /** Spending analytics for November: transfers must not show up in it. */
  const spending = async () => {
    const response = await request(app)
      .get("/api/v1/transactions/analytics?dateFrom=2026-11-01&dateTo=2026-11-30")
      .set(headers);
    return response.body.data.metrics;
  };

  return {
    headers,
    household,
    accounts: { interGlobal, savingsA, savingsB, brl },
    hotels,
    createGoal,
    post,
    getGoal,
    spending,
  };
}

describe("goal funds", () => {
  it("contributes from checking to savings without touching spending (test 2)", async () => {
    const s = await setup();
    const honeymoon = await s.createGoal("Honeymoon", 1000);
    const before = await s.spending();
    expect(before.moneyOut).toBeDefined();

    const response = await s.post(`${honeymoon}/contribute`, {
      amount: usd(1000),
      contributedOn: "2026-11-02",
      fromAccountId: s.accounts.interGlobal.id,
      toAccountId: s.accounts.savingsA.id,
    });
    expect(response.status).toBe(201);
    const goal = response.body.data;
    expect(goal.saved).toBe(usd(1000));
    expect(goal.locations).toEqual([{ accountId: s.accounts.savingsA.id, amount: usd(1000) }]);
    expect(goal.contributions[0]).toMatchObject({
      kind: "contribution",
      fromAccountId: s.accounts.interGlobal.id,
      toAccountId: s.accounts.savingsA.id,
    });
    expect(goal.contributions[0].transaction).not.toBeNull();
    expect(await s.spending()).toEqual(before);

    const report = await request(app).get("/api/v1/goals/report?month=2026-11").set(s.headers);
    expect(report.body.data.goals[0]).toMatchObject({
      name: "Honeymoon",
      planned: usd(1000),
      contributed: usd(1000),
      saved: usd(1000),
    });
  });

  it("moves the money between accounts without changing progress (test 3)", async () => {
    const s = await setup();
    const honeymoon = await s.createGoal("Honeymoon", 1000);
    await s.post(`${honeymoon}/contribute`, {
      amount: usd(1000),
      contributedOn: "2026-11-02",
      fromAccountId: s.accounts.interGlobal.id,
      toAccountId: s.accounts.savingsA.id,
    });

    const moved = await s.post(`${honeymoon}/move`, {
      amount: usd(1000),
      contributedOn: "2026-11-03",
      fromAccountId: s.accounts.savingsA.id,
      toAccountId: s.accounts.savingsB.id,
    });
    expect(moved.status).toBe(201);
    expect(moved.body.data.saved).toBe(usd(1000));
    expect(moved.body.data.locations).toEqual([
      { accountId: s.accounts.savingsB.id, amount: usd(1000) },
    ]);

    const tooMuch = await s.post(`${honeymoon}/move`, {
      amount: usd(1),
      fromAccountId: s.accounts.savingsA.id,
      toAccountId: s.accounts.interGlobal.id,
    });
    expect(tooMuch.status).toBe(422);
  });

  it("withdraws to pay an expense, lowering progress (test 4)", async () => {
    const s = await setup();
    const honeymoon = await s.createGoal("Honeymoon", 1000);
    await s.post(`${honeymoon}/contribute`, {
      amount: usd(1000),
      contributedOn: "2026-11-02",
      fromAccountId: s.accounts.interGlobal.id,
      toAccountId: s.accounts.savingsA.id,
    });
    const hotel = await transactionsService.createTransaction(s.household, {
      type: "expense",
      description: "Honeymoon hotel",
      amount: usd(400),
      currencyCode: "USD",
      paymentMethodCode: "cash",
      accountId: s.accounts.savingsA.id,
      categoryId: s.hotels.id,
      purchaseDate: day("2026-11-05"),
      postedDate: day("2026-11-05"),
    });

    const response = await s.post(`${honeymoon}/withdraw`, {
      fromAccountId: s.accounts.savingsA.id,
      expenseId: hotel.id,
    });
    expect(response.status).toBe(201);
    const goal = response.body.data;
    expect(goal.saved).toBe(usd(600));
    expect(goal.locations).toEqual([{ accountId: s.accounts.savingsA.id, amount: usd(600) }]);
    expect(goal.contributions[0]).toMatchObject({ kind: "withdrawal", amount: -usd(400) });
    expect(goal.contributions[0].transaction.id).toBe(hotel.id);

    // The same expense cannot pay for two withdrawals.
    const again = await s.post(`${honeymoon}/withdraw`, {
      fromAccountId: s.accounts.savingsA.id,
      expenseId: hotel.id,
    });
    expect(again.status).toBe(409);

    // Returning money to checking is a withdrawal too.
    const back = await s.post(`${honeymoon}/withdraw`, {
      amount: usd(100),
      fromAccountId: s.accounts.savingsA.id,
      toAccountId: s.accounts.interGlobal.id,
    });
    expect(back.body.data.saved).toBe(usd(500));
  });

  it("keeps separate progress for goals sharing an account (test 5)", async () => {
    const s = await setup();
    const honeymoon = await s.createGoal("Honeymoon", 1000);
    const furniture = await s.createGoal("Furniture", 250);
    for (const [goal, amount] of [
      [honeymoon, 1000],
      [furniture, 250],
    ] as const) {
      await s.post(`${goal}/contribute`, {
        amount: usd(amount),
        contributedOn: "2026-11-02",
        fromAccountId: s.accounts.interGlobal.id,
        toAccountId: s.accounts.savingsA.id,
      });
    }

    expect((await s.getGoal(honeymoon)).saved).toBe(usd(1000));
    expect((await s.getGoal(furniture)).saved).toBe(usd(250));
    expect((await s.getGoal(furniture)).locations).toEqual([
      { accountId: s.accounts.savingsA.id, amount: usd(250) },
    ]);
  });

  it("stores the FX rate for a contribution in another currency", async () => {
    const s = await setup();
    const furniture = await s.createGoal("Furniture", 250);

    const missingRate = await s.post(`${furniture}/contribute`, {
      amount: 100_000,
      currencyCode: "BRL",
      fromAccountId: s.accounts.brl.id,
      toAccountId: s.accounts.savingsA.id,
    });
    expect(missingRate.status).toBe(422);

    const response = await s.post(`${furniture}/contribute`, {
      amount: 100_000,
      currencyCode: "BRL",
      fxRate: 0.2,
      contributedOn: "2026-11-02",
      fromAccountId: s.accounts.brl.id,
      toAccountId: s.accounts.savingsA.id,
    });
    expect(response.status).toBe(201);
    expect(response.body.data.saved).toBe(20_000);
    expect(response.body.data.contributions[0]).toMatchObject({
      amount: 20_000,
      originalAmount: 100_000,
      originalCurrency: "BRL",
      fxRate: 0.2,
    });
  });

  it("requires goal permissions to move money", async () => {
    const s = await setup();
    const viewer = await createAuthenticatedContext({ role: "viewer" });
    const response = await request(app)
      .post(`/api/v1/goals/${await s.createGoal("Honeymoon", 1000)}/contribute`)
      .set(createAuthHeaders(viewer.token, viewer.household.id))
      .send({
        amount: 1,
        fromAccountId: s.accounts.interGlobal.id,
        toAccountId: s.accounts.savingsA.id,
      });
    expect([403, 404]).toContain(response.status);
  });
});
