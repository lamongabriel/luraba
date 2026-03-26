import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { env } from '@/config/env';
import { db, pool } from '@/db';
import { currenciesTable } from '@/db/schemas/currencies.schema';
import * as accountsService from '@/modules/accounts/accounts.service';
import * as authService from '@/modules/auth/auth.service';
import * as categoriesService from '@/modules/categories/categories.service';
import * as creditCardsService from '@/modules/credit-cards/credit-cards.service';
import * as transactionsService from '@/modules/transactions/transactions.service';

const runDbTests = env.runDbTests;

async function seedCurrencies(): Promise<{ brlId: string }> {
  await db
    .insert(currenciesTable)
    .values([
      { code: 'BRL', symbol: 'R$', precision: 2 },
      { code: 'USD', symbol: '$', precision: 2 },
    ])
    .onConflictDoNothing();

  const rows = await db.select().from(currenciesTable);
  const brl = rows.find((currency) => currency.code === 'BRL');
  if (!brl) throw new Error('BRL currency missing after seed');

  return { brlId: brl.id };
}

describe(
  'transactions integration',
  {
    skip: !runDbTests,
  },
  () => {
    before(async () => {
      await pool.query('select 1');
    });

    after(async () => {
      await pool.end();
    });

    it('covers card purchase, installment purchase, full cycle payment, and account history behavior', async () => {
      const { brlId } = await seedCurrencies();
      const uniqueKey = `acct-${Date.now()}-${Math.round(Math.random() * 100_000)}`;
      const authResult = await authService.register({
        name: 'Integration User',
        email: `${uniqueKey}@luraba.test`,
        password: 'super-secret-password',
      });

      const userId = authResult.user.id;
      const expenseCategory = await categoriesService.createCategory(userId, {
        name: `Food ${uniqueKey}`,
        type: 'expense',
      });

      const account = await accountsService.createAccount(userId, {
        name: `Checking ${uniqueKey}`,
        type: 'checking',
        currencyId: brlId,
      });

      const card = await creditCardsService.createCreditCard(userId, {
        accountId: account.id,
        name: `Master ${uniqueKey}`,
        brand: 'Mastercard',
        last4: '1234',
        limitAmount: 300000n,
        currencyId: brlId,
        closingDay: 15,
        dueDay: 22,
        graceDays: 0,
      });

      const cashExpense = await transactionsService.createTransaction(userId, {
        type: 'expense',
        description: 'Lunch',
        amount: 2500n,
        currencyId: brlId,
        paymentMethod: 'pix',
        accountId: account.id,
        categoryId: expenseCategory.id,
        purchaseDate: new Date('2026-03-05T00:00:00.000Z'),
        postedDate: new Date('2026-03-05T00:00:00.000Z'),
      });

      assert.equal(cashExpense.entries.length, 2);
      assert.equal(cashExpense.entries.reduce((total, entry) => total + entry.amount, 0n), 0n);

      await transactionsService.createTransaction(userId, {
        type: 'card_purchase',
        description: 'Groceries',
        amount: 9000n,
        currencyId: brlId,
        paymentMethod: 'credit_card',
        creditCardId: card.id,
        categoryId: expenseCategory.id,
        purchaseDate: new Date('2026-03-20T00:00:00.000Z'),
        postedDate: new Date('2026-03-20T00:00:00.000Z'),
      });

      const installmentPurchase = await transactionsService.createTransaction(userId, {
        type: 'installment',
        description: 'Notebook parcelado',
        amount: 12000n,
        currencyId: brlId,
        paymentMethod: 'credit_card',
        creditCardId: card.id,
        categoryId: expenseCategory.id,
        installmentCount: 3,
        purchaseDate: new Date('2026-03-21T00:00:00.000Z'),
        postedDate: new Date('2026-03-21T00:00:00.000Z'),
      });

      assert.ok(installmentPurchase.installment);
      assert.equal(installmentPurchase.installmentItems?.length, 3);
      assert.equal(installmentPurchase.entries.reduce((total, entry) => total + entry.amount, 0n), 0n);

      const overviewBeforePayment = await creditCardsService.getCardOverview(card.id, userId);
      assert.equal(overviewBeforePayment.limit.used, 21000n);
      assert.ok(overviewBeforePayment.currentCycle);
      assert.equal(
        overviewBeforePayment.cycles.flatMap((cycle) => cycle.installmentSchedule).length,
        3,
      );

      const cycleToPay = overviewBeforePayment.currentCycle ?? overviewBeforePayment.cycles[0];
      const cardPayment = await transactionsService.createTransaction(userId, {
        type: 'card_payment',
        accountId: account.id,
        billingCycleId: cycleToPay.id,
        paymentMethod: 'pix',
        purchaseDate: new Date('2026-03-25T00:00:00.000Z'),
        postedDate: new Date('2026-03-25T00:00:00.000Z'),
      });

      assert.ok(cardPayment.cardPayment);
      assert.equal(cardPayment.entries.reduce((total, entry) => total + entry.amount, 0n), 0n);

      await assert.rejects(
        () =>
          transactionsService.createTransaction(userId, {
            type: 'card_payment',
            accountId: account.id,
            billingCycleId: cycleToPay.id,
            paymentMethod: 'pix',
            purchaseDate: new Date('2026-03-26T00:00:00.000Z'),
            postedDate: new Date('2026-03-26T00:00:00.000Z'),
          }),
        /already fully paid/i,
      );

      const accountHistory = await accountsService.getAccountHistory(userId, account.id);
      assert.ok(accountHistory.items.some((item) => item.type === 'card_payment'));
      assert.ok(!accountHistory.items.some((item) => item.type === 'card_purchase'));
      assert.ok(!accountHistory.items.some((item) => item.type === 'installment'));

      const overviewAfterPayment = await creditCardsService.getCardOverview(card.id, userId);
      const paidCycle = overviewAfterPayment.cycles.find((cycle) => cycle.id === cycleToPay.id);
      assert.ok(paidCycle);
      assert.equal(paidCycle?.status, 'paid');
      assert.ok(overviewAfterPayment.limit.used < overviewBeforePayment.limit.used);

      const listedTransactions = await transactionsService.listTransactions(userId);
      const lunchTransaction = listedTransactions.find((transaction) => transaction.description === 'Lunch');
      const groceriesTransaction = listedTransactions.find((transaction) => transaction.description === 'Groceries');
      const notebookTransaction = listedTransactions.find(
        (transaction) => transaction.description === 'Notebook parcelado',
      );

      assert.equal(lunchTransaction?.amount, 2500n);
      assert.equal(lunchTransaction?.currencyId, brlId);
      assert.equal(groceriesTransaction?.amount, 9000n);
      assert.equal(notebookTransaction?.amount, 12000n);
    });
  },
);
