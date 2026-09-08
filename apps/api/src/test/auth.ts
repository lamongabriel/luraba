import { getPermissionsForRole } from "@luraba/contracts";
import { makeSignature } from "better-auth/crypto";
import type { HouseholdContext } from "@/config/permissions";
import { auth } from "@/shared/lib/auth";
import {
  buildHouseholdContext,
  createHousehold,
  createHouseholdMembership,
  createUser,
  setDefaultHousehold,
} from "./factories";

async function createSessionCookieValue(userId: string): Promise<string> {
  const context = await auth.$context;
  const session = await context.internalAdapter.createSession(userId);
  const signedToken = `${session.token}.${await makeSignature(session.token, context.secret)}`;

  return `${context.authCookies.sessionToken.name}=${signedToken}`;
}

export async function createAccessTokenForUser(user: { id: string; email: string }) {
  return createSessionCookieValue(user.id);
}

export function createAuthHeaders(cookie: string, householdId?: string) {
  return {
    Cookie: cookie,
    ...(householdId ? { "X-Household-Id": householdId } : {}),
  };
}

export async function createAuthenticatedContext(
  options: { role?: HouseholdContext["role"]; defaultHousehold?: boolean } = {},
) {
  const role = options.role ?? "owner";
  const user = await createUser();
  const household = await createHousehold(user.id);
  const membership = await createHouseholdMembership(household.id, user.id, role);

  if (options.defaultHousehold !== false) {
    await setDefaultHousehold(user.id, household.id);
  }

  const token = await createAccessTokenForUser(user);

  const householdContext = buildHouseholdContext({
    householdId: household.id,
    userId: user.id,
    role,
    permissions: getPermissionsForRole(role),
    timezone: household.timezone,
    creditExpenseTiming: household.creditExpenseTiming,
    creditInstallmentBudgetMode: household.creditInstallmentBudgetMode,
  });

  return {
    user,
    household,
    membership,
    token,
    householdContext,
    authHeaders: createAuthHeaders(token, household.id),
  };
}
