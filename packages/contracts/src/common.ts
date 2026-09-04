import { z } from "zod";

export const MAX_SAFE_MINOR_UNITS = Number.MAX_SAFE_INTEGER;
export const moneyAmountSchema = z.coerce.number().int().positive().max(MAX_SAFE_MINOR_UNITS);
export const moneyBalanceSchema = z.coerce
  .number()
  .int()
  .min(-MAX_SAFE_MINOR_UNITS)
  .max(MAX_SAFE_MINOR_UNITS);

export const currencyCodeSchema = z
  .string()
  .trim()
  .length(3)
  .transform((value) => value.toUpperCase());
export const idParamsSchema = z.object({ id: z.uuid() });
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

export const INSTITUTION_DOMAIN_ERROR = "Enter a valid institution domain, such as example.com.";
export function normalizeDomain(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  try {
    const parsed = /^[a-z][a-z\d+.-]*:\/\//iu.test(normalized)
      ? new URL(normalized)
      : new URL(`https://${normalized}`);
    const domain = parsed.hostname.replace(/^www\./u, "").replace(/\.$/u, "");
    return /^[a-z0-9.-]+\.[a-z]{2,}$/u.test(domain) ? domain : null;
  } catch {
    return null;
  }
}
export const institutionDomainInputSchema = z
  .string()
  .trim()
  .min(1, INSTITUTION_DOMAIN_ERROR)
  .max(255, "Institution domain must be 255 characters or fewer.")
  .refine((value) => normalizeDomain(value) !== null, INSTITUTION_DOMAIN_ERROR);

export const wireDateTimeSchema = z
  .union([z.date(), z.iso.datetime()])
  .transform((value) => (value instanceof Date ? value.toISOString() : value));

export const dateInputSchema = z
  .union([z.date(), z.iso.date(), z.iso.datetime()])
  .transform((value) => (value instanceof Date ? value : new Date(value)));
