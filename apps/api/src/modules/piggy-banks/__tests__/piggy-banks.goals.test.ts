import { formatISODate, getTodayInTimezone, shiftMonths } from "@luraba/domain";
import { describe, expect, it } from "vitest";
import { seedExchangeRate } from "@/test/factories";
import { setup, today } from "./helpers";

const monthsFromNow = (months: number) =>
  formatISODate(shiftMonths(getTodayInTimezone("America/Sao_Paulo"), months));

async function goalSetup(goalBody: Record<string, unknown>) {
  const ctx = await setup();
  const piggy = await ctx.createPiggy("Emergency fund", {
    yield: { type: "fixed_rate", rate: 12 },
  });
  const created = await ctx.post("/goals", {
    name: "Emergency",
    targetAmount: 100_000,
    currencyCode: "BRL",
    startDate: monthsFromNow(-2),
    ...goalBody,
  });
  expect(created.status).toBe(201);
  return { ...ctx, piggy, goal: created.body.data as { id: string } };
}

const put = (ctx: Awaited<ReturnType<typeof setup>>, path: string, body: unknown) =>
  import("supertest").then(({ default: request }) =>
    import("@/app").then(({ default: app }) =>
      request(app)
        .put(`/api/v1${path}`)
        .set(ctx.headers)
        .send(body as object),
    ),
  );

describe("goals linked to piggy banks", () => {
  it("takes progress from the linked balances, interest included", async () => {
    const ctx = await goalSetup({ targetDate: monthsFromNow(10) });
    await ctx.post(`/piggy-banks/${ctx.piggy.id}/deposit`, {
      amount: 40_000,
      fromAccountId: ctx.checking.id,
    });
    expect((await ctx.get(`/goals/${ctx.goal.id}`)).body.data.saved).toBe(0);

    const linked = await put(ctx, `/goals/${ctx.goal.id}/piggy-banks`, {
      piggyBankIds: [ctx.piggy.id],
    });
    expect(linked.status).toBe(200);
    expect(linked.body.data).toMatchObject({ saved: 40_000 });

    const goal = (await ctx.get(`/goals/${ctx.goal.id}`)).body.data;
    expect(goal).toMatchObject({ saved: 40_000, estimate: { percent: 40, remaining: 60_000 } });
    expect(goal.locations).toEqual([{ accountId: ctx.parent.id, amount: 40_000 }]);

    // Interest raises progress: a confirmed balance of 41,000 means 1,000 earned.
    await ctx.post(`/piggy-banks/${ctx.piggy.id}/balance`, { balance: 41_000 });
    expect((await ctx.get(`/goals/${ctx.goal.id}`)).body.data.saved).toBe(41_000);

    // The piggy bank lists the goal with its progress.
    const piggy = (await ctx.get(`/piggy-banks/${ctx.piggy.id}`)).body.data;
    expect(piggy.goals).toEqual([
      expect.objectContaining({
        id: ctx.goal.id,
        saved: 41_000,
        percent: 41,
        targetAmount: 100_000,
      }),
    ]);
    expect((await ctx.get(`/piggy-banks?goalId=${ctx.goal.id}`)).body.data.piggyBanks).toHaveLength(
      1,
    );
  });

  it("converts balances in another currency with the FX service", async () => {
    const ctx = await goalSetup({
      currencyCode: "USD",
      targetAmount: 100_000,
      targetDate: monthsFromNow(10),
    });
    await seedExchangeRate("BRL", "USD", 1, 5, today()); // 1 BRL = 0.20 USD
    await ctx.post(`/piggy-banks/${ctx.piggy.id}/deposit`, {
      amount: 250_000,
      fromAccountId: ctx.checking.id,
    });
    const linked = await put(ctx, `/goals/${ctx.goal.id}/piggy-banks`, {
      piggyBankIds: [ctx.piggy.id],
    });
    expect(linked.body.data.piggyBanks[0]).toMatchObject({
      balance: 250_000,
      balanceInGoalCurrency: 50_000,
      currencyCode: "BRL",
    });
    expect((await ctx.get(`/goals/${ctx.goal.id}`)).body.data).toMatchObject({
      saved: 50_000,
      estimate: { percent: 50 },
    });
  });

  it("refuses contributions to a linked goal and unlinks cleanly", async () => {
    const ctx = await goalSetup({ monthlyContribution: 10_000 });
    await put(ctx, `/goals/${ctx.goal.id}/piggy-banks`, { piggyBankIds: [ctx.piggy.id] });
    const blocked = await ctx.post(`/goals/${ctx.goal.id}/contributions`, {
      amount: 1_000,
      contributedOn: today(),
    });
    expect(blocked.status).toBe(409);

    await put(ctx, `/goals/${ctx.goal.id}/piggy-banks`, { piggyBankIds: [] });
    const ok = await ctx.post(`/goals/${ctx.goal.id}/contributions`, {
      amount: 1_000,
      contributedOn: today(),
    });
    expect(ok.status).toBe(201);
  });

  it("rejects links to unknown or archived piggy banks and to missing goals", async () => {
    const ctx = await goalSetup({ monthlyContribution: 10_000 });
    expect(
      (
        await put(ctx, `/goals/${ctx.goal.id}/piggy-banks`, {
          piggyBankIds: ["00000000-0000-4000-8000-000000000000"],
        })
      ).status,
    ).toBe(404);
    const spare = await ctx.createPiggy("Spare");
    await ctx.post(`/piggy-banks/${spare.id}/archive`, {});
    expect(
      (await put(ctx, `/goals/${ctx.goal.id}/piggy-banks`, { piggyBankIds: [spare.id] })).status,
    ).toBe(422);
    expect(
      (
        await put(ctx, "/goals/00000000-0000-4000-8000-000000000000/piggy-banks", {
          piggyBankIds: [],
        })
      ).status,
    ).toBe(404);
  });

  it("plans mode 1 (target by date) with the yield of the linked piggy banks", async () => {
    const ctx = await goalSetup({ targetAmount: 120_000, targetDate: monthsFromNow(12) });
    await put(ctx, `/goals/${ctx.goal.id}/piggy-banks`, { piggyBankIds: [ctx.piggy.id] });
    const plan = (await ctx.get(`/goals/${ctx.goal.id}/piggy-plan`)).body.data;
    expect(plan.annualRate).toBeCloseTo(0.12, 6);
    expect(plan.plan.mode).toBe("target_by_date");
    // 120,000 over twelve months is 10,000 a month without yield: the yield asks for less.
    expect(plan.plan.monthly).toBeLessThan(10_000);
    expect(plan.plan.reachesTarget).toBe(true);
    expect(plan.projection[0]).toMatchObject({ balance: 0, target: 120_000 });
    expect(plan.projection.at(-1).balance).toBeGreaterThanOrEqual(119_999);
  });

  it("plans mode 2 (fixed monthly) and mode 3 (monthly for N months)", async () => {
    const two = await goalSetup({ targetAmount: 100_000, monthlyContribution: 10_000 });
    await put(two, `/goals/${two.goal.id}/piggy-banks`, { piggyBankIds: [two.piggy.id] });
    const planTwo = (await two.get(`/goals/${two.goal.id}/piggy-plan`)).body.data.plan;
    expect(planTwo).toMatchObject({ mode: "fixed_monthly", monthly: 10_000, reachesTarget: true });
    expect(planTwo.months).toBeLessThanOrEqual(10); // yield shortens the ten plain months

    const three = await goalSetup({
      targetAmount: 1_000_000,
      monthlyContribution: 10_000,
      endMonth: monthsFromNow(5).slice(0, 7),
    });
    await put(three, `/goals/${three.goal.id}/piggy-banks`, { piggyBankIds: [three.piggy.id] });
    const planThree = (await three.get(`/goals/${three.goal.id}/piggy-plan`)).body.data.plan;
    expect(planThree).toMatchObject({
      mode: "fixed_monthly_for_months",
      months: 6,
      reachesTarget: false,
    });
    expect(planThree.finalValue).toBeGreaterThan(60_000); // 6 x 10,000 plus interest
    expect(planThree.deposited).toBe(60_000);
  });

  it("tracks planned vs actual per month with catch-up", async () => {
    const ctx = await goalSetup({ monthlyContribution: 10_000 });
    await put(ctx, `/goals/${ctx.goal.id}/piggy-banks`, { piggyBankIds: [ctx.piggy.id] });
    await ctx.post(`/piggy-banks/${ctx.piggy.id}/deposit`, {
      amount: 15_000,
      fromAccountId: ctx.checking.id,
    });
    const body = (await ctx.get(`/goals/${ctx.goal.id}/piggy-plan`)).body.data;
    expect(body.tracking.status).toBe("behind");
    const current = body.tracking.rows.find(
      (row: { month: string }) => row.month === today().slice(0, 7),
    );
    expect(current).toMatchObject({ planned: 10_000, actual: 15_000, status: "behind" });
    // Started two months ago: three months planned (30,000) against 15,000 put in.
    expect(body.tracking.catchUp).toBe(15_000);

    // The monthly report shows what went into the linked piggy banks this month.
    const report = (await ctx.get(`/goals/report?month=${today().slice(0, 7)}`)).body.data;
    expect(report.goals[0]).toMatchObject({ planned: 10_000, contributed: 15_000, saved: 15_000 });
  });

  it("needs links before a plan exists", async () => {
    const ctx = await goalSetup({ monthlyContribution: 10_000 });
    expect((await ctx.get(`/goals/${ctx.goal.id}/piggy-plan`)).status).toBe(409);
  });
});
