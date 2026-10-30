"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { InvestmentAsset } from "@luraba/contracts";
import { todayISODate } from "@luraba/domain";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormErrorBoundary } from "@/components/forms/form-error-boundary";
import { FormSheet } from "@/components/forms/form-sheet";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { useSetManualPriceMutation } from "@/mutations/investments/use-investments-mutations";

import { ExactDateField, ExactNumberField } from "./exact-fields";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, "Choose a date."),
  price: z.string().regex(/^\d+(\.\d+)?$/u, "Enter a price."),
});
type Values = z.infer<typeof schema>;

function ManualPriceForm({
  asset,
  onCancel,
  onSuccess,
}: {
  asset: InvestmentAsset;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { date: todayISODate(), price: "" },
  });
  const mutation = useSetManualPriceMutation({
    successToast: { title: "Price saved" },
    onSuccess,
  });

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={form.handleSubmit((values) => {
        mutation.reset();
        mutation.mutate({ id: asset.id, body: values });
      })}
    >
      <ExactDateField
        control={form.control}
        name="date"
        label="Date"
        disabled={mutation.isPending}
      />
      <ExactNumberField
        control={form.control}
        name="price"
        label={`Price (${asset.currencyCode})`}
        decimals={8}
        disabled={mutation.isPending}
      />
      {mutation.errorMessage ? (
        <Typography variant="small-destructive">{mutation.errorMessage}</Typography>
      ) : null}
      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" isLoading={mutation.isPending} loadingText="Saving...">
          Save price
        </Button>
      </div>
    </form>
  );
}

/** For assets no provider prices (a private CDB, a custom holding): enter the price yourself. */
export function ManualPriceSheet({
  open,
  onOpenChange,
  asset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: InvestmentAsset;
}) {
  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Set a price for ${asset.symbol}`}
      description="A price you enter is used until a provider reports a newer one."
    >
      <FormErrorBoundary>
        <ManualPriceForm
          key={String(open)}
          asset={asset}
          onCancel={() => onOpenChange(false)}
          onSuccess={() => onOpenChange(false)}
        />
      </FormErrorBoundary>
    </FormSheet>
  );
}
