import type {
  accountProfileSchema,
  accountSchema,
  accountSummarySchema,
  createAccountInputSchema,
  updateAccountInputSchema,
} from "@luraba/contracts/accounts";

export type { AccountClassification, AccountType } from "@luraba/contracts/accounts";

import type { accountsTable } from "@luraba/db/schemas/accounts.schema";
import type { z } from "zod";

/** Database records and service-facing values stay API-local; wire schemas live in contracts. */
export type AccountRecord = typeof accountsTable.$inferSelect;
export type Account = z.input<typeof accountSchema>;
export type AccountSummary = z.input<typeof accountSummarySchema>;
export type AccountDetails = Account & {
  balance: number;
  details: z.input<typeof accountProfileSchema>;
};
export type CreateAccountValues = z.output<typeof createAccountInputSchema>;
export type UpdateAccountValues = z.output<typeof updateAccountInputSchema>;
