"use client";

import type { InvestmentEvent } from "@luraba/contracts";

import { FormErrorBoundary } from "@/components/forms/form-error-boundary";
import { FormSheet } from "@/components/forms/form-sheet";

import { EventForm } from "./event-form";
import type { EventFormValues } from "./event-form.schema";

export function EventSheet({
  open,
  onOpenChange,
  event,
  seed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: InvestmentEvent;
  /** Pre-filled values for a new transaction (e.g. the account or asset you came from). */
  seed?: Partial<EventFormValues>;
}) {
  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={event ? "Edit transaction" : "New transaction"}
      description={
        event
          ? "Changing a transaction recalculates your positions, cost and taxes."
          : "Record a trade, income, fixed-income operation or corporate action."
      }
    >
      <FormErrorBoundary>
        <EventForm
          key={event?.id ?? "create"}
          event={event}
          seed={seed}
          onCancel={() => onOpenChange(false)}
          onSuccess={() => onOpenChange(false)}
        />
      </FormErrorBoundary>
    </FormSheet>
  );
}
