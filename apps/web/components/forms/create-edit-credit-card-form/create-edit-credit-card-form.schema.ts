import { z } from "zod"

import {
  CREDIT_CARD_BRAND_VALUES,
  CREDIT_CARD_COLOR_PRESETS,
} from "@/lib/credit-cards"
import {
  INSTITUTION_DOMAIN_ERROR,
  isValidInstitutionDomain,
} from "@/lib/domains"

const optionalText = (label: string, max: number) =>
  z.string().trim().max(max, `${label} must be ${max} characters or fewer.`)

const optionalAmount = z.union([
  z
    .number({ error: "Enter a valid credit limit." })
    .finite()
    .nonnegative("Credit limit cannot be negative."),
  z.literal(""),
])

export const createEditCreditCardFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a card name.")
    .max(255, "Card name must be 255 characters or fewer."),
  ownerAccountId: z.string().uuid("Choose a cash account for this card."),
  currencyCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, "The card currency is derived from its account."),
  institutionName: optionalText("Institution name", 255),
  institutionDomain: z
    .string()
    .trim()
    .max(255, "Institution domain must be 255 characters or fewer.")
    .refine(isValidInstitutionDomain, INSTITUTION_DOMAIN_ERROR),
  notes: optionalText("Notes", 4000),
  brand: z.enum(CREDIT_CARD_BRAND_VALUES, {
    error: "Choose a card brand.",
  }),
  last4: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Enter the last four digits of the card."),
  color: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i, "Choose a six-digit hexadecimal card color.")
    .or(z.literal("")),
  closingDay: z
    .number({ error: "Enter a closing day." })
    .int("Closing day must be a whole number.")
    .min(1, "Closing day must be between 1 and 31.")
    .max(31, "Closing day must be between 1 and 31."),
  dueDay: z
    .number({ error: "Enter a due day." })
    .int("Due day must be a whole number.")
    .min(1, "Due day must be between 1 and 31.")
    .max(31, "Due day must be between 1 and 31."),
  creditLimitAmount: optionalAmount,
})

export type CreateEditCreditCardFormValues = z.infer<
  typeof createEditCreditCardFormSchema
>

export const creditCardColorPresets = CREDIT_CARD_COLOR_PRESETS
