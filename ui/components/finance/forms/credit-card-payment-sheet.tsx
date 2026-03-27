"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { FormSheet } from "@/components/finance/forms/form-sheet";
import { FormErrorBoundary } from "@/components/forms/form-error-boundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AccountHttp } from "@/interfaces/http/accounts";
import type { CreditCardHttp } from "@/interfaces/http/credit-cards";
import { useAppMutation } from "@/lib/mutations";
import { createCreditCardPayment } from "@/services/credit-cards.service";

type PaymentFormValues = {
  description: string;
  amount: string;
  fromAccountId: string;
  paymentDate: string;
  postedDate: string;
};

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export function CreditCardPaymentSheet({
  open,
  onOpenChange,
  card,
  accounts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: CreditCardHttp;
  accounts: AccountHttp[];
}) {
  const queryClient = useQueryClient();
  const today = getToday();
  const assetAccounts = React.useMemo(
    () =>
      accounts.filter(
        (account) => account.classification === "asset" && account.currencyCode === card.currencyCode,
      ),
    [accounts, card.currencyCode],
  );
  const resetValues = React.useMemo<PaymentFormValues>(
    () => ({
      description: "",
      amount: "",
      fromAccountId: assetAccounts[0]?.id ?? "",
      paymentDate: today,
      postedDate: today,
    }),
    [assetAccounts, today],
  );
  const wasOpenRef = React.useRef(false);

  const form = useForm<PaymentFormValues>({
    defaultValues: resetValues,
  });

  React.useEffect(() => {
    if (open && !wasOpenRef.current) {
      form.reset(resetValues);
    }
    wasOpenRef.current = open;
  }, [form, open, resetValues]);

  const mutation = useAppMutation({
    mutationFn: (values: PaymentFormValues) =>
      createCreditCardPayment(card.id, {
        description: values.description || undefined,
        amount: Number(values.amount),
        fromAccountId: values.fromAccountId,
        paymentDate: values.paymentDate,
        postedDate: values.postedDate,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["credit-cards"] }),
        queryClient.invalidateQueries({ queryKey: ["credit-cards", card.id] }),
        queryClient.invalidateQueries({ queryKey: ["credit-cards", card.id, "cycles"] }),
        queryClient.invalidateQueries({ queryKey: ["credit-cards", card.id, "forecast"] }),
        queryClient.invalidateQueries({ queryKey: ["accounts"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
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
      title="Make card payment"
      description="Move money from an asset account to this credit card liability."
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="card-payment-description">Description</Label>
          <Input id="card-payment-description" placeholder="Statement payment" {...form.register("description")} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="card-payment-amount">Amount (minor units)</Label>
            <Input id="card-payment-amount" type="number" min={1} placeholder="50000" {...form.register("amount")} />
          </div>
          <div className="space-y-2">
            <Label>From account</Label>
            <Select value={form.watch("fromAccountId")} onValueChange={(value) => form.setValue("fromAccountId", value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select paying account" />
              </SelectTrigger>
              <SelectContent>
                {assetAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="card-payment-date">Payment date</Label>
            <Input id="card-payment-date" type="date" {...form.register("paymentDate")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="card-payment-posted-date">Posted date</Label>
            <Input id="card-payment-posted-date" type="date" {...form.register("postedDate")} />
          </div>
        </div>

        <FormErrorBoundary error={mutation.error} />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Create payment"}
          </Button>
        </div>
      </form>
    </FormSheet>
  );
}
