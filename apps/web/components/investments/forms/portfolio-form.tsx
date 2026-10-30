"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Portfolio } from "@luraba/contracts";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormErrorBoundary } from "@/components/forms/form-error-boundary";
import { FormItem } from "@/components/forms/form-item";
import { FormSheet } from "@/components/forms/form-sheet";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import {
  useCreatePortfolioMutation,
  useUpdatePortfolioMutation,
} from "@/mutations/investments/use-investments-mutations";
import { useInvestmentSettingsQuery } from "@/queries/investments/use-investments-queries";

import { useCurrencyOptions } from "./use-currency-options";

const schema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(255),
  reportingCurrencyCode: z.string().min(1, "Choose a currency."),
});
type Values = z.infer<typeof schema>;

function PortfolioForm({
  portfolio,
  onCancel,
  onSuccess,
}: {
  portfolio?: Portfolio;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const settings = useInvestmentSettingsQuery();
  const currencies = useCurrencyOptions();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: portfolio?.name ?? "",
      reportingCurrencyCode:
        portfolio?.reportingCurrencyCode ?? settings.data?.reportingCurrencyCode ?? "",
    },
  });
  const create = useCreatePortfolioMutation({
    successToast: { title: "Portfolio created" },
    onSuccess,
  });
  const update = useUpdatePortfolioMutation({
    successToast: { title: "Portfolio updated" },
    onSuccess,
  });
  const isPending = create.isPending || update.isPending;
  const errorMessage = create.errorMessage || update.errorMessage;

  const onSubmit = form.handleSubmit((values) => {
    if (portfolio) {
      update.reset();
      update.mutate({ id: portfolio.id, body: values });
    } else {
      create.reset();
      create.mutate(values);
    }
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      <FormItem
        control={form.control}
        name="name"
        label="Name"
        placeholder="Retirement"
        disabled={isPending}
      />
      <FormItem
        type="select"
        control={form.control}
        name="reportingCurrencyCode"
        label="Reporting currency"
        description="Totals for this portfolio are shown in this currency."
        options={currencies}
        disabled={isPending}
      />
      {errorMessage ? <Typography variant="small-destructive">{errorMessage}</Typography> : null}
      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isPending} loadingText="Saving...">
          {portfolio ? "Save changes" : "Create portfolio"}
        </Button>
      </div>
    </form>
  );
}

export function PortfolioSheet({
  open,
  onOpenChange,
  portfolio,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolio?: Portfolio;
}) {
  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={portfolio ? "Edit portfolio" : "New portfolio"}
      description="Group investment accounts to see them as one, with their own targets."
    >
      <FormErrorBoundary>
        <PortfolioForm
          key={portfolio?.id ?? "create"}
          portfolio={portfolio}
          onCancel={() => onOpenChange(false)}
          onSuccess={() => onOpenChange(false)}
        />
      </FormErrorBoundary>
    </FormSheet>
  );
}
