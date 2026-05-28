import { z } from 'zod';
import { householdInviteStatusEnum, householdRoleEnum } from '@/db/schemas/enums.schema';

export const householdRoleSchema = z.enum(householdRoleEnum.enumValues);
export const householdInviteStatusSchema = z.enum(householdInviteStatusEnum.enumValues);

export type HouseholdRole = z.infer<typeof householdRoleSchema>;
export type HouseholdInviteStatus = z.infer<typeof householdInviteStatusSchema>;
