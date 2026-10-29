import { z } from "zod";

export const exportFormatSchema = z.enum(["csv", "json"]);
export const exporterSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  formats: z.array(exportFormatSchema),
  /** True when the exporter honours `dateFrom` / `dateTo`. */
  supportsDateRange: z.boolean(),
});
export type Exporter = z.output<typeof exporterSchema>;
export type ExportFormat = z.output<typeof exportFormatSchema>;
