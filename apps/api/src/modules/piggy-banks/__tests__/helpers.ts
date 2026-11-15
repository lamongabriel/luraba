import { formatISODate, getTodayInTimezone } from "@luraba/domain";
import request from "supertest";
import app from "@/app";
import * as accountsService from "@/modules/accounts/accounts.service";
import * as transactionsService from "@/modules/transactions/transactions.service";
import { createAuthenticatedContext, createAuthHeaders } from "@/test/auth";
import { buildAccountInput, createHouseholdMembership } from "@/test/factories";

export const today = () => formatISODate(getTodayInTimezone("America/Sao_Paulo"));

/** A household with a funded checking account and an empty "Nubank Caixinhas" parent account. */
export async function setup(role: "owner" | "viewer" | "member" = "owner", funds = 1_000_000) {
  const context = await createAuthenticatedContext({ role: "owner" });
  const headers = createAuthHeaders(context.token, context.household.id);
  const checking = await accountsService.createAccount(
    context.householdContext,
    buildAccountInput({ name: "Checking", type: "cash", currencyCode: "BRL" }),
  );
  const parent = await accountsService.createAccount(
    context.householdContext,
    buildAccountInput({ name: "Nubank Caixinhas", type: "cash", currencyCode: "BRL" }),
  );
  const salary = await transactionsService.createTransaction(context.householdContext, {
    type: "income",
    description: "Salary",
    amount: funds,
    currencyCode: "BRL",
    paymentMethodCode: "pix",
    accountId: checking.id,
    purchaseDate: new Date(),
    postedDate: new Date(),
  });

  let actor = { headers, context };
  if (role !== "owner") {
    const other = await createAuthenticatedContext({ role });
    // Same household, other role: reuse the owner's household with the other user's token.
    await createHouseholdMembership(context.household.id, other.user.id, role);
    actor = {
      headers: createAuthHeaders(other.token, context.household.id),
      context: other,
    };
  }
  const post = (path: string, body: unknown, h = actor.headers) =>
    request(app)
      .post(`/api/v1${path}`)
      .set(h)
      .send(body as object);
  const get = (path: string, h = actor.headers) => request(app).get(`/api/v1${path}`).set(h);

  async function createPiggy(title: string, extra: Record<string, unknown> = {}) {
    const res = await post(
      "/piggy-banks",
      { parentAccountId: parent.id, title, ...extra },
      headers,
    );
    if (res.status !== 201) throw new Error(`create failed: ${JSON.stringify(res.body)}`);
    return res.body.data as { id: string; balance: number };
  }

  return { context, headers, actor, checking, parent, salary, post, get, createPiggy };
}

export async function accountBalance(
  get: (path: string) => request.Test,
  accountId: string,
): Promise<number> {
  const res = await get(`/accounts/${accountId}`);
  return res.body.data.balance;
}
