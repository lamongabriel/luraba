import { z } from "zod";
import { currencyCodeSchema } from "../common.js";
import {
  householdInviteStatusSchema,
  householdPermissionSchema,
  householdRoleSchema,
  storedHouseholdInviteStatusSchema,
} from "../permissions.js";
import {
  countryCodeSchema,
  creditExpenseTimingSchema,
  creditInstallmentBudgetModeSchema,
  timezoneSchema,
} from "../preferences.js";

export const householdRoleMetadataSchema = z.object({
  value: householdRoleSchema,
  label: z.string(),
  description: z.string(),
  canBeInvited: z.boolean(),
  permissions: z.array(householdPermissionSchema),
});
export const householdPermissionMetadataSchema = z.object({
  value: householdPermissionSchema,
  label: z.string(),
  group: z.string(),
  description: z.string(),
});
export const householdInviteStatusMetadataSchema = z.object({
  value: householdInviteStatusSchema,
  label: z.string(),
  description: z.string(),
});
export type HouseholdRoleMetadata = z.output<typeof householdRoleMetadataSchema>;
export type HouseholdPermissionMetadata = z.output<typeof householdPermissionMetadataSchema>;
export type HouseholdInviteStatusMetadata = z.output<typeof householdInviteStatusMetadataSchema>;

export const householdSettingsSchema = z.object({
  defaultCurrencyId: currencyCodeSchema,
  countryCode: countryCodeSchema,
  timezone: timezoneSchema,
  budgetMonthStartsOn: z.number().int().min(1).max(31),
  creditExpenseTiming: creditExpenseTimingSchema,
  creditInstallmentBudgetMode: creditInstallmentBudgetModeSchema,
});
export const householdSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  ...householdSettingsSchema.shape,
  role: householdRoleSchema,
  createdByUserId: z.uuid(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const householdMemberSchema = z.object({
  id: z.uuid(),
  householdId: z.uuid(),
  userId: z.uuid(),
  name: z.string(),
  email: z.email(),
  image: z.string().nullable(),
  emailVerified: z.boolean(),
  role: householdRoleSchema,
  lastActiveAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const householdInviteComputedStatusSchema = householdInviteStatusSchema;
const householdInviteInviterSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  image: z.string().nullable(),
});
export const householdInviteSchema = z.object({
  id: z.uuid(),
  householdId: z.uuid(),
  householdName: z.string(),
  email: z.email(),
  role: householdRoleSchema,
  status: storedHouseholdInviteStatusSchema,
  computedStatus: householdInviteComputedStatusSchema,
  invitedByUserId: z.uuid(),
  inviter: householdInviteInviterSchema.nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  acceptedAt: z.iso.datetime().nullable(),
  rejectedAt: z.iso.datetime().nullable(),
  canceledAt: z.iso.datetime().nullable(),
});
export const acceptHouseholdInviteSchema = z.object({
  household: z.object({ id: z.uuid(), name: z.string(), role: householdRoleSchema }),
});
export const previewHouseholdInviteSchema = z.object({
  email: z.email(),
  household: z.object({ name: z.string() }),
  role: householdRoleSchema,
  inviter: z.object({ name: z.string(), image: z.string().nullable() }).nullable(),
  status: householdInviteComputedStatusSchema,
  expiresAt: z.iso.datetime(),
});
export const householdInviteLinkSchema = z.object({
  url: z.url(),
  expiresAt: z.iso.datetime(),
});

export type Household = z.output<typeof householdSchema>;
export type HouseholdMember = z.output<typeof householdMemberSchema>;
export type HouseholdInvite = z.output<typeof householdInviteSchema>;
export type HouseholdSettings = z.output<typeof householdSettingsSchema>;
export type HouseholdSummary = Household;
export type HouseholdInvitePreview = z.output<typeof previewHouseholdInviteSchema>;
export type AcceptedHouseholdInvite = z.output<typeof acceptHouseholdInviteSchema>;
export type HouseholdInviteLink = z.output<typeof householdInviteLinkSchema>;
export type HouseholdInviteInviter = NonNullable<HouseholdInvite["inviter"]>;
export type HouseholdCreditExpenseTiming = z.output<typeof creditExpenseTimingSchema>;
export type HouseholdCreditInstallmentBudgetMode = z.output<
  typeof creditInstallmentBudgetModeSchema
>;
export interface HouseholdContext {
  id: string;
  name: string;
  role: z.output<typeof householdRoleSchema>;
  permissions: z.output<typeof householdPermissionSchema>[];
  settings: HouseholdSettings;
}
