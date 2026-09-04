import type { z } from "zod";
import { userPreferencesSchema } from "./resource.js";
export const updateUserPreferencesBodySchema = userPreferencesSchema.partial();
export type UpdateUserPreferencesInput = z.input<typeof updateUserPreferencesBodySchema>;
