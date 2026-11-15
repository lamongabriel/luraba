import { listCreditCardCyclesQuerySchema } from "@luraba/contracts/credit-cards";
import { creditCardBillingCyclesTable } from "@luraba/db/schemas/credit-card-billing-cycles.schema";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import * as accountsService from "@/modules/accounts/accounts.service";
import * as categoriesService from "@/modules/categories/categories.service";
import { createAuthenticatedContext } from "@/test/auth";
import { assertCardAllocationInvariant } from "@/test/card-allocations";
import {
  buildAccountInput,
  buildCategoryInput,
  buildCreditCardInput,
  createBalanceEntryForAccount,
} from "@/test/factories";
import * as creditCardsService from "../credit-cards.service";

async function setup() {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-04-30T12:00:00.000Z"));
  const context = await createAuthenticatedContext();
  const category = await categoriesService.createCategory(
    context.householdContext,
    buildCategoryInput({ name: "Shopping", type: "expense" }),
  );
  const source = await accountsService.createAccount(
    context.householdContext,
    buildAccountInput({ name: "Checking", type: "cash", currencyCode: "BRL" }),
  );
  await createBalanceEntryForAccount({
    householdId: context.household.id,
    accountId: source.id,
    amount: 10_000_000,
  });
  const card = await creditCardsService.createCreditCard(
    context.householdContext,
    buildCreditCardInput({
      ownerAccountId: source.id,
      name: "Inter",
      closingDay: 25,
      dueDay: 5,
    }),
  );
  const hc = context.householdContext;
  const buy = (amounts: number[], purchaseDate = "2026-04-20") =>
    creditCardsService.createPurchase(hc, card.id, {
      description: "Shopee",
      categoryId: category.id,
      purchaseDate: new Date(`${purchaseDate}T00:00:00.000Z`),
      postedDate: new Date(`${purchaseDate}T00:00:00.000Z`),
      installmentAmounts: amounts,
    });
  const pay = (amount: number, date = "2026-04-30") =>
    creditCardsService.createPayment(hc, card.id, {
      amount,
      fromAccountId: source.id,
      paymentDate: new Date(`${date}T00:00:00.000Z`),
    });
  const cycles = async () =>
    (
      await creditCardsService.listBillingCycles(
        hc,
        card.id,
        listCreditCardCyclesQuerySchema.parse({ scope: "all" }),
      )
    ).data.sort((a, b) => (a.closingDate < b.closingDate ? -1 : 1));
  return { hc, card, buy, pay, cycles };
}

describe("card payment allocations are derived from payments and statements", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("follows an installment edited on an already paid invoice (no phantom cents)", async () => {
    const { hc, card, buy, pay, cycles } = await setup();
    const purchase = await buy([6636, 6636, 6636]);
    await pay(6636);
    let first = (await cycles()).find((c) => c.closingDate === "2026-04-25");
    expect(first).toMatchObject({ statementAmount: 6636, paidAmount: 6636, remainingAmount: 0 });

    await creditCardsService.updateInstallment(
      hc,
      card.id,
      purchase.purchaseId,
      purchase.installments[0].installmentId,
      { amount: 6634 },
    );

    first = (await cycles()).find((c) => c.closingDate === "2026-04-25");
    expect(first).toMatchObject({ statementAmount: 6634, paidAmount: 6634, remainingAmount: 0 });
    // The 2 left over is credit; it then covers the next invoice, never a phantom on the first.
    const credit = await assertCardAllocationInvariant(card.id);
    expect(credit).toBe(0);
    const second = (await cycles()).find((c) => c.closingDate === "2026-05-25");
    expect(second?.paidAmount).toBe(2);
  });

  it("applies payments oldest-first by date and keeps the leftover as credit", async () => {
    const { hc, card, buy, pay, cycles } = await setup();
    const purchase = await buy([1000]);
    const late = await pay(700, "2026-04-29");
    const early = await pay(300, "2026-04-26");
    expect(await assertCardAllocationInvariant(card.id)).toBe(0);

    // The statement drops below the payments: the oldest payment is applied first, the rest is credit.
    await creditCardsService.updateInstallment(
      hc,
      card.id,
      purchase.purchaseId,
      purchase.installments[0].installmentId,
      { amount: 800 },
    );
    const first = (await cycles()).find((c) => c.closingDate === "2026-04-25");
    expect(first).toMatchObject({ statementAmount: 800, paidAmount: 800, remainingAmount: 0 });
    expect(await assertCardAllocationInvariant(card.id)).toBe(200);
    const earlyAfter = await creditCardsService.getPayment(hc, card.id, early.paymentId);
    const lateAfter = await creditCardsService.getPayment(hc, card.id, late.paymentId);
    expect(earlyAfter).toMatchObject({ creditAmount: 0 });
    expect(earlyAfter.allocations.map((a) => a.amount)).toEqual([300]);
    expect(lateAfter).toMatchObject({ creditAmount: 200 });
    expect(lateAfter.allocations.map((a) => a.amount)).toEqual([500]);
  });

  it("recomputes after deleting a purchase, a payment and cancelling", async () => {
    const { hc, card, buy, pay, cycles } = await setup();
    const a = await buy([3000, 3000]);
    const b = await buy([2000]);
    const p = await pay(5000);
    await assertCardAllocationInvariant(card.id);
    await creditCardsService.deletePurchase(hc, card.id, b.purchaseId);
    expect(await assertCardAllocationInvariant(card.id)).toBe(2000 - 2000 + 0);
    const first = (await cycles()).find((c) => c.closingDate === "2026-04-25");
    expect(first).toMatchObject({ statementAmount: 3000, paidAmount: 3000 });
    await creditCardsService.deletePayment(hc, card.id, p.paymentId);
    expect(await assertCardAllocationInvariant(card.id)).toBe(0);
    await creditCardsService.cancelPurchase(hc, card.id, a.purchaseId, {
      mode: "single_credit",
      reason: "cancellation",
    } as never);
    await assertCardAllocationInvariant(card.id);
  });

  it("recompute dry run reports stale rows, the write fixes them and is idempotent", async () => {
    const { card, hc, buy, pay, cycles } = await setup();
    await buy([1000]);
    await pay(1000);
    // Simulate a stale row left by an old version: paid more than the statement.
    const target = (await cycles()).find((c) => c.closingDate === "2026-04-25");
    await db
      .update(creditCardBillingCyclesTable)
      .set({ paidAmount: 1002 })
      .where(eq(creditCardBillingCyclesTable.id, target?.id ?? ""));
    const dry = await creditCardsService.recomputeAllocations(hc, {
      creditCardId: card.id,
      dryRun: true,
    });
    expect(dry.cards[0].changedInvoices).toHaveLength(1);
    expect(dry.cards[0].changedInvoices[0]).toMatchObject({ previousPaid: 1002, paid: 1000 });
    const [stale] = await db
      .select()
      .from(creditCardBillingCyclesTable)
      .where(eq(creditCardBillingCyclesTable.id, target?.id ?? ""));
    expect(stale.paidAmount).toBe(1002); // a dry run writes nothing

    const written = await creditCardsService.recomputeAllocations(hc, {
      creditCardId: card.id,
      dryRun: false,
    });
    expect(written.cards[0].changedInvoices).toHaveLength(1);
    await assertCardAllocationInvariant(card.id);
    const again = await creditCardsService.recomputeAllocations(hc, {
      creditCardId: card.id,
      dryRun: false,
    });
    expect(again.cards[0].changedInvoices).toEqual([]);
  });
});
