import { z } from "zod";

export const healthServiceStatusSchema = z.enum(["up", "down"]);
export const healthStatusSchema = z.enum(["ok", "degraded", "error"]);

export const dependencyHealthSchema = z.object({
  status: healthServiceStatusSchema,
  checkedAt: z.iso.datetime(),
  error: z.string().optional(),
});

export const apiHealthSchema = z.object({
  status: z.literal("up"),
  checkedAt: z.iso.datetime(),
  uptimeSeconds: z.number().nonnegative(),
});

export const healthResponseSchema = z.object({
  status: healthStatusSchema,
  checkedAt: z.iso.datetime(),
  uptimeSeconds: z.number().nonnegative(),
  services: z.object({
    api: apiHealthSchema,
    db: dependencyHealthSchema,
    fxProviders: z.record(z.string(), dependencyHealthSchema),
  }),
});

export type HealthServiceStatus = z.output<typeof healthServiceStatusSchema>;
export type HealthStatus = z.output<typeof healthStatusSchema>;
export type DependencyHealth = z.output<typeof dependencyHealthSchema>;
export type HealthResponse = z.output<typeof healthResponseSchema>;
