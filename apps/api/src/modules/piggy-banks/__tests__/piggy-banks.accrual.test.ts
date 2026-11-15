import { BusinessCalendar, d, type IndexData, parseISODate } from "@luraba/domain";
import { describe, expect, it } from "vitest";
import { clearReferenceCaches } from "@/modules/investments/investments.macro";
import { marketDataRepository } from "@/modules/market-data/market-data.repository";
import { accruePiggyBanks } from "../piggy-banks.accrual.service";
import { adoptAccount } from "../piggy-banks.adopt";
import { runDailyAccrual } from "../piggy-banks.jobs";
import { setup } from "./helpers";

const calendar = BusinessCalendar.anbima();
/** CDI of 0.05% every business day, as BCB publishes it (a fraction here). */
const flat: IndexData = {
  cdiDaily: () => d("0.0005"),
  selicDaily: () => d("0.0005"),
  cdiAnnualProjection: "0.1465",
  ipcaProjectionMonthly: "0.004",
};
const deps = (todayIso: string, extra: Partial<IndexData> = {}) => ({
  today: parseISODate(todayIso),
  loadData: async () => ({ ...flat, ...extra }),
  loadCalendarFn: async () => calendar,
});

// Monday 2026-03-02 .. Sunday 2026-03-08: five business days.
const DEPOSIT_DAY = "2026-03-02";
const TODAY = "2026-03-09";

describe("piggy bank accrual", () => {
  async function funded() {
    const ctx = await setup();
    const piggy = await ctx.createPiggy("Emergency fund", {
      yield: { type: "cdi_percent", rate: 100 },
    });
    await ctx.post(`/piggy-banks/${piggy.id}/deposit`, {
      amount: 1_000_000,
      fromAccountId: ctx.checking.id,
      date: DEPOSIT_DAY,
    });
    return { ...ctx, piggy };
  }

  it("credits interest on business days only, as estimated income on the parent account", async () => {
    const { get, piggy, parent } = await funded();
    const result = await accruePiggyBanks(deps(TODAY));
    expect(result).toMatchObject({ through: "2026-03-08", posted: 5 });

    const detail = (await get(`/piggy-banks/${piggy.id}`)).body.data;
    // 5 days of 0.05% compounding on 10,000.00, floor-rounded with the fraction carried.
    expect(detail.earnings.allTime).toBeGreaterThanOrEqual(2_502);
    expect(detail.earnings.allTime).toBeLessThanOrEqual(2_504);
    expect(detail.balance).toBe(1_000_000 + detail.earnings.allTime);
    expect(detail.accruedThrough).toBe("2026-03-08");

    const movements = (await get(`/piggy-banks/${piggy.id}/movements?kind=interest`)).body.data;
    expect(movements).toHaveLength(5);
    expect(movements.every((m: { estimated: boolean }) => m.estimated)).toBe(true);
    expect(new Set(movements.map((m: { occurredOn: string }) => m.occurredOn))).toEqual(
      new Set(["2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05", "2026-03-06"]),
    );

    // The parent account really holds the interest: it is income, in Investment Income > Interest.
    const parentBalance = (await get(`/accounts/${parent.id}`)).body.data.balance;
    expect(parentBalance).toBe(detail.balance);
    const income = (
      await get("/transactions/analytics?currencyCodes=BRL&dateFrom=2026-03-02&dateTo=2026-03-08")
    ).body.data;
    expect(income.metrics.moneyIn.value).toBe(detail.earnings.allTime);
    const categories = (await get("/categories?perPage=100")).body.data;
    const interest = categories.find((c: { name: string }) => c.name === "Interest");
    const parentCategory = categories.find((c: { name: string }) => c.name === "Investment Income");
    expect(interest.parentId).toBe(parentCategory.id);
    expect(interest.type).toBe("income");
  });

  it("is idempotent: running a day again, or two runs at once, never credits twice", async () => {
    const { get, piggy } = await funded();
    await accruePiggyBanks(deps(TODAY));
    const first = (await get(`/piggy-banks/${piggy.id}`)).body.data;

    const again = await accruePiggyBanks(deps(TODAY));
    expect(again).toMatchObject({ accrued: 0, posted: 0 });
    // An earlier `through` finds everything already done.
    expect(
      await accruePiggyBanks({ ...deps(TODAY), through: parseISODate("2026-03-05") }),
    ).toMatchObject({
      accrued: 0,
    });

    // Two runs racing on a later day post it exactly once.
    await Promise.all([accruePiggyBanks(deps("2026-03-11")), accruePiggyBanks(deps("2026-03-11"))]);
    const after = (await get(`/piggy-banks/${piggy.id}/movements?kind=interest`)).body.data;
    const days = after.map((m: { occurredOn: string }) => m.occurredOn);
    expect(new Set(days).size).toBe(days.length);
    expect(days).toContain("2026-03-09");
    expect(days).toContain("2026-03-10");
    const second = (await get(`/piggy-banks/${piggy.id}`)).body.data;
    expect(second.earnings.allTime).toBeGreaterThan(first.earnings.allTime);
  });

  it("backfills days missed while the job was down, in order", async () => {
    const { get, piggy } = await funded();
    await accruePiggyBanks({ ...deps(TODAY), through: parseISODate("2026-03-03") });
    expect((await get(`/piggy-banks/${piggy.id}`)).body.data.accruedThrough).toBe("2026-03-03");
    await accruePiggyBanks(deps("2026-03-14")); // through 2026-03-13
    const movements = (await get(`/piggy-banks/${piggy.id}/movements?kind=interest&perPage=50`))
      .body.data;
    // Mar 2-6 and Mar 9-13: ten business days
    expect(movements).toHaveLength(10);
  });

  it("uses the projection when an index is missing and flags the accrual as estimated", async () => {
    const { get, piggy } = await funded();
    await accruePiggyBanks({
      ...deps(TODAY),
      loadData: async () => ({ cdiAnnualProjection: "0.1465", ipcaProjectionMonthly: "0.004" }),
    });
    const detail = (await get(`/piggy-banks/${piggy.id}`)).body.data;
    // 14.65% a year over 252 days is about 0.0541% a day: 5 days is about 2,700 on 10,000.00
    expect(detail.earnings.allTime).toBeGreaterThan(2_650);
    expect(detail.earnings.allTime).toBeLessThan(2_760);
  });

  it("stops at maturity and skips piggy banks without a yield", async () => {
    const ctx = await setup();
    const matures = await ctx.createPiggy("Tesouro", {
      yield: { type: "fixed_rate", rate: 12, maturityDate: "2026-03-05" },
    });
    const plain = await ctx.createPiggy("No yield");
    for (const piggy of [matures, plain]) {
      await ctx.post(`/piggy-banks/${piggy.id}/deposit`, {
        amount: 100_000,
        fromAccountId: ctx.checking.id,
        date: DEPOSIT_DAY,
      });
    }
    await accruePiggyBanks(deps(TODAY));
    const rows = (await ctx.get(`/piggy-banks/${matures.id}/movements?kind=interest`)).body.data;
    expect(rows.map((m: { occurredOn: string }) => m.occurredOn).sort()).toEqual([
      "2026-03-02",
      "2026-03-03",
      "2026-03-04",
    ]);
    expect((await ctx.get(`/piggy-banks/${plain.id}`)).body.data.earnings.allTime).toBe(0);
  });

  it("confirms estimated interest when the real balance is entered", async () => {
    const { get, post, piggy } = await funded();
    await accruePiggyBanks(deps(TODAY));
    const before = (await get(`/piggy-banks/${piggy.id}`)).body.data;
    const res = await post(`/piggy-banks/${piggy.id}/balance`, { balance: before.balance + 5 });
    expect(res.body.data.adjustment).toBe(5);
    const movements = (await get(`/piggy-banks/${piggy.id}/movements?kind=interest`)).body.data;
    expect(movements.every((m: { estimated: boolean }) => !m.estimated)).toBe(true);
  });
});

describe("adopting an account", () => {
  it("does nothing when the account does not exist", async () => {
    const { context } = await setup();
    const result = await adoptAccount({
      householdId: context.household.id,
      accountName: "Inter Porquinho",
    });
    expect(result.status).toBe("account_not_found");
  });

  it("treats an account that already has piggy banks as adopted", async () => {
    const { context, createPiggy } = await setup();
    await createPiggy("Land");
    const result = await adoptAccount({
      householdId: context.household.id,
      accountName: "nubank caixinhas",
    });
    expect(result.status).toBe("already_adopted");
  });

  it("is a dry run on request and idempotent when real", async () => {
    const ctx = await setup();
    const { default: transactionsService } = {
      default: await import("@/modules/transactions/transactions.service"),
    };
    await transactionsService.createTransaction(ctx.context.householdContext, {
      type: "transfer",
      description: "Move in",
      fromAccountId: ctx.checking.id,
      toAccountId: ctx.parent.id,
      fromAmount: 123_456,
      toAmount: 123_456,
      purchaseDate: new Date(),
      postedDate: new Date(),
    });
    const input = { householdId: ctx.context.household.id, accountName: "NUBANK CAIXINHAS" };

    expect(await adoptAccount({ ...input, dryRun: true })).toMatchObject({
      status: "would_create",
      balance: 123_456,
    });
    expect((await ctx.get("/piggy-banks")).body.data.piggyBanks).toEqual([]);

    expect(await adoptAccount(input)).toMatchObject({ status: "created", balance: 123_456 });
    expect((await adoptAccount(input)).status).toBe("already_adopted");

    const overview = (await ctx.get("/piggy-banks")).body.data;
    expect(overview.piggyBanks).toHaveLength(1);
    expect(overview.piggyBanks[0]).toMatchObject({
      title: "Unallocated",
      isUnallocated: true,
      balance: 123_456,
      yield: { type: "none" },
    });
    // Nothing changed for the account itself: free is zero, the account balance is untouched.
    expect(overview.accounts[0]).toMatchObject({ balance: 123_456, piggyTotal: 123_456, free: 0 });
  });
});

describe("the daily job", () => {
  it("syncs the index first, then accrues, and survives a failed sync", async () => {
    const calls: string[] = [];
    const accrue = async () => {
      calls.push("accrue");
      return { through: "2026-03-08", accrued: 0, skipped: 0, posted: 0 };
    };
    await runDailyAccrual({
      syncMacro: async () => {
        calls.push("sync");
        return 3;
      },
      accrue,
    });
    await runDailyAccrual({
      syncMacro: async () => {
        throw new Error("BCB is down");
      },
      accrue,
    });
    expect(calls).toEqual(["sync", "accrue", "accrue"]);
  });

  it("reads published rates from the stored macro series when no fake is injected", async () => {
    const ctx = await setup();
    const piggy = await ctx.createPiggy("Emergency fund", {
      yield: { type: "cdi_percent", rate: 100 },
    });
    await ctx.post(`/piggy-banks/${piggy.id}/deposit`, {
      amount: 1_000_000,
      fromAccountId: ctx.checking.id,
      date: "2026-03-02",
    });
    // BCB publishes percentages per day: 0.0500 means 0.05%.
    await marketDataRepository.upsertMacro(
      "CDI_DAILY",
      ["2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05", "2026-03-06"].map((date) => ({
        date,
        value: "0.0500",
      })),
      "test",
    );
    clearReferenceCaches();
    const result = await runDailyAccrual({
      syncMacro: async () => 0,
      accrual: { today: parseISODate("2026-03-09") },
    });
    expect(result.posted).toBe(5);
    const detail = (await ctx.get(`/piggy-banks/${piggy.id}`)).body.data;
    expect(detail.earnings.allTime).toBeGreaterThanOrEqual(2_502);
    expect(detail.earnings.allTime).toBeLessThanOrEqual(2_504);
    // Published days are not estimates.
    const rows = (await ctx.get(`/piggy-banks/${piggy.id}/movements?kind=interest`)).body.data;
    expect(rows).toHaveLength(5);
  });
});
