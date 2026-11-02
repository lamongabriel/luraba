import type { AddressInfo } from "node:net";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "@/app";
import { createAuthenticatedContext, createAuthHeaders } from "@/test/auth";
import { buildAccountInput } from "@/test/factories";
import { connectTestClient } from "../../../../../mcp/src/testing/connect";

const SEED = [
  ["IPVA", "Transportation > Car Insurance & Taxes", 150, 5],
  ["Car maintenance", "Transportation > Car Maintenance", 250, 5],
  ["Car insurance", "Transportation > Car Insurance & Taxes", 250, 5],
  ["DCTFWeb", "Business > Business Taxes (DAS)", 550, 20],
  ["Simples Nacional (DAS)", "Business > Business Taxes (DAS)", 550, 20],
  ["Accounting", "Business > Accounting", 300, 10],
  ["Health insurance", "Health > Health Insurance", 350, 20],
  ["Water", "Housing > Water", 100, 10],
  ["Electricity", "Housing > Electricity", 550, 10],
  ["Internet", "Housing > Internet & Phone", 110, 10],
  ["Amparo Mountain Range (land)", "Housing > Land Payments", 1250, 28],
] as const;

describe("recurring bills and budgets through the MCP tools", () => {
  let baseUrl: string;
  let close: () => void;

  beforeAll(async () => {
    const server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    close = () => server.close();
  });
  afterAll(() => close?.());

  async function setup() {
    const context = await createAuthenticatedContext();
    const headers = createAuthHeaders(context.token, context.household.id);
    const key = await request(app)
      .post("/api/v1/api-keys")
      .set(createAuthHeaders(context.token))
      .send({ name: "bills" });
    const mcp = await connectTestClient({ baseUrl, apiKey: key.body.data.secret });
    const owner = await request(app)
      .post("/api/v1/accounts")
      .set(headers)
      .send(buildAccountInput({ name: "Inter", currencyCode: "BRL", openingBalance: 1000000 }));
    expect(owner.status).toBe(201);
    return { mcp };
  }

  const thisMonth = new Date().toISOString().slice(0, 7);

  it("creates the monthly bills, totals them and pays one", async () => {
    const { mcp } = await setup();
    for (const [name, category, estimatedAmount, dueDay] of SEED) {
      const created = await mcp.call("create_recurring_bill", {
        name,
        category,
        estimatedAmount,
        dueDay,
        createMissing: true,
      });
      expect(created.isError, created.text).toBe(false);
    }
    const duplicate = await mcp.call("create_recurring_bill", {
      name: "Water",
      estimatedAmount: 1,
      dueDay: 1,
    });
    expect(duplicate.data.status).toBe("already_exists");

    const list = await mcp.call("list_recurring_bills", {});
    expect(list.data.bills).toHaveLength(11);
    expect(list.data.monthlyEstimatedTotal.amount).toBe(4410);

    const report = await mcp.call("report_bills", { month: thisMonth });
    expect(report.data.bills).toHaveLength(11);
    expect(report.data.totals.estimated.amount).toBe(4410);
    expect(report.data.totals.paidCount).toBe(0);

    const paid = await mcp.call("mark_bill_paid", {
      bill: "Water",
      month: thisMonth,
      actualAmount: 120,
      account: "Inter",
    });
    expect(paid.isError, paid.text).toBe(false);
    expect(paid.data.estimated.amount).toBe(100);
    expect(paid.data.actual.amount).toBe(120);
    expect(paid.data.difference.amount).toBe(20);

    const after = await mcp.call("report_bills", { month: thisMonth });
    expect(after.data.totals.paidCount).toBe(1);
    expect(after.data.totals.stillToPay.amount).toBe(4310);
    expect(after.data.totals.paidVsEstimate.amount).toBe(20);
    await mcp.close();
  });

  it("links a matching expense to its bill automatically", async () => {
    const { mcp } = await setup();
    await mcp.call("create_recurring_bill", {
      name: "Electricity",
      category: "Housing > Electricity",
      estimatedAmount: 550,
      dueDay: new Date().getUTCDate(),
      createMissing: true,
    });
    const expense = await mcp.call("create_transaction", {
      kind: "expense",
      description: "Power company",
      amount: 540,
      account: "Inter",
      category: "Housing > Electricity",
    });
    expect(expense.isError, expense.text).toBe(false);
    expect(expense.data.linkedBill.bill).toBe("Electricity");
    const report = await mcp.call("report_bills", { month: thisMonth });
    expect(report.data.bills[0].status).toBe("paid");
    expect(report.data.bills[0].actual.amount).toBe(540);
    await mcp.close();
  });

  it("sets a budget for one month or a range and keeps the others", async () => {
    const { mcp } = await setup();
    const unknown = await mcp.call("set_budget", { category: "Housing", amount: 2000 });
    expect(unknown.data.status).toBe("needs_clarification");
    await mcp.call("create_category", { name: "Housing", type: "expense" });
    await mcp.call("create_category", { name: "Food", type: "expense" });
    const range = await mcp.call("set_budget", {
      category: "Housing",
      amount: 2000,
      month: thisMonth,
      through: nextMonths(thisMonth, 2),
    });
    expect(range.isError, range.text).toBe(false);
    expect(range.data.months).toHaveLength(3);
    await mcp.call("set_budget", { category: "Food", amount: 800, month: thisMonth });
    const budget = await mcp.call("report_budget", { month: thisMonth });
    const lines = budget.data.expenseCategories as {
      category: string;
      budgeted: { amount: number };
    }[];
    expect(lines.find((line) => line.category === "Housing")?.budgeted.amount).toBe(2000);
    expect(lines.find((line) => line.category === "Food")?.budgeted.amount).toBe(800);
    const later = await mcp.call("report_budget", { month: nextMonths(thisMonth, 2) });
    expect(
      (later.data.expenseCategories as { category: string }[]).some(
        (line) => line.category === "Housing",
      ),
    ).toBe(true);
    await mcp.close();
  });
});

function nextMonths(key: string, count: number): string {
  const [y, m] = key.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m - 1 + count, 1)).toISOString().slice(0, 7);
}
