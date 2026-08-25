import { z } from "zod";
import {
  householdInviteStatusSchema,
  householdPermissionSchema,
  householdRoleSchema,
} from "./permissions.js";

export const householdRoleMetadataSchema = z.object({
  value: householdRoleSchema,
  label: z.string(),
  description: z.string(),
  canBeInvited: z.boolean(),
  permissions: z.array(householdPermissionSchema),
});

export type HouseholdRoleMetadata = z.infer<typeof householdRoleMetadataSchema>;

export const householdPermissionMetadataSchema = z.object({
  value: householdPermissionSchema,
  label: z.string(),
  group: z.string(),
  description: z.string(),
});

export type HouseholdPermissionMetadata = z.infer<typeof householdPermissionMetadataSchema>;

export const householdInviteStatusMetadataSchema = z.object({
  value: householdInviteStatusSchema,
  label: z.string(),
  description: z.string(),
});

export type HouseholdInviteStatusMetadata = z.infer<typeof householdInviteStatusMetadataSchema>;
