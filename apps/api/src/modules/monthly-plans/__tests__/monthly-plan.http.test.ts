import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "@/app";
import * as accountsService from "@/modules/accounts/accounts.service";
import * as categoriesService from "@/modules/categories/categories.service";
import * as transactionsService from "@/modules/transactions/transactions.service";
import { createAuthenticatedContext, createAuthHeaders } from "@/test/auth";
import { buildAccountInput, buildCategoryInput } from "@/test/factories";

/** USD minor units. */
const usd = (amount: number) => amount * 100;
const day = (value: string) => new Date(`${value}T00:00:00.000Z`);

type Seed = Awaited<ReturnType<typeof setup>>;

async function setup() {
  const context = await createAuthenticatedContext({ role: "owner" });
  const headers = createAuthHeaders(context.token, context.household.id);
  const household = context.householdContext;
  const account = (name: string, subtype: "checking" | "savings" = "checking") =>
    accountsService.createAccount(
      household,
      buildAccountInput({
        name,
        type: "cash",
        details: { kind: "cash", subtype },
        currencyCode: "USD",
      }),
    );
  const [interGlobal, vault, xp] = await Promise.all([
    account("Inter Global"),
    account("Emergency Vault", "savings"),
    account("XP Savings", "savings"),
  ]);
  const salary = await categoriesService.createCategory(
    household,
    buildCategoryInput({ name: "Salary & Contracts", type: "income" }),
  );
  const taxes = await categoriesService.createCategory(
    household,
    buildCategoryInput({ name: "Business Taxes (DAS)", type: "expense" }),
  );
  const groceries = await categoriesService.createCategory(
    household,
    buildCategoryInput({ name: "Groceries", type: "expense" }),
  );

  const createGoal = async (
    name: string,
    kind: "investment" | "savings",
    monthly: number,
  ): Promise<string> => {
    const response = await request(app)
      .post("/api/v1/goals")
      .set(headers)
      .send({
        name,
        kind,
        currencyCode: "USD",
        monthlyContribution: usd(monthly),
        // 13 months, Nov 2026 through Nov 2027.
        targetAmount: usd(monthly * 13),
        startDate: "2026-11-01",
        endMonth: "2027-11",
      });
    expect(response.status).toBe(201);
    return response.body.data.id;
  };
  const goals = {
    investmentsBrazil: await createGoal("Investments Brazil", "investment", 1000),
    investmentsUsa: await createGoal("Investments USA", "investment", 1000),
    honeymoon: await createGoal("Honeymoon", "savings", 1000),
    weddingDinner: await createGoal("Wedding Dinner", "savings", 250),
    furniture: await createGoal("Furniture", "savings", 250),
  };

  const record = (
    type: "income" | "expense",
    amount: number,
    postedDate: string,
    accountId: string,
    categoryId: string,
    extra: { competencyMonth?: string; description?: string } = {},
  ) =>
    transactionsService.createTransaction(household, {
      type,
      description: extra.description ?? (type === "income" ? "Salary" : "Expense"),
      amount: usd(amount),
      currencyCode: "USD",
      paymentMethodCode: "cash",
      accountId,
      categoryId,
      purchaseDate: day(postedDate),
      postedDate: day(postedDate),
      ...(extra.competencyMonth ? { competencyMonth: extra.competencyMonth } : {}),
    });

  return {
    context,
    headers,
    household,
    accounts: { interGlobal, vault, xp },
    categories: { salary, taxes, groceries },
    goals,
    record,
  };
}

/** The owner's plan from the spreadsheet; documented in apps/api/src/modules/monthly-plans/README.md. */
async function seedPlan({ headers, goals }: Seed) {
  const contributions = (to: number) => [
    { kind: "goal", goalId: goals.investmentsBrazil, amount: usd(to) },
    { kind: "goal", goalId: goals.investmentsUsa, amount: usd(to) },
    { kind: "goal", goalId: goals.honeymoon, amount: usd(to) },
    { kind: "goal", goalId: goals.weddingDinner, amount: usd(to / 4) },
    { kind: "goal", goalId: goals.furniture, amount: usd(to / 4) },
  ];
  const put = (from: string, to: string, lines: unknown[]) =>
    request(app)
      .put("/api/v1/monthly-plans")
      .set(headers)
      .send({ from, to, currencyCode: "USD", lines });
  const results = [
    await put("2026-10", "2026-10", [
      { kind: "salary", amount: usd(5500) },
      { kind: "taxes", amount: usd(250) },
    ]),
    await put("2026-11", "2027-01", [
      { kind: "salary", amount: usd(5500) },
      { kind: "taxes", amount: usd(350) },
      ...contributions(1000),
    ]),
    await put("2027-02", "2027-11", [
      { kind: "salary", amount: usd(5500) },
      { kind: "taxes", amount: usd(500) },
      ...contributions(1000),
    ]),
  ];
  for (const result of results) expect(result.status).toBe(200);
}

const planMonth = async (seed: Seed, month: string) => {
  const response = await request(app).get(`/api/v1/monthly-plans?from=${month}`).set(seed.headers);
  expect(response.status).toBe(200);
  return response.body.data.months[0];
};
const line = (month: { lines: { kind: string; label: string }[] }, label: string) =>
  month.lines.find((item) => item.label === label) as {
    projected: number;
    actual: number;
    difference: number;
  };

describe("monthly plan", () => {
  it("seeds the owner's plan and derives To spend from the other lines", async () => {
    const seed = await setup();
    await seedPlan(seed);

    const october = await planMonth(seed, "2026-10");
    expect(line(october, "Salary").projected).toBe(usd(5500));
    expect(line(october, "To spend").projected).toBe(usd(5250));

    const november = await planMonth(seed, "2026-11");
    expect(line(november, "Taxes").projected).toBe(usd(350));
    expect(line(november, "Honeymoon").projected).toBe(usd(1000));
    expect(line(november, "Wedding Dinner").projected).toBe(usd(250));
    expect(line(november, "To spend").projected).toBe(usd(1650));
    expect(november.investments.projected).toBe(usd(2000));
    expect(november.saved.projected).toBe(usd(1500));

    expect(line(await planMonth(seed, "2027-01"), "To spend").projected).toBe(usd(1650));
    expect(line(await planMonth(seed, "2027-02"), "To spend").projected).toBe(usd(1500));
    expect(line(await planMonth(seed, "2027-11"), "Taxes").projected).toBe(usd(500));
    expect((await planMonth(seed, "2027-12")).hasPlan).toBe(false);
  });

  it("counts salary received on the 22nd for the next month (test 1)", async () => {
    const seed = await setup();
    await seedPlan(seed);
    const { record, accounts, categories } = seed;

    await record("income", 5500, "2026-09-22", accounts.interGlobal.id, categories.salary.id);
    await record("income", 5500, "2026-10-22", accounts.interGlobal.id, categories.salary.id);
    await record("expense", 185, "2026-10-10", accounts.interGlobal.id, categories.taxes.id, {
      description: "DAS",
    });

    const october = await planMonth(seed, "2026-10");
    expect(line(october, "Salary").actual).toBe(usd(5500));
    expect(october.salaryReceivedOn).toEqual(["2026-09-22"]);
    expect(line(october, "Taxes").actual).toBe(usd(185));
    expect(line(october, "Taxes").difference).toBe(usd(-65));
    // Taxes are their own line, so they do not count as spending.
    expect(line(october, "To spend").actual).toBe(0);

    const november = await planMonth(seed, "2026-11");
    expect(line(november, "Salary").actual).toBe(usd(5500));
    expect(november.salaryReceivedOn).toEqual(["2026-10-22"]);
  });

  it("lets a transaction carry its own competency month", async () => {
    const seed = await setup();
    await seedPlan(seed);
    const { record, accounts, categories } = seed;

    await record("income", 5500, "2026-10-05", accounts.interGlobal.id, categories.salary.id);
    await record("income", 100, "2026-10-22", accounts.interGlobal.id, categories.salary.id, {
      competencyMonth: "2026-10",
    });

    const october = await planMonth(seed, "2026-10");
    expect(line(october, "Salary").actual).toBe(usd(5600));
    expect(line(await planMonth(seed, "2026-11"), "Salary").actual).toBe(0);
  });

  it("reports To spend actual from spending, net of nothing else", async () => {
    const seed = await setup();
    await seedPlan(seed);
    const { record, accounts, categories } = seed;
    await record("expense", 420, "2026-11-01", accounts.interGlobal.id, categories.groceries.id);

    const november = await planMonth(seed, "2026-11");
    expect(line(november, "To spend").actual).toBe(usd(420));
    expect(line(november, "To spend").projected).toBe(usd(1650));
  });

  it("rejects a goal line without a goal and a goal that is not the household's", async () => {
    const seed = await setup();
    const missing = await request(app)
      .put("/api/v1/monthly-plans")
      .set(seed.headers)
      .send({ from: "2026-11", currencyCode: "USD", lines: [{ kind: "goal", amount: 1 }] });
    expect(missing.status).toBe(422);

    const foreign = await request(app)
      .put("/api/v1/monthly-plans")
      .set(seed.headers)
      .send({
        from: "2026-11",
        currencyCode: "USD",
        lines: [{ kind: "goal", goalId: "00000000-0000-4000-8000-000000000000", amount: 1 }],
      });
    expect([404, 422]).toContain(foreign.status);
  });
});
