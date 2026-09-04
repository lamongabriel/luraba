import { z } from "zod";
import { currencyCodeSchema } from "../common.js";

const dateSchema = z.iso.date();
export const netWorthQuerySchema = z
  .object({
    dateFrom: dateSchema.optional(),
    dateTo: dateSchema.optional(),
    displayCurrencyCode: currencyCodeSchema.optional(),
    granularity: z.enum(["day", "week", "month"]).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .superRefine((value, ctx) => {
    if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo)
      ctx.addIssue({
        code: "custom",
        path: ["dateFrom"],
        message: "dateFrom must be before dateTo",
      });
  });
export type NetWorthQuery = z.input<typeof netWorthQuerySchema>;
