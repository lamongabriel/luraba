import { z } from "zod";

export const locationCountryOptionSchema = z.object({
  code: z.string().length(2),
  emoji: z.string().min(1),
  image: z.url(),
  name: z.string().min(1),
});

export const locationTimezoneOptionSchema = z.object({
  abbreviation: z.string().min(1),
  isDaylightSaving: z.boolean(),
  label: z.string().min(1),
  offset: z.number(),
  value: z.string().min(1),
});

export const locationOptionsResponseSchema = z.object({
  countries: z.array(locationCountryOptionSchema),
  timezones: z.array(locationTimezoneOptionSchema),
});

export type LocationCountryOption = z.output<typeof locationCountryOptionSchema>;
export type LocationTimezoneOption = z.output<typeof locationTimezoneOptionSchema>;
export type LocationOptionsResponse = z.output<typeof locationOptionsResponseSchema>;
