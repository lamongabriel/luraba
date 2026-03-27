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
import type { CategoryHttp } from "@/interfaces/http/categories";
import type { CreditCardHttp } from "@/interfaces/http/credit-cards";
import { useAppMutation } from "@/lib/mutations";
import { createCreditCardPurchase } from "@/services/credit-cards.service";

type PurchaseFormValues = {
  description: string;
  amount: string;
  categoryId: string;
  purchaseDate: string;
  postedDate: string;
  installmentCount: string;
};

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export function CreditCardPurchaseSheet({
  open,
  onOpenChange,
  card,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: CreditCardHttp;
  categories: CategoryHttp[];
}) {
  const queryClient = useQueryClient();
  const today = getToday();
  const expenseCategories = React.useMemo(
    () => categories.filter((category) => category.type === "expense"),
    [categories],
  );
  const resetValues = React.useMemo<PurchaseFormValues>(
    () => ({
      description: "",
      amount: "",
      categoryId: expenseCategories[0]?.id ?? "",
      purchaseDate: today,
      postedDate: today,
      installmentCount: "1",
    }),
    [expenseCategories, today],
  );
  const wasOpenRef = React.useRef(false);
  const form = useForm<PurchaseFormValues>({
    defaultValues: resetValues,
  });

  React.useEffect(() => {
    if (open && !wasOpenRef.current) {
      form.reset(resetValues);
    }
    wasOpenRef.current = open;
  }, [form, open, resetValues]);

  const mutation = useAppMutation({
    mutationFn: (values: PurchaseFormValues) =>
      createCreditCardPurchase(card.id, {
        description: values.description,
        amount: Number(values.amount),
        categoryId: values.categoryId,
        purchaseDate: values.purchaseDate,
        postedDate: values.postedDate,
        installmentCount: Number(values.installmentCount),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["credit-cards"] }),
        queryClient.invalidateQueries({ queryKey: ["credit-cards", card.id] }),
        queryClient.invalidateQueries({ queryKey: ["credit-cards", card.id, "cycles"] }),
        queryClient.invalidateQueries({ queryKey: ["credit-cards", card.id, "forecast"] }),
        queryClient.invalidateQueries({ queryKey: ["accounts"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["budgets"] }),
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
      title="New card purchase"
      description={`Add a purchase to ${card.name} and distribute it across billing cycles when needed.`}
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="purchase-description">Description</Label>
          <Input id="purchase-description" placeholder="Flight to Sao Paulo" {...form.register("description")} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="purchase-amount">Amount (minor units)</Label>
            <Input id="purchase-amount" type="number" min={1} placeholder="150000" {...form.register("amount")} />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={form.watch("categoryId")} onValueChange={(value) => form.setValue("categoryId", value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="purchase-date">Purchase date</Label>
            <Input id="purchase-date" type="date" {...form.register("purchaseDate")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchase-posted-date">Posted date</Label>
            <Input id="purchase-posted-date" type="date" {...form.register("postedDate")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchase-installments">Installments</Label>
            <Input id="purchase-installments" type="number" min={1} max={60} {...form.register("installmentCount")} />
          </div>
        </div>

        <FormErrorBoundary error={mutation.error} />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Create purchase"}
          </Button>
        </div>
      </form>
    </FormSheet>
  );
}
