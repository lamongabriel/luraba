"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { FixedIncomeTermsInput, InvestmentAsset } from "@luraba/contracts";
import { ASSET_CLASSES } from "@luraba/contracts";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ASSET_CLASS_DISPLAY, CurrencySelect } from "@/components/display";
import { FormErrorBoundary } from "@/components/forms/form-error-boundary";
import { FormItem } from "@/components/forms/form-item";
import { FormSheet } from "@/components/forms/form-sheet";
import { percentToFraction } from "@/components/investments/format";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import {
  useCreateAssetMutation,
  useSetFixedIncomeTermsMutation,
  useUpdateAssetMutation,
} from "@/mutations/investments/use-investments-mutations";
import {
  type FixedIncomeFormValues,
  FixedIncomeTermsFields,
  fixedIncomeFormSchema,
  getFixedIncomeDefaults,
} from "./fixed-income-terms-fields";

export const isFixedIncomeClass = (assetClass: string) =>
  ASSET_CLASS_DISPLAY[assetClass as keyof typeof ASSET_CLASS_DISPLAY]?.group === "fixed_income";

const schema = z.object({
  symbol: z.string().trim().min(1, "Enter a symbol.").max(64),
  name: z.string().trim().min(1, "Enter a name.").max(255),
  assetClass: z.enum(ASSET_CLASSES),
  currencyCode: z.string().min(1, "Choose a currency."),
  exchange: z.string().trim().max(32),
  country: z.string().trim().max(2),
  sector: z.string().trim().max(128),
  industry: z.string().trim().max(128),
  terms: fixedIncomeFormSchema,
});
type Values = z.infer<typeof schema>;

export function toTermsBody(terms: FixedIncomeFormValues): FixedIncomeTermsInput {
  return {
    issuer: terms.issuer || null,
    issueDate: terms.issueDate || null,
    maturityDate: terms.maturityDate || null,
    principal: terms.principal || null,
    indexer: terms.indexer,
    rateForm: terms.rateForm,
    rate: percentToFraction(terms.ratePercent),
    liquidity: terms.liquidity || null,
    fgcCovered: terms.fgcCovered,
    dayCount: terms.dayCount,
    tesouroTitle: terms.tesouroTitle || null,
  };
}

function AssetForm({
  asset,
  onCancel,
  onSuccess,
}: {
  asset?: InvestmentAsset;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      symbol: asset?.symbol ?? "",
      name: asset?.name ?? "",
      assetClass: asset?.assetClass ?? "STOCK",
      currencyCode: asset?.currencyCode ?? "",
      exchange: asset?.exchange ?? "",
      country: asset?.country ?? "",
      sector: asset?.sector ?? "",
      industry: asset?.industry ?? "",
      terms: getFixedIncomeDefaults(asset?.fixedIncome),
    },
  });
  const assetClass = form.watch("assetClass");
  const fixedIncome = isFixedIncomeClass(assetClass);
  const rateForm = form.watch("terms.rateForm");

  const setTerms = useSetFixedIncomeTermsMutation({ onSuccess });
  const create = useCreateAssetMutation({
    successToast: { title: "Asset added" },
    onSuccess,
  });
  const update = useUpdateAssetMutation({
    successToast: { title: "Asset updated" },
    onSuccess: (_data, variables) => {
      if (fixedIncome && asset) {
        setTerms.mutate({ id: variables.id, body: toTermsBody(form.getValues("terms")) });
      } else {
        onSuccess();
      }
    },
  });
  const isPending = create.isPending || update.isPending || setTerms.isPending;
  const errorMessage = create.errorMessage || update.errorMessage || setTerms.errorMessage;

  const onSubmit = form.handleSubmit((values) => {
    const common = {
      name: values.name,
      sector: values.sector || null,
      industry: values.industry || null,
    };
    if (asset) {
      update.reset();
      update.mutate({ id: asset.id, body: common });
      return;
    }
    create.reset();
    create.mutate({
      ...common,
      symbol: values.symbol,
      assetClass: values.assetClass,
      currencyCode: values.currencyCode,
      exchange: values.exchange || null,
      country: values.country ? values.country.toUpperCase() : null,
      ...(fixedIncome ? { fixedIncome: toTermsBody(values.terms) } : {}),
    });
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      {!asset ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormItem
            control={form.control}
            name="symbol"
            label="Symbol"
            placeholder="AAPL"
            disabled={isPending}
          />
          <FormItem
            type="select"
            control={form.control}
            name="assetClass"
            label="Asset class"
            options={ASSET_CLASSES.map((value) => ({
              value,
              label: ASSET_CLASS_DISPLAY[value].label,
            }))}
            disabled={isPending}
          />
        </div>
      ) : null}
      <FormItem
        control={form.control}
        name="name"
        label="Name"
        placeholder="Apple Inc."
        disabled={isPending}
      />
      {!asset ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <CurrencySelect
            control={form.control}
            name="currencyCode"
            label="Currency"
            disabled={isPending}
          />
          <FormItem
            control={form.control}
            name="exchange"
            label="Exchange"
            placeholder="NASDAQ"
            disabled={isPending}
          />
          <FormItem
            control={form.control}
            name="country"
            label="Country"
            placeholder="US"
            disabled={isPending}
          />
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormItem
          control={form.control}
          name="sector"
          label="Sector"
          placeholder="Technology"
          disabled={isPending}
        />
        <FormItem
          control={form.control}
          name="industry"
          label="Industry"
          placeholder="Consumer electronics"
          disabled={isPending}
        />
      </div>
      {fixedIncome ? (
        <div className="space-y-3 rounded-xl border border-border/60 p-4">
          <Typography variant="small-strong">Fixed-income terms</Typography>
          <FixedIncomeTermsFields
            control={form.control}
            prefix="terms."
            rateForm={rateForm}
            disabled={isPending}
          />
        </div>
      ) : null}
      {errorMessage ? <Typography variant="small-destructive">{errorMessage}</Typography> : null}
      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isPending} loadingText="Saving...">
          {asset ? "Save changes" : "Add asset"}
        </Button>
      </div>
    </form>
  );
}

export function AssetSheet({
  open,
  onOpenChange,
  asset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset?: InvestmentAsset;
}) {
  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={asset ? "Edit asset" : "New asset"}
      description={
        asset
          ? "Update the details of this asset."
          : "Add something that is not at your market-data providers, like a private CDB."
      }
    >
      <FormErrorBoundary>
        <AssetForm
          key={asset?.id ?? "create"}
          asset={asset}
          onCancel={() => onOpenChange(false)}
          onSuccess={() => onOpenChange(false)}
        />
      </FormErrorBoundary>
    </FormSheet>
  );
}
