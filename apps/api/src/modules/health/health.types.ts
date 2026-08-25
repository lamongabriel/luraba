import { z } from 'zod';

const serviceStatusSchema = z.enum(['up', 'down']);
const healthStatusSchema = z.enum(['ok', 'degraded', 'error']);

const dependencyHealthSchema = z.object({
  status: serviceStatusSchema,
  checkedAt: z.iso.datetime(),
  error: z.string().optional(),
});

const apiHealthSchema = z.object({
  status: z.literal('up'),
  checkedAt: z.iso.datetime(),
  uptimeSeconds: z.number().nonnegative(),
});

export const HealthResponseSchema = z.object({
  status: healthStatusSchema,
  checkedAt: z.iso.datetime(),
  uptimeSeconds: z.number().nonnegative(),
  services: z.object({
    api: apiHealthSchema,
    db: dependencyHealthSchema,
    fxProviders: z.record(z.string(), dependencyHealthSchema),
  }),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
