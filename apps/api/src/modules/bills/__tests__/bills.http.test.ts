import { formatISODate, getTodayInTimezone } from "@luraba/domain";
import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "@/app";
import * as accountsService from "@/modules/accounts/accounts.service";
import * as transactionsService from "@/modules/transactions/transactions.service";
import { createAuthenticatedContext, createAuthHeaders } from "@/test/auth";
import { buildAccountInput } from "@/test/factories";

describe("bills routes", () => {
  it("requires authentication", async () => {
    expect((await request(app).get("/api/v1/bills")).status).toBe(401);
  });

  it("creates a bill with occurrences, links a transaction and reports history", async () => {
    const context = await createAuthenticatedContext();
    const headers = createAuthHeaders(context.token, context.household.id);
    const today = getTodayInTimezone(context.householdContext.timezone);
    const startDate = new Date(today);
    startDate.setUTCMonth(startDate.getUTCMonth() - 3);

    const created = await request(app)
      .post("/api/v1/bills")
      .set(headers)
      .send({
        name: "Water",
        expectedAmount: 8_000,
        currencyCode: "BRL",
        frequency: "monthly",
        dayOfMonth: 10,
        startDate: formatISODate(startDate),
        alreadyPaidCount: 1,
      });

    expect(created.status).toBe(201);
    const bill = created.body.data;
    expect(bill.status).toBe("active");
    expect(bill.summary.paidCount).toBe(1);
    expect(bill.summary.totalCount).toBeGreaterThanOrEqual(4);

    const occurrences = await request(app)
      .get(`/api/v1/bills/${bill.id}/occurrences`)
      .set(headers)
      .query({ perPage: 50 });
    expect(occurrences.status).toBe(200);
    const open = occurrences.body.data.find(
      (row: { state: string }) => row.state === "overdue" || row.state === "scheduled",
    );
    expect(open).toBeDefined();

    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({ name: "Bills Checking", type: "cash", currencyCode: "BRL" }),
    );
    const transaction = await transactionsService.createTransaction(context.householdContext, {
      type: "expense",
      description: "Water bill",
      amount: 8_350,
      currencyCode: "BRL",
      paymentMethodCode: "pix",
      accountId: account.id,
      purchaseDate: new Date(),
      postedDate: new Date(),
    });

    const linked = await request(app)
      .post(`/api/v1/bills/${bill.id}/occurrences/${open.id}/link`)
      .set(headers)
      .send({ transactionId: transaction.id });
    expect(linked.status).toBe(200);
    expect(linked.body.data).toMatchObject({ state: "paid", transaction: { amount: 8_350 } });

    // One transaction can only pay one occurrence.
    const other = occurrences.body.data.find(
      (row: { id: string; state: string }) =>
        row.id !== open.id && (row.state === "overdue" || row.state === "scheduled"),
    );
    const duplicate = await request(app)
      .post(`/api/v1/bills/${bill.id}/occurrences/${other.id}/link`)
      .set(headers)
      .send({ transactionId: transaction.id });
    expect(duplicate.status).toBe(409);

    const detail = await request(app).get(`/api/v1/bills/${bill.id}`).set(headers);
    expect(detail.body.data.summary).toMatchObject({ paidCount: 2, totalPaid: 8_350 });

    const reset = await request(app)
      .post(`/api/v1/bills/${bill.id}/occurrences/${open.id}/reset`)
      .set(headers);
    expect(reset.body.data.transaction).toBeNull();
  });

  it("builds finite installment plans and supports cancel and delete", async () => {
    const context = await createAuthenticatedContext();
    const headers = createAuthHeaders(context.token, context.household.id);

    const created = await request(app).post("/api/v1/bills").set(headers).send({
      name: "Land",
      expectedAmount: 200_000,
      currencyCode: "BRL",
      frequency: "monthly",
      dayOfMonth: 5,
      startDate: "2026-01-05",
      installmentCount: 48,
      alreadyPaidCount: 12,
    });

    expect(created.status).toBe(201);
    expect(created.body.data.summary).toMatchObject({
      totalCount: 48,
      paidCount: 12,
      remainingCount: 36,
    });

    const cancelled = await request(app)
      .post(`/api/v1/bills/${created.body.data.id}/cancel`)
      .set(headers);
    expect(cancelled.body.data.status).toBe("canceled");

    const deleted = await request(app).delete(`/api/v1/bills/${created.body.data.id}`).set(headers);
    expect(deleted.status).toBe(204);
  });

  it("returns a forecast", async () => {
    const context = await createAuthenticatedContext();
    const headers = createAuthHeaders(context.token, context.household.id);
    const today = formatISODate(getTodayInTimezone(context.householdContext.timezone));

    await request(app).post("/api/v1/bills").set(headers).send({
      name: "Internet",
      expectedAmount: 12_000,
      currencyCode: "BRL",
      frequency: "weekly",
      startDate: today,
    });

    const response = await request(app)
      .get("/api/v1/bills/forecast")
      .set(headers)
      .query({ from: today, to: "2099-01-01" });
    expect(response.status).toBe(200);
    expect(response.body.data.items.length).toBeGreaterThan(0);
  });

  it("shows unpaid bills in the upcoming transactions feed", async () => {
    const context = await createAuthenticatedContext();
    const headers = createAuthHeaders(context.token, context.household.id);
    const today = formatISODate(getTodayInTimezone(context.householdContext.timezone));

    await request(app).post("/api/v1/bills").set(headers).send({
      name: "Upcoming Gas",
      expectedAmount: 5_000,
      currencyCode: "BRL",
      frequency: "weekly",
      startDate: today,
    });

    const response = await request(app)
      .get("/api/v1/transactions/upcoming")
      .set(headers)
      .query({ search: "Upcoming Gas", perPage: 10 });

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThanOrEqual(4);
    expect(response.body.data[0]).toMatchObject({
      sourceType: "bill_occurrence",
      description: "Upcoming Gas",
      amount: 5_000,
      isOverdue: false,
    });

    const filtered = await request(app)
      .get("/api/v1/transactions/upcoming")
      .set(headers)
      .query({ search: "Upcoming Gas", accountIds: crypto.randomUUID() });
    expect(filtered.body.data).toHaveLength(0);
  });
});
