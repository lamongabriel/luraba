import { z } from "zod";
import { currencyCodeSchema, idParamsSchema } from "../common.js";
import {
  booleanQuerySchema,
  commaSeparatedArraySchema,
  createListQuerySchema,
  temporalQuerySchema,
  validateRange,
} from "../list.js";
import { householdInviteStatusSchema, householdRoleSchema } from "../permissions.js";
import {
  countryCodeSchema,
  creditExpenseTimingSchema,
  creditInstallmentBudgetModeSchema,
  timezoneSchema,
} from "../preferences.js";

const householdSettingsPatchSchema = z
  .object({
    defaultCurrencyId: currencyCodeSchema,
    countryCode: countryCodeSchema,
    timezone: timezoneSchema,
    budgetMonthStartsOn: z.number().int().min(1).max(31),
    creditExpenseTiming: creditExpenseTimingSchema,
    creditInstallmentBudgetMode: creditInstallmentBudgetModeSchema,
  })
  .partial();

export const createHouseholdBodySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(4000).optional(),
  defaultCurrencyId: currencyCodeSchema.default("BRL"),
  countryCode: countryCodeSchema.default("BR"),
  timezone: timezoneSchema.default("America/Sao_Paulo"),
  budgetMonthStartsOn: z.number().int().min(1).max(31).default(1),
  creditExpenseTiming: creditExpenseTimingSchema.default("spend_month"),
  creditInstallmentBudgetMode: creditInstallmentBudgetModeSchema.default("per_installment"),
});
export const updateHouseholdBodySchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(4000).optional(),
    ...householdSettingsPatchSchema.shape,
  })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    "At least one household field must be provided",
  );
export const updateHouseholdMemberBodySchema = z.object({ role: householdRoleSchema });
export const createHouseholdInviteBodySchema = z.object({
  email: z
    .email()
    .max(255)
    .transform((value) => value.trim().toLowerCase()),
  role: householdRoleSchema.exclude(["owner"]).default("member"),
});
const inviteTokenSchema = z.string().min(1).max(256);
export const inviteTokenBodySchema = z.object({ token: inviteTokenSchema });
export const previewInviteQuerySchema = z.object({ token: inviteTokenSchema });
export const householdIdParamsSchema = idParamsSchema;
export const memberParamsSchema = z.object({ id: z.uuid(), userId: z.uuid() });
export const inviteParamsSchema = z.object({ id: z.uuid(), inviteId: z.uuid() });
export const inviteIdParamsSchema = z.object({ inviteId: z.uuid() });

const addRanges = <TSchema extends z.ZodType>(schema: TSchema, pairs: [string, string][]) =>
  schema.superRefine((query, ctx) => {
    pairs.forEach(([min, max]) => {
      validateRange(query as Record<string, unknown>, ctx, min, max);
    });
  });

export const listHouseholdsQuerySchema = addRanges(
  createListQuerySchema(
    {
      roles: commaSeparatedArraySchema(householdRoleSchema),
      countryCodes: commaSeparatedArraySchema(countryCodeSchema),
      defaultCurrencyCodes: commaSeparatedArraySchema(currencyCodeSchema),
      timezones: commaSeparatedArraySchema(timezoneSchema),
      budgetMonthStartsOnMin: z.coerce.number().int().min(1).max(31).optional(),
      budgetMonthStartsOnMax: z.coerce.number().int().min(1).max(31).optional(),
      creditExpenseTimings: commaSeparatedArraySchema(creditExpenseTimingSchema),
      creditInstallmentBudgetModes: commaSeparatedArraySchema(creditInstallmentBudgetModeSchema),
      createdAtFrom: temporalQuerySchema.optional(),
      createdAtTo: temporalQuerySchema.optional(),
      updatedAtFrom: temporalQuerySchema.optional(),
      updatedAtTo: temporalQuerySchema.optional(),
    },
    ["countryCode", "createdAt", "defaultCurrencyId", "name", "role", "updatedAt"],
  ),
  [
    ["budgetMonthStartsOnMin", "budgetMonthStartsOnMax"],
    ["createdAtFrom", "createdAtTo"],
    ["updatedAtFrom", "updatedAtTo"],
  ],
);
export const listHouseholdMembersQuerySchema = addRanges(
  createListQuerySchema(
    {
      roles: commaSeparatedArraySchema(householdRoleSchema),
      emailVerified: booleanQuerySchema.optional(),
      lastActiveAtFrom: temporalQuerySchema.optional(),
      lastActiveAtTo: temporalQuerySchema.optional(),
      createdAtFrom: temporalQuerySchema.optional(),
      createdAtTo: temporalQuerySchema.optional(),
      updatedAtFrom: temporalQuerySchema.optional(),
      updatedAtTo: temporalQuerySchema.optional(),
    },
    ["createdAt", "email", "emailVerified", "lastActiveAt", "name", "role", "updatedAt"],
  ),
  [
    ["lastActiveAtFrom", "lastActiveAtTo"],
    ["createdAtFrom", "createdAtTo"],
    ["updatedAtFrom", "updatedAtTo"],
  ],
);
const inviteFilterShape = {
  roles: commaSeparatedArraySchema(householdRoleSchema),
  statuses: commaSeparatedArraySchema(householdInviteStatusSchema),
  createdAtFrom: temporalQuerySchema.optional(),
  createdAtTo: temporalQuerySchema.optional(),
  updatedAtFrom: temporalQuerySchema.optional(),
  updatedAtTo: temporalQuerySchema.optional(),
  expiresAtFrom: temporalQuerySchema.optional(),
  expiresAtTo: temporalQuerySchema.optional(),
  acceptedAtFrom: temporalQuerySchema.optional(),
  acceptedAtTo: temporalQuerySchema.optional(),
  rejectedAtFrom: temporalQuerySchema.optional(),
  rejectedAtTo: temporalQuerySchema.optional(),
  canceledAtFrom: temporalQuerySchema.optional(),
  canceledAtTo: temporalQuerySchema.optional(),
} as const;
const inviteSorts = [
  "acceptedAt",
  "createdAt",
  "email",
  "expiresAt",
  "householdName",
  "role",
  "rejectedAt",
  "canceledAt",
  "status",
  "updatedAt",
] as const;
const inviteRanges: [string, string][] = [
  ["createdAtFrom", "createdAtTo"],
  ["updatedAtFrom", "updatedAtTo"],
  ["expiresAtFrom", "expiresAtTo"],
  ["acceptedAtFrom", "acceptedAtTo"],
  ["rejectedAtFrom", "rejectedAtTo"],
  ["canceledAtFrom", "canceledAtTo"],
];
export const listHouseholdInvitesQuerySchema = addRanges(
  createListQuerySchema(inviteFilterShape, inviteSorts),
  inviteRanges,
);
export const listMyHouseholdInvitesQuerySchema = addRanges(
  createListQuerySchema(
    { ...inviteFilterShape, householdIds: commaSeparatedArraySchema(z.uuid()) },
    inviteSorts,
  ),
  inviteRanges,
);

export type ListHouseholdsQuery = z.input<typeof listHouseholdsQuerySchema>;
export type ListHouseholdMembersQuery = z.input<typeof listHouseholdMembersQuerySchema>;
export type ListHouseholdInvitesQuery = z.input<typeof listHouseholdInvitesQuerySchema>;
export type ListMyHouseholdInvitesQuery = z.input<typeof listMyHouseholdInvitesQuerySchema>;
export type CreateHouseholdInput = z.input<typeof createHouseholdBodySchema>;
export type UpdateHouseholdInput = z.input<typeof updateHouseholdBodySchema>;
export type UpdateHouseholdMemberInput = z.input<typeof updateHouseholdMemberBodySchema>;
export type CreateHouseholdInviteInput = z.input<typeof createHouseholdInviteBodySchema>;
