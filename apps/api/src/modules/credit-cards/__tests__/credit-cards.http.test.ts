import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import app from "@/app";
import * as accountsService from "@/modules/accounts/accounts.service";
import * as categoriesService from "@/modules/categories/categories.service";
import * as creditCardsService from "@/modules/credit-cards/credit-cards.service";
import * as brandfetchService from "@/modules/integrations/brandfetch/brandfetch.service";
import * as tagsService from "@/modules/tags/tags.service";
import { createAuthenticatedContext, createAuthHeaders } from "@/test/auth";
import {
  buildAccountInput,
  buildCategoryInput,
  buildCreditCardInput,
  buildTagInput,
  createBalanceEntryForAccount,
  createCreditCardOwner,
} from "@/test/factories";

describe("credit cards routes", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("POST /api/v1/credit-cards reuses account institution branding logic", async () => {
    const context = await createAuthenticatedContext();
    const ownerAccount = await createCreditCardOwner(context.householdContext);
    vi.spyOn(global, "fetch").mockResolvedValue(new Response("ok", { status: 200 }));

    await brandfetchService.updateBrandfetchIntegration(context.householdContext, {
      clientId: "brandfetch-client-id",
    });

    const response = await request(app)
      .post("/api/v1/credit-cards")
      .set(createAuthHeaders(context.token, context.household.id))
      .send(
        buildCreditCardInput({
          ownerAccountId: ownerAccount.id,
          name: "HTTP Nu Card",
          institutionName: "Nubank",
          institutionDomain: "https://www.nubank.com.br/cartao",
        }),
      );

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        institutionDomain: "nubank.com.br",
        institutionLogoUrl:
          "https://cdn.brandfetch.io/nubank.com.br/icon.png?c=brandfetch-client-id",
      }),
    );
  });

  it("GET /api/v1/credit-cards serializes list filters and pagination metadata", async () => {
    const context = await createAuthenticatedContext();
    const ownerAccount = await createCreditCardOwner(context.householdContext);
    const card = await creditCardsService.createCreditCard(
      context.householdContext,
      buildCreditCardInput({
        ownerAccountId: ownerAccount.id,
        name: "HTTP Filter Card",
        brand: "Visa",
        closingDay: 25,
        dueDay: 5,
        creditLimitAmount: 50_000,
      }),
    );

    const response = await request(app)
      .get("/api/v1/credit-cards")
      .set(createAuthHeaders(context.token, context.household.id))
      .query({
        page: 1,
        perPage: 1,
        search: "Filter Card",
        sort: "name",
        brands: "Visa",
        currencyCodes: "BRL",
        ownerAccountIds: card.ownerAccountId,
        closingDays: "25",
        dueDays: "5",
        creditLimitMin: 50_000,
        creditLimitMax: 50_000,
        hasCreditLimit: true,
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([expect.objectContaining({ id: card.id })]);
    expect(response.body.meta.pagination).toEqual({
      page: 1,
      perPage: 1,
      totalCount: 1,
      totalPages: 1,
    });
  });

  it("GET /api/v1/credit-cards/:id/cycles returns enriched cycle fields", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-30T12:00:00.000Z"));

    const context = await createAuthenticatedContext();
    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: "Shopping", type: "expense" }),
    );
    const ownerAccount = await createCreditCardOwner(context.householdContext);

    const createdCard = await request(app)
      .post("/api/v1/credit-cards")
      .set(createAuthHeaders(context.token, context.household.id))
      .send(
        buildCreditCardInput({
          ownerAccountId: ownerAccount.id,
          name: "HTTP Card",
          closingDay: 25,
          dueDay: 5,
        }),
      );

    await request(app)
      .post(`/api/v1/credit-cards/${createdCard.body.data.id}/purchases`)
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        description: "Shoes",
        amount: 20_000,
        categoryId: category.id,
        purchaseDate: "2026-04-20",
        postedDate: "2026-04-20",
        installmentCount: 1,
      });

    const response = await request(app)
      .get(`/api/v1/credit-cards/${createdCard.body.data.id}/cycles`)
      .query({ scope: "all" })
      .set(createAuthHeaders(context.token, context.household.id));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          displayStatus: "due",
          isCurrent: false,
          isNext: false,
          hasActivity: true,
          statementAmount: 20_000,
          remainingAmount: 20_000,
        }),
      ]),
    );
  });

  it("GET/PATCH/DELETE purchase routes work through the credit card module", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-10T12:00:00.000Z"));

    const context = await createAuthenticatedContext();
    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: "Tech", type: "expense" }),
    );
    const updatedCategory = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: "Office", type: "expense" }),
    );
    const initialTag = await tagsService.createTag(
      context.householdContext,
      buildTagInput({ name: "Desk setup" }),
    );
    const updatedTag = await tagsService.createTag(
      context.householdContext,
      buildTagInput({ name: "Work equipment" }),
    );
    const ownerAccount = await createCreditCardOwner(context.householdContext);

    const createdCard = await request(app)
      .post("/api/v1/credit-cards")
      .set(createAuthHeaders(context.token, context.household.id))
      .send(
        buildCreditCardInput({
          ownerAccountId: ownerAccount.id,
          name: "HTTP Purchase Card",
          closingDay: 25,
          dueDay: 5,
        }),
      );

    const createdPurchase = await request(app)
      .post(`/api/v1/credit-cards/${createdCard.body.data.id}/purchases`)
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        description: "Desk",
        amount: 50_000,
        categoryId: category.id,
        purchaseDate: "2026-04-20",
        postedDate: "2026-04-20",
        installmentCount: 1,
        includeInBudget: false,
        tagIds: [initialTag.id],
      });

    expect(createdPurchase.status).toBe(201);
    expect(createdPurchase.body.data).toEqual(
      expect.objectContaining({
        includeInBudget: false,
        tags: [expect.objectContaining({ id: initialTag.id })],
      }),
    );

    const getResponse = await request(app)
      .get(
        `/api/v1/credit-cards/${createdCard.body.data.id}/purchases/${createdPurchase.body.data.purchaseId}`,
      )
      .set(createAuthHeaders(context.token, context.household.id));

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.data).toEqual(
      expect.objectContaining({
        description: "Desk",
        categoryId: category.id,
      }),
    );

    const patchResponse = await request(app)
      .patch(
        `/api/v1/credit-cards/${createdCard.body.data.id}/purchases/${createdPurchase.body.data.purchaseId}`,
      )
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        description: "Standing Desk",
        categoryId: updatedCategory.id,
        amount: 55_000,
        installmentCount: 2,
        postedDate: "2026-04-29",
        includeInBudget: true,
        tagIds: [updatedTag.id],
      });

    expect(patchResponse.status).toBe(200);
    expect(patchResponse.body.data).toEqual(
      expect.objectContaining({
        description: "Standing Desk",
        categoryId: updatedCategory.id,
        amount: 55_000,
        installmentCount: 2,
        includeInBudget: true,
        tags: [expect.objectContaining({ id: updatedTag.id })],
      }),
    );

    const deleteResponse = await request(app)
      .delete(
        `/api/v1/credit-cards/${createdCard.body.data.id}/purchases/${createdPurchase.body.data.purchaseId}`,
      )
      .set(createAuthHeaders(context.token, context.household.id));

    expect(deleteResponse.status).toBe(204);
  });

  it("GET/PATCH/DELETE payment routes work through the credit card module", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-30T12:00:00.000Z"));

    const context = await createAuthenticatedContext();
    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: "Utilities", type: "expense" }),
    );
    const sourceAccount = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({ name: "HTTP Checking A", type: "cash", currencyCode: "BRL" }),
    );
    const secondSourceAccount = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({ name: "HTTP Checking B", type: "cash", currencyCode: "BRL" }),
    );
    await createBalanceEntryForAccount({
      householdId: context.household.id,
      accountId: sourceAccount.id,
      amount: 100_000,
    });
    await createBalanceEntryForAccount({
      householdId: context.household.id,
      accountId: secondSourceAccount.id,
      amount: 100_000,
    });

    const createdCard = await request(app)
      .post("/api/v1/credit-cards")
      .set(createAuthHeaders(context.token, context.household.id))
      .send(
        buildCreditCardInput({
          name: "HTTP Payment Card",
          closingDay: 25,
          dueDay: 5,
          ownerAccountId: sourceAccount.id,
        }),
      );

    await request(app)
      .post(`/api/v1/credit-cards/${createdCard.body.data.id}/purchases`)
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        description: "Water bill",
        amount: 10_000,
        categoryId: category.id,
        purchaseDate: "2026-04-20",
        postedDate: "2026-04-20",
        installmentCount: 1,
      });

    const createdPayment = await request(app)
      .post(`/api/v1/credit-cards/${createdCard.body.data.id}/payments`)
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        description: "HTTP payment",
        amount: 10_000,
        fromAccountId: sourceAccount.id,
        paymentDate: "2026-04-30",
      });

    expect(createdPayment.status).toBe(201);

    const getResponse = await request(app)
      .get(
        `/api/v1/credit-cards/${createdCard.body.data.id}/payments/${createdPayment.body.data.paymentId}`,
      )
      .set(createAuthHeaders(context.token, context.household.id));

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.data).toEqual(
      expect.objectContaining({
        description: "HTTP payment",
        amount: 10_000,
        fromAccountId: sourceAccount.id,
      }),
    );

    const patchResponse = await request(app)
      .patch(
        `/api/v1/credit-cards/${createdCard.body.data.id}/payments/${createdPayment.body.data.paymentId}`,
      )
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        description: "Updated HTTP payment",
        amount: 8_000,
        fromAccountId: secondSourceAccount.id,
      });

    expect(patchResponse.status).toBe(200);
    expect(patchResponse.body.data).toEqual(
      expect.objectContaining({
        description: "Updated HTTP payment",
        amount: 8_000,
        fromAccountId: secondSourceAccount.id,
      }),
    );

    const deleteResponse = await request(app)
      .delete(
        `/api/v1/credit-cards/${createdCard.body.data.id}/payments/${createdPayment.body.data.paymentId}`,
      )
      .set(createAuthHeaders(context.token, context.household.id));

    expect(deleteResponse.status).toBe(204);
  });

  it("POST /api/v1/credit-cards/:id/payments rejects overpayments", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-30T12:00:00.000Z"));

    const context = await createAuthenticatedContext();
    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: "Utilities", type: "expense" }),
    );
    const sourceAccount = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({ name: "HTTP Checking", type: "cash", currencyCode: "BRL" }),
    );
    await createBalanceEntryForAccount({
      householdId: context.household.id,
      accountId: sourceAccount.id,
      amount: 100_000,
    });

    const createdCard = await request(app)
      .post("/api/v1/credit-cards")
      .set(createAuthHeaders(context.token, context.household.id))
      .send(
        buildCreditCardInput({
          name: "HTTP Payment Limit Card",
          closingDay: 25,
          dueDay: 5,
          ownerAccountId: sourceAccount.id,
        }),
      );

    await request(app)
      .post(`/api/v1/credit-cards/${createdCard.body.data.id}/purchases`)
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        description: "Water bill",
        amount: 10_000,
        categoryId: category.id,
        purchaseDate: "2026-04-20",
        postedDate: "2026-04-20",
        installmentCount: 1,
      });

    const response = await request(app)
      .post(`/api/v1/credit-cards/${createdCard.body.data.id}/payments`)
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        description: "HTTP overpayment",
        amount: 15_000,
        fromAccountId: sourceAccount.id,
        paymentDate: "2026-04-30",
      });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /api/v1/credit-cards/:id/purchases enforces the remaining credit limit", async () => {
    const context = await createAuthenticatedContext();
    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: "Tech", type: "expense" }),
    );
    const ownerAccount = await createCreditCardOwner(context.householdContext);

    const createdCard = await request(app)
      .post("/api/v1/credit-cards")
      .set(createAuthHeaders(context.token, context.household.id))
      .send(
        buildCreditCardInput({
          ownerAccountId: ownerAccount.id,
          name: "HTTP Limit Card",
          closingDay: 25,
          dueDay: 5,
          creditLimitAmount: 50_000,
        }),
      );

    expect(createdCard.body.data).toEqual(
      expect.objectContaining({
        creditLimitAmount: 50_000,
        remainingCreditAmount: 50_000,
      }),
    );

    const firstPurchase = await request(app)
      .post(`/api/v1/credit-cards/${createdCard.body.data.id}/purchases`)
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        description: "Laptop",
        amount: 40_000,
        categoryId: category.id,
        purchaseDate: "2026-04-20",
        postedDate: "2026-04-20",
        installmentCount: 4,
      });

    expect(firstPurchase.status).toBe(201);

    const secondPurchase = await request(app)
      .post(`/api/v1/credit-cards/${createdCard.body.data.id}/purchases`)
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        description: "Headphones",
        amount: 15_000,
        categoryId: category.id,
        purchaseDate: "2026-04-21",
        postedDate: "2026-04-21",
        installmentCount: 1,
      });

    expect(secondPurchase.status).toBe(422);
    expect(secondPurchase.body.success).toBe(false);
    expect(secondPurchase.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("isolates cards, cycles, purchases, and payments across households", async () => {
    const owner = await createAuthenticatedContext();
    const outsider = await createAuthenticatedContext();
    const category = await categoriesService.createCategory(
      owner.householdContext,
      buildCategoryInput({ name: "Isolated Card Category", type: "expense" }),
    );
    const source = await accountsService.createAccount(
      owner.householdContext,
      buildAccountInput({ name: "Isolated Card Source", type: "cash" }),
    );
    await createBalanceEntryForAccount({
      householdId: owner.household.id,
      accountId: source.id,
      amount: 50_000,
    });
    const ownerAccount = source;
    const card = await request(app)
      .post("/api/v1/credit-cards")
      .set(createAuthHeaders(owner.token, owner.household.id))
      .send(buildCreditCardInput({ name: "Isolated Card", ownerAccountId: ownerAccount.id }));
    const cardId = card.body.data.id;
    const purchase = await request(app)
      .post(`/api/v1/credit-cards/${cardId}/purchases`)
      .set(createAuthHeaders(owner.token, owner.household.id))
      .send({
        description: "Isolated purchase",
        amount: 10_000,
        categoryId: category.id,
        purchaseDate: "2026-07-20",
        postedDate: "2026-07-20",
        installmentCount: 1,
      });
    const payment = await request(app)
      .post(`/api/v1/credit-cards/${cardId}/payments`)
      .set(createAuthHeaders(owner.token, owner.household.id))
      .send({
        amount: 5_000,
        fromAccountId: source.id,
        paymentDate: "2026-07-30",
        postedDate: "2026-07-30",
      });
    const purchaseId = purchase.body.data.purchaseId;
    const paymentId = payment.body.data.paymentId;
    const outsiderHeaders = createAuthHeaders(outsider.token, outsider.household.id);

    const responses = await Promise.all([
      request(app)
        .get("/api/v1/credit-cards")
        .set(createAuthHeaders(outsider.token, owner.household.id)),
      request(app).get(`/api/v1/credit-cards/${cardId}`).set(outsiderHeaders),
      request(app).patch(`/api/v1/credit-cards/${cardId}`).set(outsiderHeaders).send({
        name: "Leaked",
      }),
      request(app).delete(`/api/v1/credit-cards/${cardId}`).set(outsiderHeaders),
      request(app).get(`/api/v1/credit-cards/${cardId}/cycles`).set(outsiderHeaders),
      request(app)
        .get(`/api/v1/credit-cards/${cardId}/purchases/${purchaseId}`)
        .set(outsiderHeaders),
      request(app)
        .patch(`/api/v1/credit-cards/${cardId}/purchases/${purchaseId}`)
        .set(outsiderHeaders)
        .send({ description: "Leaked" }),
      request(app)
        .delete(`/api/v1/credit-cards/${cardId}/purchases/${purchaseId}`)
        .set(outsiderHeaders),
      request(app).get(`/api/v1/credit-cards/${cardId}/payments/${paymentId}`).set(outsiderHeaders),
      request(app)
        .patch(`/api/v1/credit-cards/${cardId}/payments/${paymentId}`)
        .set(outsiderHeaders)
        .send({ description: "Leaked" }),
      request(app)
        .delete(`/api/v1/credit-cards/${cardId}/payments/${paymentId}`)
        .set(outsiderHeaders),
    ]);

    expect(responses[0].status).toBe(403);
    for (const response of responses.slice(1)) {
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    }
  });
  it("GET /api/v1/credit-cards/overview summarizes the month's invoices and the limit used", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-30T12:00:00.000Z"));

    const context = await createAuthenticatedContext();
    const headers = createAuthHeaders(context.token, context.household.id);
    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: "Electronics", type: "expense" }),
    );
    const ownerAccount = await createCreditCardOwner(context.householdContext);
    const createdCard = await request(app)
      .post("/api/v1/credit-cards")
      .set(headers)
      .send(
        buildCreditCardInput({
          ownerAccountId: ownerAccount.id,
          name: "Chase Sapphire",
          closingDay: 25,
          dueDay: 5,
          creditLimitAmount: 100_000,
        }),
      );
    const cardId = createdCard.body.data.id;
    const purchase = (description: string, amount: number, date: string, installments: number) =>
      request(app).post(`/api/v1/credit-cards/${cardId}/purchases`).set(headers).send({
        description,
        amount,
        categoryId: category.id,
        purchaseDate: date,
        postedDate: date,
        installmentCount: installments,
      });
    await purchase("Headphones", 20_000, "2026-04-20", 1);
    await purchase("Laptop", 30_000, "2026-04-28", 3);

    const response = await request(app)
      .get("/api/v1/credit-cards/overview")
      .query({ month: "2026-05" })
      .set(headers);

    expect(response.status).toBe(200);
    expect(response.body.data.month).toBe("2026-05");
    expect(response.body.data.cards).toHaveLength(1);
    expect(response.body.data.cards[0]).toMatchObject({
      name: "Chase Sapphire",
      invoice: {
        dueDate: "2026-05-05",
        displayStatus: "due",
        statementAmount: 20_000,
        remainingAmount: 20_000,
      },
      limit: {
        limit: 100_000,
        closedInvoice: 20_000,
        openInvoice: 10_000,
        futureInvoices: 20_000,
        used: 50_000,
        available: 50_000,
      },
    });
    expect(response.body.data.totals).toEqual([
      expect.objectContaining({ invoiceAmount: 20_000, invoiceRemainingAmount: 20_000 }),
    ]);

    // Without a month it opens on the closed, unpaid invoice rather than the calendar month.
    const defaulted = await request(app).get("/api/v1/credit-cards/overview").set(headers);
    expect(defaulted.body.data.month).toBe("2026-05");
    expect(defaulted.body.data.cards[0].invoice.displayStatus).toBe("due");
  });

  it("GET /api/v1/credit-cards/overview rejects months too far ahead and bad formats", async () => {
    const context = await createAuthenticatedContext();
    const headers = createAuthHeaders(context.token, context.household.id);
    const ownerAccount = await createCreditCardOwner(context.householdContext);
    await request(app)
      .post("/api/v1/credit-cards")
      .set(headers)
      .send(buildCreditCardInput({ ownerAccountId: ownerAccount.id }));

    const badFormat = await request(app)
      .get("/api/v1/credit-cards/overview")
      .query({ month: "2026-13" })
      .set(headers);
    const tooFar = await request(app)
      .get("/api/v1/credit-cards/overview")
      .query({ month: "2099-01" })
      .set(headers);

    expect(badFormat.status).toBe(422);
    expect(tooFar.status).toBe(422);
  });

  it("GET /api/v1/credit-cards/:id/cycles/:cycleId lists the payments applied to the invoice", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-30T12:00:00.000Z"));

    const context = await createAuthenticatedContext();
    const headers = createAuthHeaders(context.token, context.household.id);
    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: "Groceries", type: "expense" }),
    );
    const ownerAccount = await createCreditCardOwner(context.householdContext);
    await createBalanceEntryForAccount({
      householdId: context.household.id,
      accountId: ownerAccount.id,
      amount: 500_000,
    });
    const createdCard = await request(app)
      .post("/api/v1/credit-cards")
      .set(headers)
      .send(buildCreditCardInput({ ownerAccountId: ownerAccount.id, closingDay: 25, dueDay: 5 }));
    const cardId = createdCard.body.data.id;
    await request(app).post(`/api/v1/credit-cards/${cardId}/purchases`).set(headers).send({
      description: "Weekly shop",
      amount: 20_000,
      categoryId: category.id,
      purchaseDate: "2026-04-20",
      postedDate: "2026-04-20",
      installmentCount: 1,
    });
    const payment = await request(app)
      .post(`/api/v1/credit-cards/${cardId}/payments`)
      .set(headers)
      .send({ amount: 5_000, fromAccountId: ownerAccount.id, paymentDate: "2026-04-30" });
    expect(payment.status).toBe(201);

    const cycles = await request(app)
      .get(`/api/v1/credit-cards/${cardId}/cycles`)
      .query({ scope: "all" })
      .set(headers);
    const invoice = cycles.body.data.find(
      (cycle: { statementAmount: number }) => cycle.statementAmount === 20_000,
    );
    const details = await request(app)
      .get(`/api/v1/credit-cards/${cardId}/cycles/${invoice.id}`)
      .set(headers);

    expect(details.status).toBe(200);
    expect(details.body.data.payments).toEqual([
      expect.objectContaining({ paymentDate: "2026-04-30", amount: 5_000 }),
    ]);
    expect(details.body.data.items).toHaveLength(1);
  });
});
