import { fromNodeHeaders } from 'better-auth/node';
import { and, eq } from 'drizzle-orm';
import type { NextFunction, Request, Response } from 'express';
import {
  getPermissionsForRole,
  type HouseholdPermission,
  hasHouseholdPermission,
} from '@/config/permissions';
import { db } from '@/db';
import { householdMembersTable, householdsTable } from '@/db/schemas/households.schema';
import * as householdsService from '@/modules/households/households.service';
import { ForbiddenError, UnauthorizedError } from '@/shared/errors';
import { auth } from '@/shared/lib/auth';

export type AuthenticatedUser = {
  id: string;
  email: string;
};

type AccessOptions = {
  household?: boolean;
  permission?: HouseholdPermission;
  householdParam?: string;
};

async function authenticateRequest(req: Request): Promise<AuthenticatedUser> {
  if (req.user) {
    return req.user;
  }

  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  if (!session) {
    throw new UnauthorizedError('Authentication required');
  }

  req.user = {
    id: session.user.id,
    email: session.user.email,
  };

  return req.user;
}

function getHouseholdIdFromHeader(req: Request): string | undefined {
  const rawValue = req.headers['x-household-id'];
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  return value?.trim() || undefined;
}

function getHouseholdIdFromRoute(req: Request, householdParam?: string): string | undefined {
  if (!householdParam) {
    return undefined;
  }

  const value = req.params[householdParam];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

async function resolveHousehold(
  req: Request,
  options: AccessOptions,
): Promise<NonNullable<Request['household']>> {
  const user = await authenticateRequest(req);
  const requestedHouseholdId =
    getHouseholdIdFromHeader(req) ?? getHouseholdIdFromRoute(req, options.householdParam);

  if (
    req.household &&
    (!requestedHouseholdId || req.household.householdId === requestedHouseholdId)
  ) {
    return req.household;
  }

  const householdId =
    requestedHouseholdId ?? (await householdsService.createDefaultHouseholdForUser(user.id));

  const rows = await db
    .select({
      role: householdMembersTable.role,
      timezone: householdsTable.timezone,
      creditExpenseTiming: householdsTable.creditExpenseTiming,
      creditInstallmentBudgetMode: householdsTable.creditInstallmentBudgetMode,
    })
    .from(householdMembersTable)
    .innerJoin(householdsTable, eq(householdsTable.id, householdMembersTable.householdId))
    .where(
      and(
        eq(householdMembersTable.householdId, householdId),
        eq(householdMembersTable.userId, user.id),
      ),
    );

  const membership = rows[0];
  if (!membership) {
    throw new ForbiddenError('You do not have access to this household');
  }

  req.household = {
    householdId,
    userId: user.id,
    role: membership.role,
    permissions: getPermissionsForRole(membership.role),
    timezone: membership.timezone,
    creditExpenseTiming: membership.creditExpenseTiming,
    creditInstallmentBudgetMode: membership.creditInstallmentBudgetMode,
  };

  return req.household;
}

export function requireAccess(options: AccessOptions = {}) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      await authenticateRequest(req);

      const needsHousehold = options.household || options.permission;
      if (needsHousehold) {
        const household = await resolveHousehold(req, options);

        if (options.permission && !hasHouseholdPermission(household.role, options.permission)) {
          throw new ForbiddenError('You do not have permission to perform this action');
        }
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

export function getAuthenticatedUser(req: Request): AuthenticatedUser {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  return req.user;
}

export function getHouseholdContext(req: Request) {
  if (!req.household) {
    throw new ForbiddenError('Household context required');
  }

  return req.household;
}
