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
import type { CategoryHttp } from "@/interfaces/http/categories";
import type { TransactionType } from "@/interfaces/http/transactions";
import { usePaymentMethodsQuery } from "@/queries/use-payment-methods.query";
import { useAppMutation } from "@/lib/mutations";
import { createTransaction } from "@/services/transactions.service";

type TransactionFormValues = {
  type: TransactionType;
  description: string;
  amount: string;
  accountId: string;
  toAccountId: string;
  categoryId: string;
  paymentMethodCode: string;
  direction: "increase" | "decrease";
  purchaseDate: string;
  postedDate: string;
  includeInBudget: "yes" | "no";
};

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export function TransactionFormSheet({
  open,
  onOpenChange,
  accounts,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: AccountHttp[];
  categories: CategoryHttp[];
}) {
  const queryClient = useQueryClient();
  const today = getToday();
  const eligibleAccounts = React.useMemo(
    () => accounts.filter((account) => account.type !== "credit_card"),
    [accounts],
  );
  const resetValues = React.useMemo<TransactionFormValues>(
    () => ({
      type: "expense",
      description: "",
      amount: "",
      accountId: eligibleAccounts[0]?.id ?? "",
      toAccountId: eligibleAccounts[1]?.id ?? eligibleAccounts[0]?.id ?? "",
      categoryId: "",
      paymentMethodCode: "",
      direction: "increase",
      purchaseDate: today,
      postedDate: today,
      includeInBudget: "yes",
    }),
    [eligibleAccounts, today],
  );
  const wasOpenRef = React.useRef(false);

  const form = useForm<TransactionFormValues>({
    defaultValues: resetValues,
  });

  const type = form.watch("type");
  const accountId = form.watch("accountId");
  const account = eligibleAccounts.find((item) => item.id === accountId);
  const fromAccount = eligibleAccounts.find((item) => item.id === form.watch("accountId"));
  const paymentCurrencyCode = type === "transfer" ? fromAccount?.currencyCode : account?.currencyCode;
  const { data: paymentMethods = [] } = usePaymentMethodsQuery(paymentCurrencyCode);

  const filteredCategories = React.useMemo(
    () =>
      type === "expense" || type === "income"
        ? categories.filter((category) => category.type === type)
        : [],
    [categories, type],
  );

  React.useEffect(() => {
    if (open && !wasOpenRef.current) {
      form.reset(resetValues);
    }
    wasOpenRef.current = open;
  }, [form, open, resetValues]);

  React.useEffect(() => {
    if (type === "expense" || type === "income") {
      if (!filteredCategories.some((category) => category.id === form.getValues("categoryId"))) {
        form.setValue("categoryId", filteredCategories[0]?.id ?? "");
      }
      if (!paymentMethods.some((method) => method.code === form.getValues("paymentMethodCode"))) {
        form.setValue("paymentMethodCode", paymentMethods[0]?.code ?? "");
      }
    }
  }, [filteredCategories, form, paymentMethods, type]);

  const mutation = useAppMutation({
    mutationFn: createTransaction,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["accounts"] }),
        queryClient.invalidateQueries({ queryKey: ["budgets"] }),
      ]);
      onOpenChange(false);
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const amount = Number(values.amount);

    if (values.type === "expense" || values.type === "income") {
      await mutation.mutateAsync({
        type: values.type,
        description: values.description,
        amount,
        currencyCode: account?.currencyCode ?? "BRL",
        accountId: values.accountId,
        paymentMethodCode: values.paymentMethodCode,
        categoryId: values.categoryId,
        purchaseDate: values.purchaseDate,
        postedDate: values.postedDate,
        includeInBudget: values.includeInBudget === "yes",
      });
      return;
    }

    if (values.type === "transfer") {
      await mutation.mutateAsync({
        type: "transfer",
        description: values.description,
        amount,
        currencyCode: fromAccount?.currencyCode ?? "BRL",
        fromAccountId: values.accountId,
        toAccountId: values.toAccountId,
        purchaseDate: values.purchaseDate,
        postedDate: values.postedDate,
        includeInBudget: values.includeInBudget === "yes",
      });
      return;
    }

    await mutation.mutateAsync({
      type: "adjustment",
      description: values.description,
      amount,
      accountId: values.accountId,
      direction: values.direction,
      purchaseDate: values.purchaseDate,
      postedDate: values.postedDate,
      includeInBudget: values.includeInBudget === "yes",
    });
  });

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="New transaction"
      description="Create income, expense, transfer, or adjustment entries from the live API."
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Transaction type</Label>
            <Select value={type} onValueChange={(value: TransactionType) => form.setValue("type", value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transaction-amount">Amount (minor units)</Label>
            <Input id="transaction-amount" type="number" min={1} placeholder="2500" {...form.register("amount")} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="transaction-description">Description</Label>
          <Input id="transaction-description" placeholder="Lunch, salary, transfer..." {...form.register("description")} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{type === "transfer" ? "From account" : "Account"}</Label>
            <Select value={form.watch("accountId")} onValueChange={(value) => form.setValue("accountId", value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {eligibleAccounts.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === "transfer" ? (
            <div className="space-y-2">
              <Label>To account</Label>
              <Select value={form.watch("toAccountId")} onValueChange={(value) => form.setValue("toAccountId", value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select destination account" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleAccounts
                    .filter((item) => item.id !== form.watch("accountId"))
                    .map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {(type === "expense" || type === "income") && (
            <>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.watch("categoryId")} onValueChange={(value) => form.setValue("categoryId", value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Payment method</Label>
                <Select
                  value={form.watch("paymentMethodCode")}
                  onValueChange={(value) => form.setValue("paymentMethodCode", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.code}>
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {type === "adjustment" ? (
            <div className="space-y-2">
              <Label>Direction</Label>
              <Select
                value={form.watch("direction")}
                onValueChange={(value: "increase" | "decrease") => form.setValue("direction", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select direction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase">Increase</SelectItem>
                  <SelectItem value="decrease">Decrease</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="transaction-purchase-date">Purchase date</Label>
            <Input id="transaction-purchase-date" type="date" {...form.register("purchaseDate")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="transaction-posted-date">Posted date</Label>
            <Input id="transaction-posted-date" type="date" {...form.register("postedDate")} />
          </div>
          <div className="space-y-2">
            <Label>Include in budget</Label>
            <Select
              value={form.watch("includeInBudget")}
              onValueChange={(value: "yes" | "no") => form.setValue("includeInBudget", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Budget inclusion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Included</SelectItem>
                <SelectItem value="no">Excluded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <FormErrorBoundary error={mutation.error} />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Create transaction"}
          </Button>
        </div>
      </form>
    </FormSheet>
  );
}
