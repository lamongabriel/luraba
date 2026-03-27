"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { FormErrorBoundary } from "@/components/forms/form-error-boundary";
import { FormSheet } from "@/components/finance/forms/form-sheet";
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
import { Textarea } from "@/components/ui/textarea";
import { useAppMutation } from "@/lib/mutations";
import { createAccount } from "@/services/accounts.service";
import { useAuthStore } from "@/stores/auth.store";

type ManualAccountFormValues = {
  name: string;
  institutionName: string;
  institutionDomain: string;
  notes: string;
  type: "depository" | "loan" | "property" | "vehicle" | "other_asset" | "other_liability";
  currencyCode: string;
};

const ACCOUNT_TYPE_OPTIONS: Array<{
  value: ManualAccountFormValues["type"];
  label: string;
  classification: "asset" | "liability";
}> = [
  { value: "depository", label: "Depository", classification: "asset" },
  { value: "loan", label: "Loan", classification: "liability" },
  { value: "property", label: "Property", classification: "asset" },
  { value: "vehicle", label: "Vehicle", classification: "asset" },
  { value: "other_asset", label: "Other Asset", classification: "asset" },
  { value: "other_liability", label: "Other Liability", classification: "liability" },
];

export function ManualAccountSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const preferredCurrency = useAuthStore((state) => state.user?.preferences.currency ?? "BRL");
  const resetValues = React.useMemo<ManualAccountFormValues>(
    () => ({
      name: "",
      institutionName: "",
      institutionDomain: "",
      notes: "",
      type: "depository",
      currencyCode: preferredCurrency,
    }),
    [preferredCurrency],
  );
  const wasOpenRef = React.useRef(false);

  const form = useForm<ManualAccountFormValues>({
    defaultValues: resetValues,
  });

  React.useEffect(() => {
    if (open && !wasOpenRef.current) {
      form.reset(resetValues);
    }
    wasOpenRef.current = open;
  }, [form, open, resetValues]);

  const createMutation = useAppMutation({
    mutationFn: createAccount,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
      onOpenChange(false);
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const selectedType = ACCOUNT_TYPE_OPTIONS.find((option) => option.value === values.type);
    await createMutation.mutateAsync({
      name: values.name,
      institutionName: values.institutionName || undefined,
      institutionDomain: values.institutionDomain || undefined,
      notes: values.notes || undefined,
      type: values.type,
      classification: selectedType?.classification ?? "asset",
      currencyCode: values.currencyCode,
    });
  });

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Create account"
      description="Add a manual asset or liability account to the workspace."
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="manual-account-name">Account name</Label>
          <Input id="manual-account-name" placeholder="Primary depository" {...form.register("name", { required: true })} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={form.watch("type")}
              onValueChange={(value: ManualAccountFormValues["type"]) => form.setValue("type", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Currency</Label>
            <Select
              value={form.watch("currencyCode")}
              onValueChange={(value) => form.setValue("currencyCode", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BRL">Brazilian Real (BRL)</SelectItem>
                <SelectItem value="USD">US Dollar (USD)</SelectItem>
                <SelectItem value="EUR">Euro (EUR)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="manual-account-institution">Institution</Label>
            <Input id="manual-account-institution" placeholder="Nubank" {...form.register("institutionName")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manual-account-domain">Institution domain</Label>
            <Input id="manual-account-domain" placeholder="nubank.com.br" {...form.register("institutionDomain")} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="manual-account-notes">Notes</Label>
          <Textarea id="manual-account-notes" placeholder="Optional context" {...form.register("notes")} />
        </div>

        <FormErrorBoundary error={createMutation.error} />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create account"}
          </Button>
        </div>
      </form>
    </FormSheet>
  );
}
