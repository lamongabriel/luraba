import { z } from "zod";
import { hexColorSchema, iconNameSchema } from "../common.js";

export const tagSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  color: hexColorSchema.nullable(),
  icon: iconNameSchema.nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const tagSummarySchema = tagSchema.pick({ id: true, name: true, color: true, icon: true });
export type Tag = z.output<typeof tagSchema>;
export type TagSummary = z.output<typeof tagSummarySchema>;
