"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { FormSheet } from "@/components/finance/forms/form-sheet";
import { FormErrorBoundary } from "@/components/forms/form-error-boundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CreditCardCycleSummaryHttp } from "@/interfaces/http/credit-cards";
import { useAppMutation } from "@/lib/mutations";
import { updateCreditCardCycle } from "@/services/credit-cards.service";

type CycleFormValues = {
  periodStart: string;
  periodEnd: string;
  closingDate: string;
  dueDate: string;
};

export function CreditCardCycleSheet({
  open,
  onOpenChange,
  creditCardId,
  cycle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creditCardId: string;
  cycle: CreditCardCycleSummaryHttp;
}) {
  const queryClient = useQueryClient();
  const resetValues = React.useMemo<CycleFormValues>(
    () => ({
      periodStart: cycle.periodStart,
      periodEnd: cycle.periodEnd,
      closingDate: cycle.closingDate,
      dueDate: cycle.dueDate,
    }),
    [cycle.closingDate, cycle.dueDate, cycle.periodEnd, cycle.periodStart],
  );
  const wasOpenRef = React.useRef(false);
  const form = useForm<CycleFormValues>({
    defaultValues: resetValues,
  });

  React.useEffect(() => {
    if (open && !wasOpenRef.current) {
      form.reset(resetValues);
    }
    wasOpenRef.current = open;
  }, [form, open, resetValues]);

  const mutation = useAppMutation({
    mutationFn: (values: CycleFormValues) => updateCreditCardCycle(creditCardId, cycle.id, values),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["credit-cards", creditCardId, "cycles"] }),
        queryClient.invalidateQueries({ queryKey: ["credit-cards", creditCardId, "cycles", cycle.id] }),
        queryClient.invalidateQueries({ queryKey: ["credit-cards", creditCardId, "forecast"] }),
      ]);
      onOpenChange(false);
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await mutation.mutateAsync(values);
  });

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Edit billing cycle"
      description="Update the cycle window and statement dates. Overlapping cycles will be rejected by the API."
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cycle-period-start">Period start</Label>
            <Input id="cycle-period-start" type="date" {...form.register("periodStart")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cycle-period-end">Period end</Label>
            <Input id="cycle-period-end" type="date" {...form.register("periodEnd")} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cycle-closing-date">Closing date</Label>
            <Input id="cycle-closing-date" type="date" {...form.register("closingDate")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cycle-due-date">Due date</Label>
            <Input id="cycle-due-date" type="date" {...form.register("dueDate")} />
          </div>
        </div>

        <FormErrorBoundary error={mutation.error} />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save cycle"}
          </Button>
        </div>
      </form>
    </FormSheet>
  );
}
