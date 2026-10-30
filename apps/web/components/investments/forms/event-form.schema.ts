import { INVESTMENT_EVENT_TYPES } from "@luraba/contracts";
import { z } from "zod";

import { fieldsFor } from "./event-form-config";

const decimal = z
  .string()
  .regex(/^\d+(\.\d+)?$/u, "Enter a valid number.")
  .or(z.literal(""));

export const eventFormSchema = z
  .object({
    accountId: z.string().min(1, "Choose an account."),
    type: z.enum(INVESTMENT_EVENT_TYPES),
    assetId: z.string(),
    targetAssetId: z.string(),
    tradeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, "Choose a date."),
    quantity: decimal,
    unitPrice: decimal,
    grossAmount: decimal,
    fees: decimal,
    taxesWithheld: decimal,
    ratioFrom: decimal,
    ratioTo: decimal,
    exchangeRatio: decimal,
    costRatio: decimal,
    notes: z.string().max(2000),
  })
  .superRefine((value, ctx) => {
    const fields = fieldsFor(value.type);
    const need = (key: keyof typeof value, message: string) => {
      if (!value[key]) ctx.addIssue({ code: "custom", path: [key], message });
    };
    if (fields.asset) need("assetId", "Choose an asset.");
    if (fields.target) need("targetAssetId", "Choose the other asset.");
    if (fields.quantity === "required") need("quantity", "Enter a quantity.");
    if (fields.unitPrice === "required") need("unitPrice", "Enter a price.");
    if (fields.gross === "required") need("grossAmount", "Enter an amount.");
    if (fields.ratio) {
      need("ratioFrom", "Enter the ratio.");
      need("ratioTo", "Enter the ratio.");
    }
    if (fields.exchangeRatio) need("exchangeRatio", "Enter the exchange ratio.");
    if (fields.gross === "optional" && !value.grossAmount && !(value.quantity && value.unitPrice)) {
      ctx.addIssue({ code: "custom", path: ["grossAmount"], message: "Enter an amount." });
    }
  });

export type EventFormValues = z.infer<typeof eventFormSchema>;
