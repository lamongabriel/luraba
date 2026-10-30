"use client";

import type { FixedIncomeTerms } from "@luraba/contracts";
import { DAY_COUNTS, INDEXERS, RATE_FORMS } from "@luraba/contracts";
import type { Control, FieldValues, Path } from "react-hook-form";
import { Controller } from "react-hook-form";
import { z } from "zod";

import { FormItem } from "@/components/forms/form-item";
import { INDEXER_LABELS, RATE_FORM_LABELS } from "@/components/investments/constants";
import { fractionToPercentText } from "@/components/investments/format";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";

import { ExactDateField, ExactNumberField } from "./exact-fields";

const DAY_COUNT_LABELS = {
  BUS_252: "Business days (252)",
  ACT_360: "Actual / 360",
  ACT_365: "Actual / 365",
} as const;

export const fixedIncomeFormSchema = z.object({
  issuer: z.string().trim().max(255),
  issueDate: z.string(),
  maturityDate: z.string(),
  principal: z.string(),
  indexer: z.enum(INDEXERS),
  rateForm: z.enum(RATE_FORMS),
  /** What the person types, in percent: 110 for 110% of CDI, 6 for IPCA + 6%. */
  ratePercent: z.string().regex(/^\d+(\.\d+)?$/u, "Enter the rate."),
  liquidity: z.string().trim().max(32),
  fgcCovered: z.boolean(),
  dayCount: z.enum(DAY_COUNTS),
  tesouroTitle: z.string().trim().max(128),
});
export type FixedIncomeFormValues = z.infer<typeof fixedIncomeFormSchema>;

export function getFixedIncomeDefaults(terms?: FixedIncomeTerms | null): FixedIncomeFormValues {
  return {
    issuer: terms?.issuer ?? "",
    issueDate: terms?.issueDate ?? "",
    maturityDate: terms?.maturityDate ?? "",
    principal: terms?.principal ?? "",
    indexer: terms?.indexer ?? "CDI",
    rateForm: terms?.rateForm ?? "PCT_OF_INDEXER",
    ratePercent: terms ? fractionToPercentText(terms.rate) : "",
    liquidity: terms?.liquidity ?? "",
    fgcCovered: terms?.fgcCovered ?? false,
    dayCount: terms?.dayCount ?? "BUS_252",
    tesouroTitle: terms?.tesouroTitle ?? "",
  };
}

/** The shared set of inputs for a fixed-income asset's terms; embed in any form that has these values. */
export function FixedIncomeTermsFields<T extends FieldValues>({
  control,
  disabled,
  prefix = "",
  rateForm,
}: {
  control: Control<T>;
  disabled?: boolean;
  /** Path prefix when nested (e.g. `terms.`). */
  prefix?: string;
  rateForm: (typeof RATE_FORMS)[number];
}) {
  const name = (key: keyof FixedIncomeFormValues) => `${prefix}${key}` as Path<T>;
  const rateLabel =
    rateForm === "PCT_OF_INDEXER"
      ? "Rate (% of the index)"
      : rateForm === "INDEXER_PLUS_SPREAD"
        ? "Spread (% per year)"
        : "Rate (% per year)";

  return (
    <div className="space-y-4">
      <FormItem
        control={control}
        name={name("issuer")}
        label="Issuer"
        placeholder="Banco Example"
        disabled={disabled}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormItem
          type="select"
          control={control}
          name={name("indexer")}
          label="Index"
          options={INDEXERS.map((value) => ({ value, label: INDEXER_LABELS[value] }))}
          disabled={disabled}
        />
        <FormItem
          type="select"
          control={control}
          name={name("rateForm")}
          label="Rate type"
          options={RATE_FORMS.map((value) => ({ value, label: RATE_FORM_LABELS[value] }))}
          disabled={disabled}
        />
      </div>
      <ExactNumberField
        control={control}
        name={name("ratePercent")}
        label={rateLabel}
        description="Type 110 for 110% of CDI, 6 for IPCA + 6%, or 12 for 12% a year."
        decimals={4}
        disabled={disabled}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <ExactDateField
          control={control}
          name={name("issueDate")}
          label="Issue date"
          disabled={disabled}
        />
        <ExactDateField
          control={control}
          name={name("maturityDate")}
          label="Maturity date"
          disabled={disabled}
        />
      </div>
      <ExactNumberField
        control={control}
        name={name("principal")}
        kind="money"
        label="Principal (optional)"
        disabled={disabled}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormItem
          type="select"
          control={control}
          name={name("dayCount")}
          label="Day count"
          options={DAY_COUNTS.map((value) => ({ value, label: DAY_COUNT_LABELS[value] }))}
          disabled={disabled}
        />
        <FormItem
          control={control}
          name={name("liquidity")}
          label="Liquidity"
          placeholder="D+0, at maturity..."
          disabled={disabled}
        />
      </div>
      <FormItem
        control={control}
        name={name("tesouroTitle")}
        label="Treasury title (optional)"
        placeholder="Tesouro IPCA+ 2035"
        description="Used to fetch the official buyback price."
        disabled={disabled}
      />
      <Controller
        name={name("fgcCovered")}
        control={control}
        render={({ field }) => (
          <Field orientation="horizontal">
            <Switch
              id={name("fgcCovered")}
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
              disabled={disabled}
            />
            <div className="space-y-0.5">
              <FieldLabel htmlFor={name("fgcCovered")}>Covered by the FGC guarantee</FieldLabel>
              <FieldDescription>Shown as a reminder next to the holding.</FieldDescription>
            </div>
          </Field>
        )}
      />
    </div>
  );
}
