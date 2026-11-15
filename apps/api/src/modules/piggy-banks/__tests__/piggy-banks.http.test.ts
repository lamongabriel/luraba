import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "@/app";
import { createAuthenticatedContext, createAuthHeaders } from "@/test/auth";
import { accountBalance, setup, today } from "./helpers";

describe("piggy banks: access", () => {
  it("requires authentication", async () => {
    expect((await request(app).get("/api/v1/piggy-banks")).status).toBe(401);
  });

  it("lets a viewer read but not change", async () => {
    const { actor, parent, createPiggy, post, get } = await setup("viewer");
    await createPiggy("Emergency fund");
    expect((await get("/piggy-banks")).status).toBe(200);
    const denied = await post("/piggy-banks", { parentAccountId: parent.id, title: "Nope" });
    expect(denied.status).toBe(403);
    expect(actor.headers).toBeDefined();
  });

  it("hides another household's piggy banks and accounts", async () => {
    const { createPiggy, parent } = await setup();
    const piggy = await createPiggy("Private");
    const other = await createAuthenticatedContext();
    const headers = createAuthHeaders(other.token, other.household.id);
    expect((await request(app).get(`/api/v1/piggy-banks/${piggy.id}`).set(headers)).status).toBe(
      404,
    );
    expect(
      (
        await request(app)
          .post("/api/v1/piggy-banks")
          .set(headers)
          .send({ parentAccountId: parent.id, title: "Steal" })
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .post(`/api/v1/piggy-banks/${piggy.id}/deposit`)
          .set(headers)
          .send({ amount: 100 })
      ).status,
    ).toBe(404);
    const list = await request(app).get("/api/v1/piggy-banks").set(headers);
    expect(list.body.data.piggyBanks).toEqual([]);
  });
});

describe("piggy banks: creating", () => {
  it("creates a piggy bank with a yield and a label", async () => {
    const { post, parent } = await setup();
    const res = await post("/piggy-banks", {
      parentAccountId: parent.id,
      title: "Car maintenance",
      emoji: "🚗",
      color: "#3b82f6",
      yield: { type: "cdi_percent", rate: 102 },
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      title: "Car maintenance",
      currencyCode: "BRL",
      balance: 0,
      isUnallocated: false,
      yield: {
        type: "cdi_percent",
        rate: 102,
        dayCount: 252,
        label: "102% CDI",
        liquidity: "daily",
      },
    });
  });

  it("defaults a fixed rate to 365 days and keeps maturity and tax settings", async () => {
    const { post, parent } = await setup();
    const res = await post("/piggy-banks", {
      parentAccountId: parent.id,
      title: "Tesouro Prefixado 2032",
      yield: {
        type: "fixed_rate",
        rate: 13.4,
        maturityDate: "2032-01-01",
        liquidity: "at_maturity",
        taxRegime: "regressive_ir",
        applyIof: true,
      },
    });
    expect(res.body.data.yield).toMatchObject({
      dayCount: 365,
      maturityDate: "2032-01-01",
      liquidity: "at_maturity",
      taxRegime: "regressive_ir",
      applyIof: true,
      label: "13.4% a.a.",
    });
  });

  it("rejects a duplicate title, a zero rate and a non-cash parent", async () => {
    const { post, parent, createPiggy, context } = await setup();
    await createPiggy("Land");
    expect((await post("/piggy-banks", { parentAccountId: parent.id, title: "Land" })).status).toBe(
      409,
    );
    expect(
      (
        await post("/piggy-banks", {
          parentAccountId: parent.id,
          title: "Zero",
          yield: { type: "cdi_percent", rate: 0 },
        })
      ).status,
    ).toBe(422);
    const { default: accountsService } = {
      default: await import("@/modules/accounts/accounts.service"),
    };
    const { buildAccountInput } = await import("@/test/factories");
    const invest = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({ name: "Broker", type: "investment", currencyCode: "BRL" }),
    );
    expect((await post("/piggy-banks", { parentAccountId: invest.id, title: "X" })).status).toBe(
      422,
    );
  });

  it("starts from the account's free balance only", async () => {
    const { post, parent, checking } = await setup();
    // The parent account is empty: nothing is free yet.
    expect(
      (
        await post("/piggy-banks", {
          parentAccountId: parent.id,
          title: "Too much",
          initialBalance: 100,
        })
      ).status,
    ).toBe(422);
    expect(checking.id).toBeDefined();
  });
});

describe("piggy banks: money", () => {
  it("deposits from another account as a neutral transfer and keeps parent = free + piggy banks", async () => {
    const { post, get, createPiggy, parent, checking } = await setup();
    const emergency = await createPiggy("Emergency fund");

    const before = (await get("/transactions/analytics?currencyCodes=BRL")).body.data;
    const deposit = await post(`/piggy-banks/${emergency.id}/deposit`, {
      amount: 250_000,
      fromAccountId: checking.id,
    });
    expect(deposit.status).toBe(201);
    expect(deposit.body.data.transactionId).toEqual(expect.any(String));
    expect(deposit.body.data.piggyBanks[0].balance).toBe(250_000);

    expect(await accountBalance(get, parent.id)).toBe(250_000);
    expect(await accountBalance(get, checking.id)).toBe(750_000);

    const overview = (await get("/piggy-banks")).body.data;
    expect(overview.accounts).toEqual([
      expect.objectContaining({
        accountId: parent.id,
        balance: 250_000,
        piggyTotal: 250_000,
        free: 0,
        piggyBankCount: 1,
      }),
    ]);

    // Spending and income reports do not move for a transfer.
    const after = (await get("/transactions/analytics?currencyCodes=BRL")).body.data;
    expect(after.metrics.moneyIn.value).toBe(before.metrics.moneyIn.value);
    expect(after.metrics.moneyOut.value).toBe(before.metrics.moneyOut.value);
  });

  it("splits one Pix across several piggy banks with a single transfer", async () => {
    const { post, get, createPiggy, checking, parent } = await setup();
    const a = await createPiggy("IPVA");
    const b = await createPiggy("Land");
    const split = await post("/piggy-banks/bulk-deposit", {
      fromAccountId: checking.id,
      allocations: [
        { piggyBankId: a.id, amount: 30_000 },
        { piggyBankId: b.id, amount: 70_000 },
      ],
    });
    expect(split.status).toBe(201);
    const balances = Object.fromEntries(
      split.body.data.piggyBanks.map((p: { title: string; balance: number }) => [
        p.title,
        p.balance,
      ]),
    );
    expect(balances).toEqual({ IPVA: 30_000, Land: 70_000 });
    expect(await accountBalance(get, parent.id)).toBe(100_000);
    expect(await accountBalance(get, checking.id)).toBe(900_000);

    const movements = (await get(`/piggy-banks/${a.id}/movements`)).body.data;
    const other = (await get(`/piggy-banks/${b.id}/movements`)).body.data;
    expect(movements[0].transactionId).toBe(other[0].transactionId);
    expect(movements[0].groupId).toBe(other[0].groupId);

    // Duplicates and mixed parents are refused.
    expect(
      (
        await post("/piggy-banks/bulk-deposit", {
          fromAccountId: checking.id,
          allocations: [
            { piggyBankId: a.id, amount: 1 },
            { piggyBankId: a.id, amount: 1 },
          ],
        })
      ).status,
    ).toBe(422);
  });

  it("moves money between piggy banks without touching the ledger", async () => {
    const { post, get, createPiggy, checking, parent } = await setup();
    const a = await createPiggy("Unallocated");
    const b = await createPiggy("Emergency fund");
    await post(`/piggy-banks/${a.id}/deposit`, { amount: 100_000, fromAccountId: checking.id });
    const moved = await post("/piggy-banks/move", {
      fromPiggyBankId: a.id,
      toPiggyBankId: b.id,
      amount: 40_000,
    });
    expect(moved.status).toBe(201);
    expect(moved.body.data.transactionId).toBeNull();
    const balances = Object.fromEntries(
      moved.body.data.piggyBanks.map((p: { title: string; balance: number }) => [
        p.title,
        p.balance,
      ]),
    );
    expect(balances).toEqual({ Unallocated: 60_000, "Emergency fund": 40_000 });
    expect(await accountBalance(get, parent.id)).toBe(100_000);
    const rows = (await get(`/piggy-banks/${b.id}/movements`)).body.data;
    expect(rows[0]).toMatchObject({
      kind: "transfer_in",
      amount: 40_000,
      counterpart: { id: a.id },
    });

    expect(
      (
        await post("/piggy-banks/move", {
          fromPiggyBankId: a.id,
          toPiggyBankId: b.id,
          amount: 999_999,
        })
      ).status,
    ).toBe(422);
    expect(
      (await post("/piggy-banks/move", { fromPiggyBankId: a.id, toPiggyBankId: a.id, amount: 1 }))
        .status,
    ).toBe(422);
  });

  it("withdraws to another account or back to the free balance", async () => {
    const { post, get, createPiggy, checking, parent } = await setup();
    const piggy = await createPiggy("Car maintenance");
    await post(`/piggy-banks/${piggy.id}/deposit`, { amount: 100_000, fromAccountId: checking.id });

    const out = await post(`/piggy-banks/${piggy.id}/withdraw`, {
      amount: 30_000,
      toAccountId: checking.id,
    });
    expect(out.status).toBe(201);
    expect(out.body.data.piggyBanks[0].balance).toBe(70_000);
    expect(await accountBalance(get, parent.id)).toBe(70_000);
    expect(await accountBalance(get, checking.id)).toBe(930_000);

    // Back to free: the parent account keeps the money, the piggy bank gives it up.
    const free = await post(`/piggy-banks/${piggy.id}/withdraw`, { amount: 20_000 });
    expect(free.body.data.transactionId).toBeNull();
    const overview = (await get("/piggy-banks")).body.data;
    expect(overview.accounts[0]).toMatchObject({
      balance: 70_000,
      piggyTotal: 50_000,
      free: 20_000,
    });

    // Free money can be put back without a transfer; more than free is refused.
    expect((await post(`/piggy-banks/${piggy.id}/deposit`, { amount: 20_000 })).status).toBe(201);
    expect((await post(`/piggy-banks/${piggy.id}/deposit`, { amount: 1 })).status).toBe(422);
    expect((await post(`/piggy-banks/${piggy.id}/withdraw`, { amount: 9_999_999 })).status).toBe(
      422,
    );
  });

  it("locks a piggy bank with liquidity at maturity until that day", async () => {
    const { post, createPiggy, checking } = await setup();
    const piggy = await createPiggy("Tesouro Prefixado 2032", {
      yield: { type: "fixed_rate", rate: 13, maturityDate: "2032-01-01", liquidity: "at_maturity" },
    });
    await post(`/piggy-banks/${piggy.id}/deposit`, { amount: 10_000, fromAccountId: checking.id });
    const res = await post(`/piggy-banks/${piggy.id}/withdraw`, { amount: 100 });
    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/maturity/i);
  });

  it("sets the real balance as an adjustment and confirms the estimates", async () => {
    const { post, get, createPiggy, checking, parent } = await setup();
    const piggy = await createPiggy("Emergency fund");
    await post(`/piggy-banks/${piggy.id}/deposit`, { amount: 100_000, fromAccountId: checking.id });
    const before = (await get("/transactions/analytics?currencyCodes=BRL")).body.data;

    const res = await post(`/piggy-banks/${piggy.id}/balance`, { balance: 100_750 });
    expect(res.status).toBe(201);
    expect(res.body.data.adjustment).toBe(750);
    expect(res.body.data.piggyBanks[0].balance).toBe(100_750);
    expect(await accountBalance(get, parent.id)).toBe(100_750);

    // An adjustment is a correction, not income.
    const after = (await get("/transactions/analytics?currencyCodes=BRL")).body.data;
    expect(after.metrics.moneyIn.value).toBe(before.metrics.moneyIn.value);

    const movements = (await get(`/piggy-banks/${piggy.id}/movements?kind=adjustment`)).body.data;
    expect(movements).toEqual([expect.objectContaining({ kind: "adjustment", amount: 750 })]);

    // Entering the same balance again changes nothing.
    const same = await post(`/piggy-banks/${piggy.id}/balance`, { balance: 100_750 });
    expect(same.body.data.adjustment).toBe(0);
    expect(same.body.data.transactionId).toBeNull();

    // A lower balance records a negative adjustment.
    const lower = await post(`/piggy-banks/${piggy.id}/balance`, {
      balance: 100_000,
      date: today(),
    });
    expect(lower.body.data.adjustment).toBe(-750);
    expect(await accountBalance(get, parent.id)).toBe(100_000);
  });
});

describe("piggy banks: archive and detail", () => {
  it("archives only an empty piggy bank and can restore it", async () => {
    const { post, get, createPiggy, checking } = await setup();
    const piggy = await createPiggy("Old plan");
    await post(`/piggy-banks/${piggy.id}/deposit`, { amount: 5_000, fromAccountId: checking.id });

    const blocked = await post(`/piggy-banks/${piggy.id}/archive`, {});
    expect(blocked.status).toBe(409);

    await post(`/piggy-banks/${piggy.id}/withdraw`, { amount: 5_000, toAccountId: checking.id });
    const archived = await post(`/piggy-banks/${piggy.id}/archive`, {});
    expect(archived.status).toBe(200);
    expect(archived.body.data.archivedAt).toEqual(expect.any(String));

    expect((await get("/piggy-banks")).body.data.piggyBanks).toEqual([]);
    expect((await get("/piggy-banks?includeArchived=true")).body.data.piggyBanks).toHaveLength(1);
    // Closed to new money.
    expect(
      (await post(`/piggy-banks/${piggy.id}/deposit`, { amount: 1, fromAccountId: checking.id }))
        .status,
    ).toBe(409);

    const restored = await post(`/piggy-banks/${piggy.id}/unarchive`, {});
    expect(restored.body.data.archivedAt).toBeNull();
  });

  it("shows gross, net if withdrawn, earnings and a projection", async () => {
    const { post, get, createPiggy, checking } = await setup();
    const piggy = await createPiggy("Land", {
      yield: { type: "fixed_rate", rate: 12, taxRegime: "regressive_ir" },
    });
    await post(`/piggy-banks/${piggy.id}/deposit`, { amount: 100_000, fromAccountId: checking.id });
    // Pretend the bank shows 110,000: 10,000 of gain, held for fewer than 180 days: 22.5% IR.
    await post(`/piggy-banks/${piggy.id}/balance`, { balance: 110_000 });

    const detail = (await get(`/piggy-banks/${piggy.id}`)).body.data;
    expect(detail).toMatchObject({
      gross: 110_000,
      balance: 110_000,
      netIfWithdrawn: { gross: 110_000, gain: 10_000, ir: 2_250, iof: 0, net: 107_750 },
      earnings: { today: 0, month: 0, allTime: 0 },
    });
    expect(detail.annualRate).toBeCloseTo(0.12, 6);
    expect(detail.projection).toHaveLength(13);
    expect(detail.projection[0].balance).toBe(110_000);
    expect(detail.projection[12].balance).toBeGreaterThan(110_000);
  });

  it("updates a piggy bank's yield and look, and keeps other households out", async () => {
    const { get, createPiggy, headers } = await setup();
    const piggy = await createPiggy("Land");
    const res = await request(app)
      .patch(`/api/v1/piggy-banks/${piggy.id}`)
      .set(headers)
      .send({
        title: "Land in Texas",
        emoji: "🌎",
        yield: { type: "ipca_plus", rate: 6.5 },
      });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      title: "Land in Texas",
      emoji: "🌎",
      yield: { type: "ipca_plus", rate: 6.5, dayCount: 365, label: "IPCA + 6.5%" },
    });
    expect((await get(`/piggy-banks/${piggy.id}`)).body.data.title).toBe("Land in Texas");

    const other = await createAuthenticatedContext();
    const denied = await request(app)
      .patch(`/api/v1/piggy-banks/${piggy.id}`)
      .set(createAuthHeaders(other.token, other.household.id))
      .send({ title: "Mine now" });
    expect(denied.status).toBe(404);
  });
});
