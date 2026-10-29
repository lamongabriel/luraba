import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "@/app";
import * as accountsService from "@/modules/accounts/accounts.service";
import * as transactionsService from "@/modules/transactions/transactions.service";
import { createAuthenticatedContext, createAuthHeaders } from "@/test/auth";
import { buildAccountInput } from "@/test/factories";

const iso = (date: Date) => date.toISOString().slice(0, 10);
const monthsFromNow = (months: number) => {
  const now = new Date();
  return iso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + months, 1)));
};
const today = () => iso(new Date());

async function setup(role: "owner" | "viewer" = "owner") {
  const context = await createAuthenticatedContext({ role });
  const headers = createAuthHeaders(context.token, context.household.id);
  const account = await accountsService.createAccount(
    context.householdContext,
    buildAccountInput({ name: "Goals Checking", type: "cash", currencyCode: "BRL" }),
  );
  const expense = (amount: number, currencyCode = "BRL") =>
    transactionsService.createTransaction(context.householdContext, {
      type: "expense",
      description: "Moved to savings",
      amount,
      currencyCode,
      paymentMethodCode: "pix",
      accountId: account.id,
      purchaseDate: new Date(),
      postedDate: new Date(),
    });
  return { context, headers, account, expense };
}

describe("goals routes", () => {
  it("requires authentication", async () => {
    expect((await request(app).get("/api/v1/goals")).status).toBe(401);
  });

  it("tracks a savings goal from empty to achieved", async () => {
    const { headers } = await setup();

    const created = await request(app)
      .post("/api/v1/goals")
      .set(headers)
      .send({
        name: "Emergency fund",
        targetAmount: 500_000,
        currencyCode: "BRL",
        startDate: monthsFromNow(-2),
        targetDate: monthsFromNow(10),
      });
    expect(created.status).toBe(201);
    const goal = created.body.data;
    expect(goal).toMatchObject({
      kind: "savings",
      status: "active",
      state: "behind", // two of twelve months gone and nothing saved
      saved: 0,
      estimate: { remaining: 500_000, percent: 0, onTrack: false },
    });
    expect(goal.estimate.requiredMonthly).toBe(Math.ceil(500_000 / goal.estimate.monthsLeft));
    expect(goal.estimate.projectedCompletionDate).toBeNull();

    // A date and a monthly amount are two ways to plan the same thing: pick one.
    const both = await request(app)
      .patch(`/api/v1/goals/${goal.id}`)
      .set(headers)
      .send({ monthlyContribution: 100_000 });
    expect(both.status).toBe(422);
    const switched = await request(app)
      .patch(`/api/v1/goals/${goal.id}`)
      .set(headers)
      .send({ targetDate: null, monthlyContribution: 100_000 });
    expect(switched.body.data).toMatchObject({
      targetDate: null,
      state: "open",
      estimate: { requiredMonthly: null },
    });
    expect(switched.body.data.estimate.projectedCompletionDate).not.toBeNull();
    const back = await request(app)
      .patch(`/api/v1/goals/${goal.id}`)
      .set(headers)
      .send({ targetDate: monthsFromNow(10), monthlyContribution: null });
    expect(back.status).toBe(200);

    const base = `/api/v1/goals/${goal.id}/contributions`;
    const first = await request(app)
      .post(base)
      .set(headers)
      .send({ amount: 200_000, contributedOn: today(), note: "Bonus" });
    expect(first.status).toBe(201);
    expect(first.body.data).toMatchObject({
      saved: 200_000,
      contributionCount: 1,
      estimate: { remaining: 300_000, percent: 40 },
    });

    const second = await request(app)
      .post(base)
      .set(headers)
      .send({ amount: 300_000, contributedOn: today() });
    expect(second.body.data).toMatchObject({
      saved: 500_000,
      state: "achieved",
      achievedOn: today(),
      estimate: { remaining: 0, percent: 100 },
    });

    // Taking money out drops the goal back below the target.
    const withdrawn = await request(app)
      .post(base)
      .set(headers)
      .send({ amount: -100_000, contributedOn: today() });
    expect(withdrawn.body.data).toMatchObject({ saved: 400_000, achievedOn: null });
    expect(withdrawn.body.data.state).not.toBe("achieved");

    const withdrawal = withdrawn.body.data.contributions.find(
      (item: { amount: number }) => item.amount === -100_000,
    );
    const removed = await request(app).delete(`${base}/${withdrawal.id}`).set(headers);
    expect(removed.status).toBe(200);
    expect(removed.body.data).toMatchObject({ saved: 500_000, state: "achieved" });

    const timeline = removed.body.data.timeline;
    expect(timeline.length).toBeGreaterThan(2);
    expect(timeline.find((point: { date: string }) => point.date === today())).toMatchObject({
      actual: 500_000,
    });

    const listed = await request(app).get("/api/v1/goals").set(headers);
    expect(listed.status).toBe(200);
    expect(listed.body.data).toHaveLength(1);
    expect(listed.body.data[0]).toMatchObject({ id: goal.id, state: "achieved", saved: 500_000 });
    expect(listed.body.data[0].contributions).toBeUndefined();
  });

  it("plans an investment with a one-off start and monthly deposits", async () => {
    const { headers } = await setup();

    const created = await request(app).post("/api/v1/goals").set(headers).send({
      name: "Index fund",
      kind: "investment",
      targetAmount: 650_000,
      currencyCode: "BRL",
      monthlyContribution: 10_000,
      expectedReturnBps: 1200,
    });
    expect(created.status).toBe(201);
    const id = created.body.data.id;

    const seeded = await request(app)
      .post(`/api/v1/goals/${id}/contributions`)
      .set(headers)
      .send({ amount: 500_000, contributedOn: today() });
    const withReturn = seeded.body.data.estimate;

    const flat = await request(app)
      .patch(`/api/v1/goals/${id}`)
      .set(headers)
      .send({ expectedReturnBps: null });
    const withoutReturn = flat.body.data.estimate;

    // 150k to go at 10k a month is 15 months flat; a return gets there sooner.
    expect(withReturn.projectedCompletionDate < withoutReturn.projectedCompletionDate).toBe(true);
    expect(withReturn.remaining).toBe(150_000);

    const savingsWithReturn = await request(app).post("/api/v1/goals").set(headers).send({
      name: "Piggy bank",
      targetAmount: 1000,
      currencyCode: "BRL",
      expectedReturnBps: 500,
    });
    expect(savingsWithReturn.status).toBe(422);

    const backToSavings = await request(app)
      .patch(`/api/v1/goals/${id}`)
      .set(headers)
      .send({ kind: "savings" });
    expect(backToSavings.body.data.expectedReturnBps).toBeNull();
  });

  it("backs a contribution with a transaction", async () => {
    const { headers, expense } = await setup();
    const goalId = (
      await request(app)
        .post("/api/v1/goals")
        .set(headers)
        .send({ name: "Trip", targetAmount: 300_000, currencyCode: "BRL" })
    ).body.data.id;
    const base = `/api/v1/goals/${goalId}/contributions`;

    const transaction = await expense(100_000);
    const linked = await request(app)
      .post(base)
      .set(headers)
      .send({ transactionId: transaction.id });
    expect(linked.status).toBe(201);
    expect(linked.body.data.saved).toBe(100_000);
    expect(linked.body.data.contributions[0]).toMatchObject({
      amount: 100_000,
      contributedOn: today(),
      transaction: { id: transaction.id, amount: 100_000 },
    });

    const again = await request(app)
      .post(base)
      .set(headers)
      .send({ transactionId: transaction.id });
    expect(again.status).toBe(409);

    // Part of a bigger transaction, but never more than it moved.
    const big = await expense(200_000);
    const partial = await request(app)
      .post(base)
      .set(headers)
      .send({ transactionId: big.id, amount: 50_000 });
    expect(partial.body.data.saved).toBe(150_000);
    const tooMuch = await request(app)
      .post(base)
      .set(headers)
      .send({ transactionId: (await expense(10_000)).id, amount: 20_000 });
    expect(tooMuch.status).toBe(422);

    const contribution = partial.body.data.contributions.find(
      (item: { transaction: { id: string } | null }) => item.transaction?.id === big.id,
    );
    const unlinked = await request(app)
      .patch(`${base}/${contribution.id}`)
      .set(headers)
      .send({ transactionId: null, amount: 60_000, note: "Cash instead" });
    expect(unlinked.body.data.saved).toBe(160_000);
    expect(
      unlinked.body.data.contributions.find((item: { id: string }) => item.id === contribution.id),
    ).toMatchObject({ transaction: null, note: "Cash instead" });

    const missing = await request(app).post(base).set(headers).send({});
    expect(missing.status).toBe(422);
  });

  it("keeps goals inside their household", async () => {
    const mine = await setup();
    const theirs = await setup();
    const goalId = (
      await request(app)
        .post("/api/v1/goals")
        .set(mine.headers)
        .send({ name: "Private", targetAmount: 1000, currencyCode: "BRL" })
    ).body.data.id;

    expect((await request(app).get(`/api/v1/goals/${goalId}`).set(theirs.headers)).status).toBe(
      404,
    );
    expect(
      (
        await request(app)
          .post(`/api/v1/goals/${goalId}/contributions`)
          .set(theirs.headers)
          .send({ amount: 100, contributedOn: today() })
      ).status,
    ).toBe(404);
    expect((await request(app).delete(`/api/v1/goals/${goalId}`).set(theirs.headers)).status).toBe(
      404,
    );

    const foreignTransaction = await theirs.expense(5000);
    const linkedElsewhere = await request(app)
      .post(`/api/v1/goals/${goalId}/contributions`)
      .set(mine.headers)
      .send({ transactionId: foreignTransaction.id });
    expect(linkedElsewhere.status).toBe(404);

    const foreignAccount = await request(app).post("/api/v1/goals").set(mine.headers).send({
      name: "Wrong account",
      targetAmount: 1000,
      currencyCode: "BRL",
      accountId: theirs.account.id,
    });
    expect(foreignAccount.status).toBe(404);
  });

  it("pauses, rejects a reversed date range, and deletes", async () => {
    const { headers } = await setup();

    const reversed = await request(app).post("/api/v1/goals").set(headers).send({
      name: "Backwards",
      targetAmount: 1000,
      currencyCode: "BRL",
      startDate: "2030-06-01",
      targetDate: "2030-01-01",
    });
    expect(reversed.status).toBe(422);

    const id = (
      await request(app)
        .post("/api/v1/goals")
        .set(headers)
        .send({ name: "Car", targetAmount: 90_000, currencyCode: "BRL" })
    ).body.data.id;

    const paused = await request(app)
      .patch(`/api/v1/goals/${id}`)
      .set(headers)
      .send({ status: "paused" });
    expect(paused.body.data).toMatchObject({ status: "paused", state: "paused" });
    const onlyActive = await request(app).get("/api/v1/goals?status=active").set(headers);
    expect(onlyActive.body.data).toHaveLength(0);

    expect((await request(app).delete(`/api/v1/goals/${id}`).set(headers)).status).toBe(204);
    expect((await request(app).get(`/api/v1/goals/${id}`).set(headers)).status).toBe(404);
  });

  it("lets viewers read but not change goals", async () => {
    const owner = await setup();
    const id = (
      await request(app)
        .post("/api/v1/goals")
        .set(owner.headers)
        .send({ name: "Shared", targetAmount: 1000, currencyCode: "BRL" })
    ).body.data.id;
    expect(id).toBeTruthy();

    const viewer = await setup("viewer");
    expect((await request(app).get("/api/v1/goals").set(viewer.headers)).status).toBe(200);
    const denied = await request(app)
      .post("/api/v1/goals")
      .set(viewer.headers)
      .send({ name: "Nope", targetAmount: 1000, currencyCode: "BRL" });
    expect(denied.status).toBe(403);
  });
});
