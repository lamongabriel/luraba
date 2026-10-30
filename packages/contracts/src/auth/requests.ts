import { z } from "zod";
import { phoneNumberSchema } from "../common.js";
import { countryCodeSchema } from "../preferences.js";
import { userPreferencesSchema } from "./resource.js";

export const updateUserPreferencesBodySchema = userPreferencesSchema.partial();
export type UpdateUserPreferencesInput = z.input<typeof updateUserPreferencesBodySchema>;

const MIN_BIRTH_YEAR = 1900;

export const updateUserProfileBodySchema = z
  .object({
    phoneNumber: phoneNumberSchema.nullable(),
    countryCode: countryCodeSchema.nullable(),
    dateOfBirth: z.iso
      .date()
      .refine((value) => value >= `${MIN_BIRTH_YEAR}-01-01`, "Enter a valid date of birth")
      .refine((value) => value <= new Date().toISOString().slice(0, 10), "Can't be in the future")
      .nullable(),
  })
  .partial();
export type UpdateUserProfileInput = z.input<typeof updateUserProfileBodySchema>;
