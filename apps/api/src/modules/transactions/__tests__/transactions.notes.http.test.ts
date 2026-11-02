import type { AddressInfo } from "node:net";
import { sql } from "drizzle-orm";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "@/app";
import { db } from "@/db";
import { createAuthenticatedContext, createAuthHeaders } from "@/test/auth";
import { buildAccountInput } from "@/test/factories";
import { connectTestClient } from "../../../../../mcp/src/testing/connect";

const day = (offset: number) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};

const STATEMENT = "Pagamento de Título ZAMIX MULTIPLAY TELECOMUNICACOES";

/** `notes` and `originalDescription`: create, update, clear, search, bulk and where they live. */
describe("transaction notes and statement name", () => {
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
      .send({ name: "notes" });
    const mcp = await connectTestClient({ baseUrl, apiKey: key.body.data.secret });
    const makeAccount = async (name: string) => {
      const response = await request(app)
        .post("/api/v1/accounts")
        .set(headers)
        .send(buildAccountInput({ name, currencyCode: "BRL", openingBalance: 100000 }));
      expect(response.status).toBe(201);
      return response.body.data.id as string;
    };
    const checking = await makeAccount("Inter");
    const savings = await makeAccount("Savings");
    const created = await mcp.call("create_credit_card", {
      name: "XP Visa Infinite",
      ownerAccount: "Inter",
      brand: "Visa",
      last4: "4242",
      limit: 50000,
      closingDay: 28,
      dueDay: 5,
    });
    expect(created.isError, created.text).toBe(false);
    const card = created.data.creditCard as { id: string };

    const get = async (path: string) => {
      const response = await request(app).get(`/api/v1/${path}`).set(headers);
      expect(response.status, JSON.stringify(response.body)).toBe(200);
      return response.body;
    };
    const post = (path: string, body: unknown) =>
      request(app)
        .post(`/api/v1/${path}`)
        .set(headers)
        .send(body as object);
    const patch = (path: string, body: unknown) =>
      request(app)
        .patch(`/api/v1/${path}`)
        .set(headers)
        .send(body as object);
    const expense = (input: Record<string, unknown> = {}) =>
      post("transactions", {
        type: "expense",
        description: "Internet bill",
        amount: 9900,
        currencyCode: "BRL",
        accountId: checking,
        paymentMethodCode: "debit_card",
        purchaseDate: day(-1),
        postedDate: day(-1),
        ...input,
      });
    const search = async (text: string) => {
      const result = await mcp.call("search_transactions", { text, perPage: 100 });
      expect(result.isError, result.text).toBe(false);
      return result.data.transactions as { id: string; notes: string | null }[];
    };
    return { mcp, get, post, patch, expense, search, checking, savings, card, headers };
  }

  it("creates, updates and clears both fields", async () => {
    const s = await setup();
    const plain = await s.expense();
    expect(plain.status).toBe(201);
    expect(plain.body.data.originalDescription).toBeNull();
    expect(plain.body.data.notes).toBeNull();

    const created = await s.expense({
      originalDescription: STATEMENT,
      notes: "Paid for the whole building",
    });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    expect(created.body.data.originalDescription).toBe(STATEMENT);
    expect(created.body.data.notes).toBe("Paid for the whole building");
    const id = created.body.data.id as string;

    const updated = await s.patch(`transactions/${id}`, { notes: "New note" });
    expect(updated.status).toBe(200);
    expect(updated.body.data.notes).toBe("New note");
    expect(updated.body.data.originalDescription).toBe(STATEMENT);
    expect(updated.body.data.amount).toBe(9900);

    const cleared = await s.patch(`transactions/${id}`, { notes: null, originalDescription: null });
    expect(cleared.status).toBe(200);
    expect(cleared.body.data.notes).toBeNull();
    expect(cleared.body.data.originalDescription).toBeNull();

    const tooLong = await s.patch(`transactions/${id}`, { notes: "x".repeat(4001) });
    expect(tooLong.status).toBe(422);
  });

  it("update_transaction sets and clears them and reports the changes", async () => {
    const s = await setup();
    const created = await s.expense();
    const id = created.body.data.id as string;

    const set = await s.mcp.call("update_transaction", {
      id,
      originalDescription: "AMAZON MKTPL*1A2UA6CH3",
      notes: "gift card used",
    });
    expect(set.isError, set.text).toBe(false);
    const fields = (set.data.changes as { field: string }[]).map((change) => change.field);
    expect(fields).toEqual(expect.arrayContaining(["originalDescription", "notes"]));
    expect(set.data.transaction.originalDescription).toBe("AMAZON MKTPL*1A2UA6CH3");

    const clear = await s.mcp.call("update_transaction", { id, notes: null });
    expect(clear.isError, clear.text).toBe(false);
    expect(clear.data.changes).toEqual([{ field: "notes", from: "gift card used", to: null }]);

    const read = await s.mcp.call("get_transaction", { id });
    expect(read.data.transaction.notes).toBeNull();
    expect(read.data.transaction.originalDescription).toBe("AMAZON MKTPL*1A2UA6CH3");
  });

  it("text search matches the title, statement name and notes, ignoring case and accents", async () => {
    const s = await setup();
    const withStatement = await s.expense({ originalDescription: STATEMENT });
    const withNotes = await s.expense({
      description: "Groceries",
      notes: "Compras do mês: açúcar",
    });
    await s.expense({ description: "Unrelated" });

    expect((await s.search("titulo")).map((row) => row.id)).toEqual([withStatement.body.data.id]);
    expect((await s.search("TÍTULO zamix")).map((row) => row.id)).toEqual([
      withStatement.body.data.id,
    ]);
    expect((await s.search("acucar")).map((row) => row.id)).toEqual([withNotes.body.data.id]);
    expect((await s.search("MES")).map((row) => row.id)).toEqual([withNotes.body.data.id]);
    expect(await s.search("nothing like this")).toEqual([]);

    // The HTTP search box (the same `search` filter) behaves the same.
    const http = await s.get(`transactions?search=titulo&perPage=100`);
    expect(http.data.map((row: { id: string }) => row.id)).toEqual([withStatement.body.data.id]);
  });

  it("an installment purchase keeps one value shared by every installment", async () => {
    const s = await setup();
    const result = await s.mcp.call("create_transaction", {
      kind: "credit_card_purchase",
      creditCard: "XP",
      description: "Console",
      originalDescription: "AMAZON MKTPL*1A2UA6CH3",
      notes: "bought Apr 13, inst. 5-10/10",
      amount: 300,
      installments: 3,
      date: day(-100),
      createMissing: true,
    });
    expect(result.isError, result.text).toBe(false);
    expect(result.data.purchase.originalDescription).toBe("AMAZON MKTPL*1A2UA6CH3");
    const { transactionId } = result.data.purchase as { transactionId: string };

    const rows = async () =>
      (await s.get("transactions?perPage=100")).data.filter(
        (row: { id: string }) => row.id === transactionId,
      ) as {
        rowKind: string;
        notes: string | null;
        originalDescription: string | null;
      }[];
    const before = await rows();
    expect(before).toHaveLength(3);
    for (const row of before) {
      expect(row.rowKind).toBe("credit_card_installment");
      expect(row.notes).toBe("bought Apr 13, inst. 5-10/10");
      expect(row.originalDescription).toBe("AMAZON MKTPL*1A2UA6CH3");
    }
    // Searching finds each installment through the purchase's text.
    expect((await s.search("amazon mktpl")).length).toBe(3);

    // Editing through one installment updates the purchase, so all of them change.
    const update = await s.mcp.call("update_transaction", {
      id: transactionId,
      notes: "updated",
      originalDescription: null,
    });
    expect(update.isError, update.text).toBe(false);
    for (const row of await rows()) {
      expect(row.notes).toBe("updated");
      expect(row.originalDescription).toBeNull();
    }
    const read = await s.get(`transactions/${transactionId}`);
    expect(read.data.notes).toBe("updated");
  });

  it("a transfer shows the same values on both accounts", async () => {
    const s = await setup();
    const transfer = await s.post("transactions", {
      type: "transfer",
      description: "Move savings",
      originalDescription: "TED ENVIADA",
      notes: "monthly",
      fromAccountId: s.checking,
      toAccountId: s.savings,
      fromAmount: 5000,
      purchaseDate: day(-1),
      postedDate: day(-1),
    });
    expect(transfer.status, JSON.stringify(transfer.body)).toBe(201);
    const id = transfer.body.data.id as string;
    for (const accountId of [s.checking, s.savings]) {
      const list = await s.get(`transactions?accountIds=${accountId}&perPage=100`);
      const row = list.data.find((item: { id: string }) => item.id === id);
      expect(row.notes).toBe("monthly");
      expect(row.originalDescription).toBe("TED ENVIADA");
    }
    const patched = await s.patch(`transactions/${id}`, { notes: "weekly" });
    expect(patched.body.data.notes).toBe("weekly");
    expect(patched.body.data.amount).toBe(5000);
  });

  it("card payments, balance adjustments, refunds and cancellations carry both fields", async () => {
    const s = await setup();
    const purchase = await s.mcp.call("create_transaction", {
      kind: "credit_card_purchase",
      creditCard: "XP",
      description: "Headphones",
      amount: 200,
      date: day(-5),
      createMissing: true,
    });
    expect(purchase.isError, purchase.text).toBe(false);
    const { purchaseId, transactionId } = purchase.data.purchase as {
      purchaseId: string;
      transactionId: string;
    };

    const payment = await s.mcp.call("create_credit_card_payment", {
      creditCard: "XP",
      amount: 50,
      originalDescription: "PAGTO FATURA CARTAO",
      notes: "partial",
    });
    expect(payment.isError, payment.text).toBe(false);
    const payments = await s.get("transactions?originTypes=credit_card_payment&perPage=100");
    expect(payments.data[0]).toMatchObject({
      notes: "partial",
      originalDescription: "PAGTO FATURA CARTAO",
    });
    // The payment's own edit flow (and update_transaction) can change them too.
    const patched = await s.patch(`transactions/${payments.data[0].id}`, { notes: "changed" });
    expect(patched.status, JSON.stringify(patched.body)).toBe(200);
    expect(patched.body.data.notes).toBe("changed");

    const adjustment = await s.post("transactions", {
      type: "adjustment",
      description: "Fix balance",
      originalDescription: "AJUSTE",
      notes: "reconciled",
      balance: 123456,
      accountId: s.checking,
      purchaseDate: day(-1),
      postedDate: day(-1),
    });
    expect(adjustment.status, JSON.stringify(adjustment.body)).toBe(201);
    expect(adjustment.body.data).toMatchObject({
      notes: "reconciled",
      originalDescription: "AJUSTE",
    });

    const refund = await s.mcp.call("create_refund", {
      reason: "refund",
      amount: 20,
      originalTransactionId: transactionId,
      originalDescription: "ESTORNO AMAZON",
      notes: "one earbud",
    });
    expect(refund.isError, refund.text).toBe(false);
    expect(refund.data.refund).toMatchObject({
      originalDescription: "ESTORNO AMAZON",
      notes: "one earbud",
    });

    const cancel = await s.mcp.call("cancel_purchase", {
      purchaseId,
      creditCard: "XP",
      originalDescription: "CANCEL AMAZON",
      notes: "changed my mind",
    });
    expect(cancel.isError, cancel.text).toBe(false);
    const credit = await s.get(`transactions/${cancel.data.creditId}`);
    expect(credit.data).toMatchObject({
      originalDescription: "CANCEL AMAZON",
      notes: "changed my mind",
    });
    // A refund keeps supporting edits of both fields.
    const edited = await s.patch(`transactions/${credit.data.id}`, { notes: null });
    expect(edited.body.data.notes).toBeNull();
  });

  it("bulk_update_transactions replaces and appends notes", async () => {
    const s = await setup();
    const first = await s.expense({ notes: "first" });
    const second = await s.expense();
    const ids = [first.body.data.id, second.body.data.id] as string[];

    const preview = await s.mcp.call("bulk_update_transactions", {
      selection: { ids },
      set: { appendNotes: "reviewed" },
      dryRun: true,
    });
    expect(preview.isError, preview.text).toBe(false);

    const applied = await s.mcp.call("bulk_update_transactions", {
      selection: { ids },
      set: { appendNotes: "reviewed" },
      confirm: true,
    });
    expect(applied.isError, applied.text).toBe(false);
    expect((await s.get(`transactions/${ids[0]}`)).data.notes).toBe("first\nreviewed");
    expect((await s.get(`transactions/${ids[1]}`)).data.notes).toBe("reviewed");

    // Appending the same line again changes nothing.
    const again = await s.mcp.call("bulk_update_transactions", {
      selection: { ids },
      set: { appendNotes: "reviewed" },
      confirm: true,
    });
    expect(again.data.alreadyMatching).toBe(2);

    const replaced = await s.mcp.call("bulk_update_transactions", {
      selection: { ids },
      set: { notes: "all the same" },
      confirm: true,
    });
    expect(replaced.isError, replaced.text).toBe(false);
    for (const id of ids)
      expect((await s.get(`transactions/${id}`)).data.notes).toBe("all the same");
  });

  it("the migration adds nullable columns with no default", async () => {
    const result = await db.execute<{
      column_name: string;
      is_nullable: string;
      column_default: string | null;
    }>(sql`
      select column_name, is_nullable, column_default
      from information_schema.columns
      where table_name = 'transactions' and column_name in ('notes', 'original_description')
      order by column_name
    `);
    expect(result.rows).toEqual([
      { column_name: "notes", is_nullable: "YES", column_default: null },
      { column_name: "original_description", is_nullable: "YES", column_default: null },
    ]);
  });
});
