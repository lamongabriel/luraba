import { z } from 'zod';

const timestampSchema = z.iso.datetime();
const serviceStatusSchema = z.enum(['up', 'down']);
const healthStatusSchema = z.enum(['ok', 'degraded', 'error']);

const dependencyHealthSchema = z.object({
  status: serviceStatusSchema,
  checkedAt: timestampSchema,
  error: z.string().optional(),
});

const apiHealthSchema = z.object({
  status: z.literal('up'),
  checkedAt: timestampSchema,
  uptimeSeconds: z.number().nonnegative(),
});

export const HealthResponseSchema = z.object({
  status: healthStatusSchema,
  checkedAt: timestampSchema,
  uptimeSeconds: z.number().nonnegative(),
  services: z.object({
    api: apiHealthSchema,
    db: dependencyHealthSchema,
    fxProviders: z.record(z.string(), dependencyHealthSchema),
  }),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
