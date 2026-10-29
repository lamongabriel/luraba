import { z } from "zod";
import { dateQuerySchema } from "../list.js";
import { exportFormatSchema } from "./resource.js";

export const exportParamsSchema = z.object({ exporterId: z.string().min(1).max(64) });
export const exportQuerySchema = z.object({
  format: exportFormatSchema.default("csv"),
  dateFrom: dateQuerySchema.optional(),
  dateTo: dateQuerySchema.optional(),
});
export type ExportQuery = z.input<typeof exportQuerySchema>;
