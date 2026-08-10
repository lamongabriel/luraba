import { z } from 'zod';
import type {
  householdInvitesTable,
  householdMembersTable,
  householdsTable,
} from '@/db/schemas/households.schema';
import { householdInviteStatusSchema, householdRoleSchema } from '@/shared/validation/households';
import {
  countryCodeSchema,
  creditExpenseTimingSchema,
  creditInstallmentBudgetModeSchema,
  currencySchema,
  timezoneSchema,
} from '@/shared/validation/preferences';
import { householdInviteComputedStatusSchema } from './households.query';

export type HouseholdRecord = typeof householdsTable.$inferSelect;
export type HouseholdMemberRecord = typeof householdMembersTable.$inferSelect;
export type HouseholdInviteRecord = typeof householdInvitesTable.$inferSelect;

export { householdInviteStatusSchema, householdRoleSchema };

export const householdSettingsSchema = z.object({
  defaultCurrencyId: currencySchema,
  countryCode: countryCodeSchema,
  timezone: timezoneSchema,
  budgetMonthStartsOn: z.number().int().min(1).max(31),
  creditExpenseTiming: creditExpenseTimingSchema,
  creditInstallmentBudgetMode: creditInstallmentBudgetModeSchema,
});

const householdSettingsPatchSchema = householdSettingsSchema.partial();

export const householdSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  defaultCurrencyId: currencySchema,
  countryCode: countryCodeSchema,
  timezone: timezoneSchema,
  budgetMonthStartsOn: z.number().int().min(1).max(31),
  creditExpenseTiming: creditExpenseTimingSchema,
  creditInstallmentBudgetMode: creditInstallmentBudgetModeSchema,
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
  status: householdInviteStatusSchema,
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

export const CreateHouseholdRequestBodySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(4000).optional(),
  defaultCurrencyId: currencySchema.default('BRL'),
  countryCode: countryCodeSchema.default('BR'),
  timezone: timezoneSchema.default('America/Sao_Paulo'),
  budgetMonthStartsOn: z.coerce.number().int().min(1).max(31).default(1),
  creditExpenseTiming: creditExpenseTimingSchema.default('spend_month'),
  creditInstallmentBudgetMode: creditInstallmentBudgetModeSchema.default('per_installment'),
});

export const CreateHouseholdResponseSchema = householdSchema;

export const ListHouseholdsResponseSchema = z.array(householdSchema);

export const UpdateHouseholdRequestParamsSchema = z.object({
  id: z.uuid(),
});

export const UpdateHouseholdRequestBodySchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(4000).optional(),
    ...householdSettingsPatchSchema.shape,
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'At least one household field must be provided',
  });

export const UpdateHouseholdResponseSchema = householdSchema;

export const ListHouseholdMembersRequestParamsSchema = z.object({
  id: z.uuid(),
});

export const ListHouseholdMembersResponseSchema = z.array(householdMemberSchema);

export const UpdateHouseholdMemberRequestParamsSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
});

export const UpdateHouseholdMemberRequestBodySchema = z.object({
  role: householdRoleSchema,
});

export const UpdateHouseholdMemberResponseSchema = householdMemberSchema;

export const RemoveHouseholdMemberRequestParamsSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
});

export const CreateHouseholdInviteRequestParamsSchema = z.object({
  id: z.uuid(),
});

export const CreateHouseholdInviteRequestBodySchema = z.object({
  email: z
    .email()
    .max(255)
    .transform((value) => value.trim().toLowerCase()),
  role: householdRoleSchema.exclude(['owner']).default('member'),
});

export const CreateHouseholdInviteResponseSchema = householdInviteSchema;

export const ListHouseholdInvitesRequestParamsSchema = z.object({
  id: z.uuid(),
});

export const ListHouseholdInvitesResponseSchema = z.array(householdInviteSchema);

export const ListMyHouseholdInvitesResponseSchema = z.array(householdInviteSchema);

export const ManageHouseholdInviteRequestParamsSchema = z.object({
  id: z.uuid(),
  inviteId: z.uuid(),
});

const householdInviteTokenSchema = z.string().min(1).max(256);

export const PreviewHouseholdInviteRequestQuerySchema = z.object({
  token: householdInviteTokenSchema,
});

export const HouseholdInviteTokenRequestBodySchema = z.object({
  token: householdInviteTokenSchema,
});

export const HouseholdInviteIdRequestParamsSchema = z.object({
  inviteId: z.uuid(),
});

export const AcceptHouseholdInviteResponseSchema = z.object({
  household: z.object({
    id: z.uuid(),
    name: z.string(),
    role: householdRoleSchema,
  }),
});

export const PreviewHouseholdInviteResponseSchema = z.object({
  email: z.email(),
  household: z.object({
    name: z.string(),
  }),
  role: householdRoleSchema,
  inviter: z
    .object({
      name: z.string(),
      image: z.string().nullable(),
    })
    .nullable(),
  status: householdInviteComputedStatusSchema,
  expiresAt: z.iso.datetime(),
});

export const HouseholdInviteLinkResponseSchema = z.object({
  url: z.url(),
  expiresAt: z.iso.datetime(),
});

export type Household = z.infer<typeof householdSchema>;
export type HouseholdMember = z.infer<typeof householdMemberSchema>;
export type HouseholdInvite = z.infer<typeof householdInviteSchema>;
export type HouseholdSettings = z.infer<typeof householdSettingsSchema>;
export type CreateHouseholdRequestBody = z.infer<typeof CreateHouseholdRequestBodySchema>;
export type CreateHouseholdResponse = z.infer<typeof CreateHouseholdResponseSchema>;
export type ListHouseholdsResponse = z.infer<typeof ListHouseholdsResponseSchema>;
export type UpdateHouseholdRequestParams = z.infer<typeof UpdateHouseholdRequestParamsSchema>;
export type UpdateHouseholdRequestBody = z.infer<typeof UpdateHouseholdRequestBodySchema>;
export type UpdateHouseholdResponse = z.infer<typeof UpdateHouseholdResponseSchema>;
export type ListHouseholdMembersRequestParams = z.infer<
  typeof ListHouseholdMembersRequestParamsSchema
>;
export type ListHouseholdMembersResponse = z.infer<typeof ListHouseholdMembersResponseSchema>;
export type UpdateHouseholdMemberRequestParams = z.infer<
  typeof UpdateHouseholdMemberRequestParamsSchema
>;
export type UpdateHouseholdMemberRequestBody = z.infer<
  typeof UpdateHouseholdMemberRequestBodySchema
>;
export type UpdateHouseholdMemberResponse = z.infer<typeof UpdateHouseholdMemberResponseSchema>;
export type RemoveHouseholdMemberRequestParams = z.infer<
  typeof RemoveHouseholdMemberRequestParamsSchema
>;
export type CreateHouseholdInviteRequestParams = z.infer<
  typeof CreateHouseholdInviteRequestParamsSchema
>;
export type CreateHouseholdInviteRequestBody = z.infer<
  typeof CreateHouseholdInviteRequestBodySchema
>;
export type CreateHouseholdInviteResponse = z.infer<typeof CreateHouseholdInviteResponseSchema>;
export type ListHouseholdInvitesRequestParams = z.infer<
  typeof ListHouseholdInvitesRequestParamsSchema
>;
export type ListHouseholdInvitesResponse = z.infer<typeof ListHouseholdInvitesResponseSchema>;
export type ListMyHouseholdInvitesResponse = z.infer<typeof ListMyHouseholdInvitesResponseSchema>;
export type ManageHouseholdInviteRequestParams = z.infer<
  typeof ManageHouseholdInviteRequestParamsSchema
>;
export type PreviewHouseholdInviteRequestQuery = z.infer<
  typeof PreviewHouseholdInviteRequestQuerySchema
>;
export type PreviewHouseholdInviteResponse = z.infer<typeof PreviewHouseholdInviteResponseSchema>;
export type HouseholdInviteTokenRequestBody = z.infer<typeof HouseholdInviteTokenRequestBodySchema>;
export type HouseholdInviteIdRequestParams = z.infer<typeof HouseholdInviteIdRequestParamsSchema>;
export type AcceptHouseholdInviteResponse = z.infer<typeof AcceptHouseholdInviteResponseSchema>;
export type HouseholdInviteLinkResponse = z.infer<typeof HouseholdInviteLinkResponseSchema>;
