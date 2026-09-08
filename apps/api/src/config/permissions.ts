import type { HouseholdPermission, HouseholdRole } from "@luraba/contracts";
import type {
  CreditExpenseTiming,
  CreditInstallmentBudgetMode,
  Timezone,
} from "@/shared/validation/preferences";

export type HouseholdContext = {
  householdId: string;
  userId: string;
  role: HouseholdRole;
  permissions: HouseholdPermission[];
  timezone: Timezone;
  creditExpenseTiming: CreditExpenseTiming;
  creditInstallmentBudgetMode: CreditInstallmentBudgetMode;
};
