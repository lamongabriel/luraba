import { getPermissionsForRole, type HouseholdContext } from '@/config/permissions';
import { signAccessToken } from '@/shared/auth';
import { buildHouseholdContext, createHousehold, createHouseholdMembership, createUser, setDefaultHousehold } from './factories';

export function createAccessTokenForUser(user: { id: string; email: string }) {
  return signAccessToken(user.id, user.email);
}

export function createAuthHeaders(token: string, householdId?: string) {
  return {
    Authorization: `Bearer ${token}`,
    ...(householdId ? { 'X-Household-Id': householdId } : {}),
  };
}

export async function createAuthenticatedContext(options: { role?: HouseholdContext['role']; defaultHousehold?: boolean } = {}) {
  const role = options.role ?? 'owner';
  const user = await createUser();
  const household = await createHousehold(user.id);
  const membership = await createHouseholdMembership(household.id, user.id, role);

  if (options.defaultHousehold !== false) {
    await setDefaultHousehold(user.id, household.id);
  }

  const token = createAccessTokenForUser(user);
  
  const householdContext = buildHouseholdContext({
    householdId: household.id,
    userId: user.id,
    role,
    permissions: getPermissionsForRole(role),
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
