import { describe, expect, it } from "vitest";
import { connectTestClient } from "../testing/connect.js";

const ids = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const now = "2026-11-02T00:00:00.000Z";
const page = (data: unknown[]) => ({
  success: true,
  data,
  meta: {
    pagination: { page: 1, perPage: 1000, totalCount: data.length, totalPages: 1 },
    summary: null,
  },
});
const account = (n: number, name: string) => ({
  id: ids(n),
  name,
  institutionName: null,
  institutionDomain: null,
  institutionLogoUrl: null,
  imageUploadId: null,
  notes: null,
  classification: "asset",
  type: "cash",
  currencyCode: "USD",
  archivedAt: null,
  createdByUserId: null,
  createdAt: now,
  updatedAt: now,
  balance: 0,
  details: { kind: "cash", subtype: "savings" },
  subtype: "savings",
});
const yieldOf = {
  type: "cdi_percent",
  rate: 100,
  dayCount: 252,
  maturityDate: null,
  liquidity: "daily",
  taxRegime: "none",
  applyIof: false,
  label: "100% CDI",
};
const piggy = (n: number, title: string, balance: number) => ({
  id: ids(n),
  parentAccountId: ids(20),
  parentAccountName: "Chase Savings",
  title,
  description: null,
  coverUploadId: null,
  coverPreset: null,
  emoji: null,
  color: null,
  currencyCode: "USD",
  yield: yieldOf,
  isUnallocated: false,
  balance,
  monthEarnings: 120,
  accruedThrough: "2026-11-01",
  goals: [],
  archivedAt: null,
  createdByUserId: null,
  createdAt: now,
  updatedAt: now,
});
const detail = (n: number, title: string, balance: number) => ({
  ...piggy(n, title, balance),
  gross: balance,
  netIfWithdrawn: { gross: balance, gain: 0, ir: 0, iof: 0, net: balance },
  earnings: { today: 5, month: 120, allTime: 400 },
  annualRate: 0.1,
  averageMonthlyDeposit: 0,
  projection: [],
});
const goal = (n: number, name: string, over: Record<string, unknown> = {}) => ({
  id: ids(n),
  name,
  description: null,
  kind: "savings",
  status: "active",
  state: "on_track",
  targetAmount: 1_300_000,
  currencyCode: "USD",
  startDate: "2026-11-01",
  targetDate: null,
  monthlyContribution: 100_000,
  expectedReturnBps: null,
  accountId: null,
  endMonth: "2027-11",
  locations: [{ accountId: ids(20), amount: 100_000 }],
  saved: 100_000,
  contributionCount: 1,
  lastContributionOn: "2026-11-02",
  achievedOn: null,
  estimate: {
    remaining: 1_200_000,
    percent: 7,
    monthsLeft: 12,
    requiredMonthly: null,
    projectedCompletionDate: null,
    projectedAtTargetDate: null,
    shortfall: null,
    expectedSaved: null,
    onTrack: true,
  },
  archivedAt: null,
  createdByUserId: null,
  createdAt: now,
  updatedAt: now,
  contributions: [],
  timeline: [],
  ...over,
});

async function setup(handler: (path: string, method: string, body: unknown) => unknown) {
  const calls: { method: string; path: string; body: unknown }[] = [];
  const fetch = async (input: string, init: RequestInit) => {
    const url = new URL(input);
    const path = url.pathname.replace("/api/v1", "");
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method: init.method ?? "GET", path, body });
    return new Response(JSON.stringify(handler(path, init.method ?? "GET", body)), { status: 200 });
  };
  const connected = await connectTestClient({ baseUrl: "http://api.test", apiKey: "lur_x", fetch });
  return { ...connected, calls };
}

const base = (path: string) => {
  if (path === "/accounts")
    return page([account(20, "Chase Savings"), account(21, "Chase Checking")]);
  if (path === "/goals") return page([goal(40, "Emergency fund")]);
  if (path === "/piggy-banks")
    return {
      success: true,
      data: {
        accounts: [
          {
            accountId: ids(20),
            name: "Chase Savings",
            currencyCode: "USD",
            balance: 100_000,
            free: 20_000,
            piggyTotal: 80_000,
            piggyBankCount: 2,
          },
        ],
        piggyBanks: [piggy(1, "Car maintenance", 30_000), piggy(2, "Vacation", 50_000)],
      },
    };
  return undefined;
};

describe("piggy bank tools over a mocked API", () => {
  it("lists with money in major units", async () => {
    const { call, close } = await setup((path) => base(path));
    const result = await call("list_piggy_banks", {});
    expect(result.data.piggyBanks).toHaveLength(2);
    expect(result.data.piggyBanks[0].balance.amount).toBe(300);
    expect(result.data.accounts[0].free.amount).toBe(200);
    await close();
  });

  it("previews a deposit without writing and converts to minor units", async () => {
    const { call, calls, close } = await setup((path) => base(path));
    const result = await call("deposit_to_piggy_bank", {
      piggyBank: "car",
      amount: 125.5,
      fromAccount: "Chase Checking",
      dryRun: true,
    });
    expect(result.data.status).toBe("dry_run");
    expect(result.data.wouldDeposit.amount).toBe(12_550);
    expect(result.data.wouldDeposit.fromAccountId).toBe(ids(21));
    expect(calls.some((c) => c.method === "POST")).toBe(false);
    await close();
  });

  it("deposits for real and splits a transfer across piggy banks", async () => {
    const { call, calls, close } = await setup((path, method) => {
      if (method === "POST" && path.includes("/piggy-banks"))
        return {
          success: true,
          data: {
            piggyBanks: [detail(1, "Car maintenance", 40_000)],
            transactionId: ids(90),
            adjustment: null,
          },
        };
      return base(path);
    });
    const one = await call("deposit_to_piggy_bank", { piggyBank: "Car maintenance", amount: 100 });
    expect(one.data.status).toBe("deposited");
    const split = await call("deposit_to_piggy_bank", {
      fromAccount: "Chase Checking",
      allocations: [
        { piggyBank: "Car maintenance", amount: 60 },
        { piggyBank: "Vacation", amount: 40 },
      ],
    });
    expect(split.data.status).toBe("deposited");
    const bulk = calls.find((c) => c.path === "/piggy-banks/bulk-deposit");
    expect(bulk?.body).toMatchObject({
      allocations: [
        { piggyBankId: ids(1), amount: 6_000 },
        { piggyBankId: ids(2), amount: 4_000 },
      ],
    });
    await close();
  });

  it("asks for clarification on an unknown piggy bank and writes nothing", async () => {
    const { call, calls, close } = await setup((path) => base(path));
    const result = await call("withdraw_from_piggy_bank", { piggyBank: "Boat", amount: 10 });
    expect(result.data.status).toBe("needs_clarification");
    expect(calls.some((c) => c.method === "POST")).toBe(false);
    await close();
  });

  it("refuses to move between the same piggy bank", async () => {
    const { call, close } = await setup((path) => base(path));
    const result = await call("move_between_piggy_banks", {
      from: "Vacation",
      to: ids(2),
      amount: 5,
    });
    expect(result.isError).toBe(true);
    await close();
  });

  it("previews the adjustment of a real balance", async () => {
    const { call, close } = await setup((path) => base(path));
    const result = await call("set_piggy_bank_balance", {
      piggyBank: "Vacation",
      balance: 505,
      dryRun: true,
    });
    expect(result.data.status).toBe("dry_run");
    expect(result.data.wouldSet.balance).toBe(50_500);
    await close();
  });

  it("archives only with confirm", async () => {
    const { call, calls, close } = await setup((path, method) => {
      if (method === "POST" && path.endsWith("/archive"))
        return { success: true, data: { ...detail(1, "Car maintenance", 0), archivedAt: now } };
      return base(path);
    });
    const unconfirmed = await call("archive_piggy_bank", { piggyBank: "Car maintenance" });
    expect(unconfirmed.isError).toBe(true);
    expect(calls.some((c) => c.method === "POST")).toBe(false);
    const confirmed = await call("archive_piggy_bank", {
      piggyBank: "Car maintenance",
      confirm: true,
    });
    expect(confirmed.data.status).toBe("archived");
    await close();
  });

  it("links a goal by adding to the existing links", async () => {
    const link = (n: number, title: string) => ({
      id: ids(n),
      title,
      currencyCode: "USD",
      balance: 1000,
      balanceInGoalCurrency: 1000,
      annualRate: 0.1,
    });
    const { call, calls, close } = await setup((path, method, body) => {
      if (path === `/goals/${ids(40)}/piggy-banks`) {
        const piggyBankIds =
          method === "PUT" ? (body as { piggyBankIds: string[] }).piggyBankIds : [ids(1)];
        return {
          success: true,
          data: {
            goalId: ids(40),
            piggyBanks: piggyBankIds.map((id) => link(Number(id.slice(-1)), "x")),
            saved: 1000 * piggyBankIds.length,
          },
        };
      }
      return base(path);
    });
    const result = await call("link_goal_to_piggy_bank", {
      goal: "Emergency fund",
      piggyBanks: ["Vacation"],
    });
    expect(result.data.status).toBe("linked");
    const put = calls.find((c) => c.method === "PUT");
    expect(put?.body).toEqual({ piggyBankIds: [ids(1), ids(2)] });
    await close();
  });

  it("reports in major units without mixing currencies", async () => {
    const { call, close } = await setup((path) =>
      path === "/piggy-banks/report"
        ? {
            success: true,
            data: {
              month: "2026-11",
              piggyBanks: [
                {
                  id: ids(1),
                  title: "Car maintenance",
                  parentAccountName: "Chase Savings",
                  currencyCode: "USD",
                  yieldLabel: "100% CDI",
                  balance: 30_000,
                  netIfWithdrawn: 29_000,
                  earningsMonth: 120,
                  earningsAllTime: 400,
                  annualRate: 0.1,
                  projectedIn12Months: 33_000,
                },
              ],
              totals: [
                { currencyCode: "USD", balance: 30_000, earningsMonth: 120, earningsAllTime: 400 },
              ],
            },
          }
        : base(path),
    );
    const result = await call("report_piggy_banks", {});
    expect(result.data.piggyBanks[0].netIfWithdrawn.amount).toBe(290);
    expect(result.data.piggyBanks[0].expectedAnnualRatePercent).toBe(10);
    expect(result.data.totals).toHaveLength(1);
    await close();
  });

  it("creates a piggy bank after previewing it", async () => {
    const { call, calls, close } = await setup((path, method) =>
      method === "POST" && path === "/piggy-banks"
        ? { success: true, data: detail(3, "Emergency fund", 10_000) }
        : base(path),
    );
    const dry = await call("create_piggy_bank", {
      title: "Emergency fund",
      account: "Chase Savings",
      yield: { type: "cdi_percent", rate: 102 },
      initialBalance: 100,
      dryRun: true,
    });
    expect(dry.data.wouldCreate.initialBalance).toBe(10_000);
    const real = await call("create_piggy_bank", {
      title: "Emergency fund",
      account: "Chase Savings",
    });
    expect(real.data.status).toBe("created");
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(1);
    await close();
  });
});
