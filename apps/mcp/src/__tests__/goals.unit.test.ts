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

const lists = (path: string) => {
  if (path === "/accounts")
    return page([account(20, "Savings A"), account(21, "Inter Global"), account(22, "XP")]);
  if (path === "/goals") return page([goal(10, "Honeymoon"), goal(11, "Furniture")]);
  return undefined;
};

describe("goal tools over a mocked API", () => {
  it("plans a goal total from the monthly amount and end month", async () => {
    const { call, calls, close } = await setup((path) => lists(path));
    const dry = await call("create_goal", {
      name: "Honeymoon",
      type: "savings",
      currency: "USD",
      monthlyContribution: 1000,
      startMonth: "2026-11",
      endMonth: "2027-11",
      dryRun: true,
    });
    expect(dry.data.status).toBe("dry_run");
    // 13 months of 1,000.00 in cents.
    expect(dry.data.wouldCreate.targetAmount).toBe(1_300_000);
    expect(dry.data.wouldCreate.endMonth).toBe("2027-11");
    expect(calls.some((c) => c.method === "POST")).toBe(false);

    const missing = await call("create_goal", {
      name: "X",
      type: "savings",
      currency: "USD",
      startMonth: "2026-11",
      dryRun: true,
    });
    expect(missing.isError).toBe(true);
    await close();
  });

  it("asks for clarification when the goal is unknown and writes nothing", async () => {
    const { call, calls, close } = await setup((path) => lists(path));
    const result = await call("contribute_to_goal", {
      goal: "Boat",
      amount: 1000,
      fromAccount: "Inter Global",
      toAccount: "Savings A",
    });
    expect(result.data.status).toBe("needs_clarification");
    expect(calls.some((c) => c.method === "POST")).toBe(false);
    await close();
  });

  it("contributes with major units converted and names resolved", async () => {
    const { call, calls, close } = await setup((path, method) => {
      if (method === "POST" && path.endsWith("/contribute"))
        return {
          success: true,
          data: goal(10, "Honeymoon", {
            contributions: [
              {
                id: ids(30),
                kind: "contribution",
                amount: 100_000,
                fromAccountId: ids(21),
                toAccountId: ids(20),
                originalAmount: null,
                fxRate: null,
                originalCurrency: null,
                contributedOn: "2026-11-02",
                note: null,
                createdAt: now,
                transaction: {
                  id: ids(31),
                  description: "Contribution",
                  amount: 100_000,
                  currencyCode: "USD",
                  postedDate: "2026-11-02",
                },
              },
            ],
          }),
        };
      return lists(path);
    });
    const result = await call("contribute_to_goal", {
      goal: "Honeymoon",
      amount: 1000,
      date: "2026-11-02",
      fromAccount: "Inter Global",
      toAccount: "Savings A",
    });
    expect(result.data.status).toBe("recorded");
    expect(result.data.goal.whereTheMoneySits[0].account).toBe("Savings A");
    const post = calls.find((c) => c.method === "POST");
    expect(post?.path).toBe("/goals/00000000-0000-4000-8000-000000000010/contribute");
    expect(post?.body).toMatchObject({
      amount: 100_000,
      fromAccountId: ids(21),
      toAccountId: ids(20),
    });
    expect(JSON.stringify(post?.body)).toContain('"contributedOn":"2026-11-02');
    await close();
  });

  it("reports goals with planned vs contributed and where the money sits", async () => {
    const { call, close } = await setup((path) => {
      if (path === "/goals/report")
        return {
          success: true,
          data: {
            month: "2026-11",
            goals: [
              {
                goalId: ids(10),
                name: "Honeymoon",
                kind: "savings",
                state: "on_track",
                currencyCode: "USD",
                planned: 100_000,
                contributed: 60_000,
                saved: 60_000,
                targetAmount: 1_300_000,
                percent: 4,
                onTrack: true,
                locations: [{ accountId: ids(22), amount: 60_000 }],
              },
            ],
          },
        };
      return lists(path);
    });
    const result = await call("report_goals", { month: "2026-11" });
    const row = result.data.goals[0];
    expect(row.behindThisMonth).toBe(true);
    expect(row.whereTheMoneySits[0].account).toBe("XP");
    await close();
  });

  it("sets the plan resolving goal names, and requires confirm to delete a goal", async () => {
    const { call, calls, close } = await setup((path) => lists(path));
    const dry = await call("set_monthly_plan", {
      from: "2026-11",
      currency: "USD",
      to: "2027-01",
      lines: [
        { kind: "salary", amount: 5500 },
        { kind: "taxes", amount: 350 },
        { kind: "goal", goal: "Furniture", amount: 250 },
      ],
      dryRun: true,
    });
    expect(dry.data.wouldSet.lines[2]).toEqual({ kind: "goal", goalId: ids(11), amount: 25_000 });

    const guarded = await call("delete_goal", { goal: "Furniture" });
    expect(guarded.data.status).toBe("confirmation_required");
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
    await close();
  });
});
