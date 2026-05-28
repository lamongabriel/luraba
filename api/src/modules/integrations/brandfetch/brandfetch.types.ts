import { z } from 'zod';
import { integrationSummarySchema } from '../integrations.types';

export const UpdateBrandfetchIntegrationRequestBodySchema = z.object({
  clientId: z.string().trim().min(1).max(255),
});

export const UpdateBrandfetchIntegrationResponseSchema = integrationSummarySchema;

export const DeleteBrandfetchIntegrationResponseSchema = integrationSummarySchema;

export type UpdateBrandfetchIntegrationRequestBody = z.infer<typeof UpdateBrandfetchIntegrationRequestBodySchema>;
export type UpdateBrandfetchIntegrationResponse = z.infer<typeof UpdateBrandfetchIntegrationResponseSchema>;
export type DeleteBrandfetchIntegrationResponse = z.infer<typeof DeleteBrandfetchIntegrationResponseSchema>;
