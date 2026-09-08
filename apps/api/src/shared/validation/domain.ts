import { z } from "zod";

export const INSTITUTION_DOMAIN_ERROR = "Enter a valid institution domain, such as example.com.";

export function normalizeDomain(value: string): string | null {
  const normalizedValue = value.trim().toLowerCase();

  try {
    const parsed = /^[a-z][a-z\d+.-]*:\/\//iu.test(normalizedValue)
      ? new URL(normalizedValue)
      : new URL(`https://${normalizedValue}`);
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
