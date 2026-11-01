import { type Control, Controller } from "react-hook-form";

import { Switch } from "@/components/ui/switch";
import { Typography } from "@/components/ui/typography";

import type { CreateEditTransactionFormValues } from "../create-edit-transaction-form.schema";
import { TransactionFormSection } from "./transaction-form-section";

/** Budget switch. Tags live next to the category and merchant fields, not here. */
export function SettingsSection({
  control,
}: {
  control: Control<CreateEditTransactionFormValues>;
}) {
  return (
    <TransactionFormSection title="Settings">
      <Controller
        control={control}
        name="includeInBudget"
        render={({ field }) => (
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <label htmlFor={field.name} className="text-xs font-medium">
                Include in budget
              </label>
              <Typography variant="small-muted">
                {field.value
                  ? "Counts toward your budget calculations."
                  : "Excluded from your budget calculations."}
              </Typography>
            </div>
            <Switch
              id={field.name}
              checked={field.value}
              onCheckedChange={field.onChange}
              aria-label="Include in budget"
            />
          </div>
        )}
      />
    </TransactionFormSection>
  );
}
