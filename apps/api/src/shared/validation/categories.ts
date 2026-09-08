import { z } from "zod";
import { categoryTypeEnum } from "@/db/schemas/enums.schema";

export const categoryTypeSchema = z.enum(categoryTypeEnum.enumValues);
export const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/u);
export const iconNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z][A-Za-z0-9]*$/u);
export const categoryColorSchema = hexColorSchema;
export const categoryIconSchema = iconNameSchema;

export type CategoryType = z.infer<typeof categoryTypeSchema>;
export type CategoryColor = z.infer<typeof categoryColorSchema>;
export type CategoryIcon = z.infer<typeof categoryIconSchema>;
