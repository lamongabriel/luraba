"use client";

import type { InvestmentEvent } from "@luraba/contracts";
import { Controller } from "react-hook-form";

import { getInvestmentEventTypeLabel } from "@/components/display";
import { FormItem } from "@/components/forms/form-item";
import { AssetPicker } from "@/components/investments/asset-picker";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Typography } from "@/components/ui/typography";
import { useInvestmentAccountsQuery } from "@/queries/investments/use-investments-queries";
import type { EventFormValues } from "./event-form.schema";
import { EVENT_TYPE_GROUPS, fieldsFor } from "./event-form-config";
import { ExactDateField, ExactNumberField } from "./exact-fields";
import { useEventForm } from "./use-event-form";

/** Record or edit any ledger transaction: trades, income, fixed income, corporate actions, cash. */
export function EventForm({
  event,
  seed,
  onCancel,
  onSuccess,
}: {
  event?: InvestmentEvent;
  seed?: Partial<EventFormValues>;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const { form, onSubmit, isEdit, isPending, errorMessage } = useEventForm({
    event,
    seed,
    onSuccess,
  });
  const accounts = useInvestmentAccountsQuery();
  const type = form.watch("type");
  const fields = fieldsFor(type);
  const accountId = form.watch("accountId");
  const account = accounts.data?.find((item) => item.id === accountId);
  const decimals = 8;

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      <FormItem
        type="select"
        control={form.control}
        name="accountId"
        label="Account"
        placeholder="Choose an investment account"
        options={(accounts.data ?? []).map((item) => ({ value: item.id, label: item.name }))}
        disabled={isPending || isEdit}
      />

      <Controller
        name="type"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={Boolean(fieldState.error)}>
            <FieldLabel htmlFor="type">Type</FieldLabel>
            <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPE_GROUPS.map((group) => (
                  <SelectGroup key={group.label}>
                    <SelectLabel>{group.label}</SelectLabel>
                    {group.types.map((item) => (
                      <SelectItem key={item} value={item}>
                        {getInvestmentEventTypeLabel(item)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            {fields.hint ? <FieldDescription>{fields.hint}</FieldDescription> : null}
            {fieldState.error ? <FieldError errors={[fieldState.error]} /> : null}
          </Field>
        )}
      />

      {fields.asset ? (
        <Controller
          name="assetId"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={Boolean(fieldState.error)}>
              <FieldLabel htmlFor="assetId">Asset</FieldLabel>
              <AssetPicker
                id="assetId"
                value={field.value}
                onChange={field.onChange}
                disabled={isPending}
                ariaInvalid={Boolean(fieldState.error)}
              />
              {fieldState.error ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />
      ) : null}

      {fields.target ? (
        <Controller
          name="targetAssetId"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={Boolean(fieldState.error)}>
              <FieldLabel htmlFor="targetAssetId">Other asset</FieldLabel>
              <AssetPicker
                id="targetAssetId"
                value={field.value}
                onChange={field.onChange}
                disabled={isPending}
                ariaInvalid={Boolean(fieldState.error)}
              />
              {fieldState.error ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />
      ) : null}

      <ExactDateField control={form.control} name="tradeDate" label="Date" disabled={isPending} />

      {fields.quantity || fields.unitPrice ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.quantity ? (
            <ExactNumberField
              control={form.control}
              name="quantity"
              label="Quantity"
              decimals={decimals}
              disabled={isPending}
            />
          ) : null}
          {fields.unitPrice ? (
            <ExactNumberField
              control={form.control}
              name="unitPrice"
              label={`Unit price${account ? ` (${account.currencyCode})` : ""}`}
              decimals={decimals}
              disabled={isPending}
            />
          ) : null}
        </div>
      ) : null}

      {fields.gross ? (
        <ExactNumberField
          control={form.control}
          name="grossAmount"
          kind="money"
          label={fields.gross === "optional" ? "Total amount (optional)" : "Amount"}
          description={
            fields.gross === "optional" ? "Leave empty to use quantity × unit price." : undefined
          }
          disabled={isPending}
        />
      ) : null}

      {fields.ratio ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <ExactNumberField
            control={form.control}
            name="ratioFrom"
            label="Ratio: from"
            decimals={4}
            disabled={isPending}
          />
          <ExactNumberField
            control={form.control}
            name="ratioTo"
            label="Ratio: to"
            decimals={4}
            disabled={isPending}
          />
        </div>
      ) : null}

      {fields.exchangeRatio ? (
        <ExactNumberField
          control={form.control}
          name="exchangeRatio"
          label="Exchange ratio"
          description="New shares received for each share you hold."
          decimals={decimals}
          disabled={isPending}
        />
      ) : null}
      {fields.costRatio ? (
        <ExactNumberField
          control={form.control}
          name="costRatio"
          label="Share of cost moved (0 to 1)"
          decimals={4}
          disabled={isPending}
        />
      ) : null}

      {fields.fees || fields.taxes ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.fees ? (
            <ExactNumberField
              control={form.control}
              name="fees"
              kind="money"
              label="Fees"
              disabled={isPending}
            />
          ) : null}
          {fields.taxes ? (
            <ExactNumberField
              control={form.control}
              name="taxesWithheld"
              kind="money"
              label="Taxes withheld"
              disabled={isPending}
            />
          ) : null}
        </div>
      ) : null}

      <FormItem
        type="textarea"
        control={form.control}
        name="notes"
        label="Notes"
        placeholder="Optional"
        rows={2}
        disabled={isPending}
      />

      {errorMessage ? <Typography variant="small-destructive">{errorMessage}</Typography> : null}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isPending} loadingText="Saving...">
          {isEdit ? "Save changes" : "Record transaction"}
        </Button>
      </div>
    </form>
  );
}
