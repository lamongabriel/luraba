import { z } from "zod";
import { createdByUserIdSchema, currencyCodeSchema } from "../common.js";

/** An entry of the household's catalog of things it buys. */
export const productSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  imageUploadId: z.uuid().nullable(),
  /** Latest known unit price in minor units, null when never priced. */
  price: z.number().int().nullable(),
  currencyCode: currencyCodeSchema,
  createdByUserId: createdByUserIdSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Product = z.output<typeof productSchema>;
