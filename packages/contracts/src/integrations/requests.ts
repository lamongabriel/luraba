import { z } from "zod";
import {
  booleanQuerySchema,
  commaSeparatedArraySchema,
  createListQuerySchema,
  temporalQuerySchema,
  validateRange,
} from "../list.js";
import { integrationProviderSchema, integrationStatusSchema } from "./resource.js";

export const listIntegrationsQuerySchema = createListQuerySchema(
  {
    providers: commaSeparatedArraySchema(integrationProviderSchema),
    statuses: commaSeparatedArraySchema(integrationStatusSchema),
    configured: booleanQuerySchema.optional(),
    lastCheckedAtFrom: temporalQuerySchema.optional(),
    lastCheckedAtTo: temporalQuerySchema.optional(),
  },
  ["configured", "lastCheckedAt", "provider", "status"],
).superRefine((query, ctx) => validateRange(query, ctx, "lastCheckedAtFrom", "lastCheckedAtTo"));

export const updateBrandfetchBodySchema = z.object({ clientId: z.string().trim().min(1).max(255) });

export type ListIntegrationsQuery = z.input<typeof listIntegrationsQuerySchema>;
export type UpdateBrandfetchIntegrationInput = z.input<typeof updateBrandfetchBodySchema>;
