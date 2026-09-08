import { z } from "zod";

export const createEditHouseholdFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a household name.")
    .max(255, "Household names must be 255 characters or fewer."),
  description: z.string().trim().max(4000, "Descriptions must be 4,000 characters or fewer."),
  defaultCurrencyId: z.string().trim().length(3, "Select a three-letter default currency."),
  countryCode: z.string().regex(/^[A-Z]{2}$/, "Select a valid country."),
  timezone: z.string().min(1, "Select a timezone."),
  budgetMonthStartsOn: z
    .number()
    .int("Choose a whole day.")
    .min(1, "Budget months start on day 1 or later.")
    .max(31, "Budget months can start on day 31 at most."),
  creditExpenseTiming: z.enum(["spend_month", "payment_month"]),
  creditInstallmentBudgetMode: z.enum(["per_installment", "full_amount"]),
});

export type CreateEditHouseholdFormValues = z.infer<typeof createEditHouseholdFormSchema>;
