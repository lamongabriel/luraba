import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "@/app";
import * as categoriesService from "@/modules/categories/categories.service";
import { createAuthenticatedContext, createAuthHeaders } from "@/test/auth";
import { buildCategoryInput, buildCreditCardInput, createCreditCardOwner } from "@/test/factories";

type Context = Awaited<ReturnType<typeof createAuthenticatedContext>>;

async function setup(creditLimitAmount = 1_000_000) {
  const context = await createAuthenticatedContext();
  const category = await categoriesService.createCategory(
    context.householdContext,
    buildCategoryInput({ name: "Shopping", type: "expense" }),
  );
  const ownerAccount = await createCreditCardOwner(context.householdContext);
  const card = await request(app)
    .post("/api/v1/credit-cards")
    .set(createAuthHeaders(context.token, context.household.id))
    .send(
      buildCreditCardInput({
        ownerAccountId: ownerAccount.id,
        name: "Installment Card",
        closingDay: 25,
        dueDay: 5,
        creditLimitAmount,
      }),
    );
  return { context, category, cardId: card.body.data.id as string };
}

function headers(context: Context) {
  return createAuthHeaders(context.token, context.household.id);
}

async function purchase(
  context: Context,
  cardId: string,
  categoryId: string,
  body: Record<string, unknown>,
) {
  return request(app)
    .post(`/api/v1/credit-cards/${cardId}/purchases`)
    .set(headers(context))
    .send({
      description: "Mercado Livre",
      categoryId,
      purchaseDate: "2026-04-10",
      postedDate: "2026-04-10",
      includeInBudget: false,
      ...body,
    });
}

const amounts = (body: { installments: { amount: number }[] }) =>
  body.installments.map((installment) => installment.amount);

describe("card purchases with custom installment amounts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-12T12:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses the exact amounts sent and sums them into the total", async () => {
    const { context, category, cardId } = await setup();
    const response = await purchase(context, cardId, category.id, {
      installmentAmounts: [3406, 3406, 3406, 3406, 3406],
    });
    expect(response.status).toBe(201);
    expect(response.body.data.amount).toBe(17_030);
    expect(response.body.data.installmentCount).toBe(5);
    expect(amounts(response.body.data)).toEqual([3406, 3406, 3406, 3406, 3406]);
    const cycles = new Set(
      response.body.data.installments.map(
        (item: { billingCycleId: string }) => item.billingCycleId,
      ),
    );
    expect(cycles.size).toBe(5);
  });

  it("accepts a single installment amount with the count", async () => {
    const { context, category, cardId } = await setup();
    const response = await purchase(context, cardId, category.id, {
      installmentAmount: 3406,
      installmentCount: 5,
    });
    expect(response.status).toBe(201);
    expect(amounts(response.body.data)).toEqual([3406, 3406, 3406, 3406, 3406]);
    expect(response.body.data.amount).toBe(17_030);
  });

  it("supports every rounding mode and keeps the old split by default", async () => {
    const { context, category, cardId } = await setup();
    const base = { amount: 17_028, installmentCount: 5 };
    const last = await purchase(context, cardId, category.id, base);
    const first = await purchase(context, cardId, category.id, {
      ...base,
      roundingMode: "remainder_first",
    });
    const up = await purchase(context, cardId, category.id, {
      ...base,
      roundingMode: "round_up_all",
    });
    expect(amounts(last.body.data)).toEqual([3405, 3405, 3405, 3405, 3408]);
    expect(amounts(first.body.data)).toEqual([3408, 3405, 3405, 3405, 3405]);
    expect(amounts(up.body.data)).toEqual([3406, 3406, 3406, 3406, 3406]);
    expect(up.body.data.amount).toBe(17_030);
  });

  it("rejects an amount that disagrees with the installments, a bad count and zero amounts", async () => {
    const { context, category, cardId } = await setup();
    const mismatch = await purchase(context, cardId, category.id, {
      amount: 17_028,
      installmentAmounts: [3406, 3406, 3406, 3406, 3406],
    });
    expect(mismatch.status).toBe(422);
    const count = await purchase(context, cardId, category.id, {
      installmentAmounts: [100, 100],
      installmentCount: 3,
    });
    expect(count.status).toBe(422);
    const zero = await purchase(context, cardId, category.id, { installmentAmounts: [100, 0] });
    expect(zero.status).toBe(422);
    const many = await purchase(context, cardId, category.id, {
      amount: 100_000,
      installmentCount: 61,
    });
    expect(many.status).toBe(422);
  });

  it("edits one installment and the total, the invoice and the available limit follow", async () => {
    const { context, category, cardId } = await setup(100_000);
    const created = await purchase(context, cardId, category.id, {
      amount: 17_028,
      installmentCount: 5,
    });
    const purchaseId = created.body.data.purchaseId;
    const last = created.body.data.installments[4];
    expect(last.amount).toBe(3408);
    const before = await request(app).get(`/api/v1/credit-cards/${cardId}`).set(headers(context));

    const edited = await request(app)
      .patch(
        `/api/v1/credit-cards/${cardId}/purchases/${purchaseId}/installments/${last.installmentId}`,
      )
      .set(headers(context))
      .send({ amount: 3406 });
    expect(edited.status).toBe(200);
    expect(amounts(edited.body.data)).toEqual([3405, 3405, 3405, 3405, 3406]);
    expect(edited.body.data.amount).toBe(17_026);

    const after = await request(app).get(`/api/v1/credit-cards/${cardId}`).set(headers(context));
    expect(after.body.data.remainingCreditAmount).toBe(before.body.data.remainingCreditAmount + 2);

    const cycle = await request(app)
      .get(`/api/v1/credit-cards/${cardId}/cycles/${last.billingCycleId}`)
      .set(headers(context));
    expect(cycle.body.data.cycle.statementAmount).toBe(3406);
  });

  it("can move an installment to another invoice and rejects another card's invoice", async () => {
    const { context, category, cardId } = await setup();
    const created = await purchase(context, cardId, category.id, {
      amount: 3000,
      installmentCount: 3,
    });
    const [first, second] = created.body.data.installments;
    const moved = await request(app)
      .patch(
        `/api/v1/credit-cards/${cardId}/purchases/${created.body.data.purchaseId}/installments/${first.installmentId}`,
      )
      .set(headers(context))
      .send({ billingCycleId: second.billingCycleId });
    expect(moved.status).toBe(200);
    expect(moved.body.data.installments[0].billingCycleId).toBe(second.billingCycleId);
    const missing = await request(app)
      .patch(
        `/api/v1/credit-cards/${cardId}/purchases/${created.body.data.purchaseId}/installments/${first.installmentId}`,
      )
      .set(headers(context))
      .send({ billingCycleId: "00000000-0000-4000-8000-000000000000" });
    expect(missing.status).toBe(404);
  });

  it("replaces the whole list through the purchase update and keeps custom amounts on text edits", async () => {
    const { context, category, cardId } = await setup();
    const created = await purchase(context, cardId, category.id, {
      amount: 10_000,
      installmentCount: 4,
    });
    const path = `/api/v1/credit-cards/${cardId}/purchases/${created.body.data.purchaseId}`;
    const replaced = await request(app)
      .patch(path)
      .set(headers(context))
      .send({ installmentAmounts: [2501, 2501, 2501, 2501] });
    expect(replaced.status).toBe(200);
    expect(amounts(replaced.body.data)).toEqual([2501, 2501, 2501, 2501]);
    expect(replaced.body.data.amount).toBe(10_004);
    const renamed = await request(app)
      .patch(path)
      .set(headers(context))
      .send({ description: "Renamed", notes: "Gift", originalDescription: "MERCADOLIVRE*4X" });
    expect(renamed.status).toBe(200);
    expect(amounts(renamed.body.data)).toEqual([2501, 2501, 2501, 2501]);
    expect(renamed.body.data).toMatchObject({ description: "Renamed", notes: "Gift" });
  });

  it("changes the count without touching installments already on a closed invoice", async () => {
    const { context, category, cardId } = await setup();
    // Posted in January, today is April 12: the January, February and March invoices (closing on the 25th) are closed.
    const created = await purchase(context, cardId, category.id, {
      purchaseDate: "2026-01-10",
      postedDate: "2026-01-10",
      installmentAmounts: [1001, 1002, 1003, 1004, 1005, 1006],
    });
    expect(created.status).toBe(201);
    const path = `/api/v1/credit-cards/${cardId}/purchases/${created.body.data.purchaseId}`;
    const grown = await request(app)
      .patch(path)
      .set(headers(context))
      .send({ installmentCount: 8 });
    expect(grown.status).toBe(200);
    const result = amounts(grown.body.data);
    expect(result).toHaveLength(8);
    expect(result.slice(0, 3)).toEqual([1001, 1002, 1003]);
    expect(result.reduce((total, value) => total + value, 0)).toBe(6021);

    const tooFew = await request(app)
      .patch(path)
      .set(headers(context))
      .send({ installmentCount: 3 });
    expect(tooFew.status).toBe(422);
  });

  it("credits the edited total when the purchase is cancelled afterwards", async () => {
    const { context, category, cardId } = await setup();
    const created = await purchase(context, cardId, category.id, {
      amount: 17_028,
      installmentCount: 5,
    });
    const last = created.body.data.installments[4];
    const purchasePath = `/api/v1/credit-cards/${cardId}/purchases/${created.body.data.purchaseId}`;
    await request(app)
      .patch(`${purchasePath}/installments/${last.installmentId}`)
      .set(headers(context))
      .send({ amount: 3406 });
    const cancelled = await request(app)
      .post(`${purchasePath}/cancel`)
      .set(headers(context))
      .send({ mode: "single_credit", reason: "cancellation" });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.refund.amount).toBe(17_026);
  });
});
