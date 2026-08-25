import { z } from 'zod';

export const countryOptionSchema = z.object({
  code: z.string().length(2),
  emoji: z.string().min(1),
  image: z.url(),
  name: z.string().min(1),
});

export const timezoneOptionSchema = z.object({
  abbreviation: z.string().min(1),
  isDaylightSaving: z.boolean(),
  label: z.string().min(1),
  offset: z.number(),
  value: z.string().min(1),
});

export const GetLocationOptionsResponseSchema = z.object({
  countries: z.array(countryOptionSchema),
  timezones: z.array(timezoneOptionSchema),
});

export type GetLocationOptionsResponse = z.infer<typeof GetLocationOptionsResponseSchema>;
