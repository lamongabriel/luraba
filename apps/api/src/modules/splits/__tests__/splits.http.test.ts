import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "@/app";
import * as accountsService from "@/modules/accounts/accounts.service";
import * as transactionsService from "@/modules/transactions/transactions.service";
import { createAuthenticatedContext, createAuthHeaders } from "@/test/auth";
import { buildAccountInput } from "@/test/factories";

function monthlyInstallments(count: number, amount: number, firstDue: string) {
  const [year, month, day] = firstDue.split("-").map(Number) as [number, number, number];
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 + index, day));
    return { dueDate: date.toISOString().slice(0, 10), expectedAmount: amount };
  });
}

describe("splits routes", () => {
  it("requires authentication", async () => {
    expect((await request(app).get("/api/v1/splits")).status).toBe(401);
  });

  it("splits a course across people and tracks who has paid", async () => {
    const context = await createAuthenticatedContext();
    const headers = createAuthHeaders(context.token, context.household.id);

    const created = await request(app)
      .post("/api/v1/splits")
      .set(headers)
      .send({
        title: "Programming course",
        totalAmount: 300_000,
        currencyCode: "BRL",
        participants: [
          { name: "Cousin", installments: monthlyInstallments(10, 15_000, "2020-01-03") },
          { name: "Pedro", installments: monthlyInstallments(2, 50_000, "2099-01-03") },
        ],
      });

    expect(created.status).toBe(201);
    const split = created.body.data;
    expect(split.participants).toHaveLength(2);
    const cousin = split.participants.find((p: { name: string }) => p.name === "Cousin");
    expect(cousin.installments).toHaveLength(10);
    expect(cousin.totals).toMatchObject({ owed: 150_000, outstanding: 150_000, overdueCount: 10 });
    expect(split.summary.unpaidParticipantNames).toEqual(["Cousin", "Pedro"]);

    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({ name: "Splits Checking", type: "cash", currencyCode: "BRL" }),
    );
    const income = await transactionsService.createTransaction(context.householdContext, {
      type: "income",
      description: "Cousin pix",
      amount: 15_000,
      currencyCode: "BRL",
      paymentMethodCode: "pix",
      accountId: account.id,
      purchaseDate: new Date(),
      postedDate: new Date(),
    });

    const [first, second, third, fourth] = cousin.installments;
    const base = `/api/v1/splits/${split.id}/installments`;

    const linked = await request(app)
      .post(`${base}/${first.id}/link`)
      .set(headers)
      .send({ transactionId: income.id });
    expect(linked.status).toBe(200);
    expect(linked.body.data).toMatchObject({ state: "received", transaction: { amount: 15_000 } });

    // One transaction can only settle one installment.
    const duplicate = await request(app)
      .post(`${base}/${second.id}/link`)
      .set(headers)
      .send({ transactionId: income.id });
    expect(duplicate.status).toBe(409);

    const skipped = await request(app).post(`${base}/${second.id}/skip`).set(headers);
    expect(skipped.body.data.state).toBe("skipped");
    const writtenOff = await request(app).post(`${base}/${third.id}/write-off`).set(headers);
    expect(writtenOff.body.data.state).toBe("written_off");

    // Grace period keeps a late installment from counting as overdue.
    const graced = await request(app)
      .patch(`${base}/${fourth.id}`)
      .set(headers)
      .send({ graceUntil: "2099-12-31" });
    expect(graced.body.data.state).toBe("scheduled");

    const detail = await request(app).get(`/api/v1/splits/${split.id}`).set(headers);
    const totals = detail.body.data.participants.find(
      (p: { name: string }) => p.name === "Cousin",
    ).totals;
    expect(totals).toMatchObject({
      received: 15_000,
      writtenOff: 15_000,
      receivedCount: 1,
      overdueCount: 6,
      owed: 135_000,
      outstanding: 105_000,
    });

    const reset = await request(app).post(`${base}/${first.id}/reset`).set(headers);
    expect(reset.body.data).toMatchObject({ state: "overdue", transaction: null });
  });

  it("rejects non-income transactions, adds people later, and deletes", async () => {
    const context = await createAuthenticatedContext();
    const headers = createAuthHeaders(context.token, context.household.id);

    const created = await request(app)
      .post("/api/v1/splits")
      .set(headers)
      .send({ title: "Trip", currencyCode: "BRL" });
    expect(created.status).toBe(201);
    const id = created.body.data.id;

    const added = await request(app)
      .post(`/api/v1/splits/${id}/participants`)
      .set(headers)
      .send({ name: "Ana", installments: monthlyInstallments(3, 10_000, "2099-02-10") });
    expect(added.status).toBe(201);
    expect(added.body.data.participants[0].installments).toHaveLength(3);

    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({ name: "Splits Spend", type: "cash", currencyCode: "BRL" }),
    );
    const expense = await transactionsService.createTransaction(context.householdContext, {
      type: "expense",
      description: "Not income",
      amount: 10_000,
      currencyCode: "BRL",
      paymentMethodCode: "pix",
      accountId: account.id,
      purchaseDate: new Date(),
      postedDate: new Date(),
    });
    const installment = added.body.data.participants[0].installments[0];
    const rejected = await request(app)
      .post(`/api/v1/splits/${id}/installments/${installment.id}/link`)
      .set(headers)
      .send({ transactionId: expense.id });
    expect(rejected.status).toBe(422);

    expect((await request(app).delete(`/api/v1/splits/${id}`).set(headers)).status).toBe(204);
    expect((await request(app).get(`/api/v1/splits/${id}`).set(headers)).status).toBe(404);
  });
});
