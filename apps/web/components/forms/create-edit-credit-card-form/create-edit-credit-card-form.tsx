"use client";

import type { CreditCard } from "@luraba/contracts";
import type * as React from "react";
import {
  renderCreditCardBrandOption,
  renderCreditCardBrandValue,
} from "@/components/credit-cards/credit-card-brand";
import { CreditCardPreview } from "@/components/credit-cards/credit-card-preview";
import { CurrencySelect } from "@/components/display";
import { FormActions } from "@/components/forms/form-actions";
import { FormItem } from "@/components/forms/form-item";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Typography } from "@/components/ui/typography";
import { CREDIT_CARD_BRAND_OPTIONS } from "@/lib/credit-cards";
import { creditCardColorPresets } from "./create-edit-credit-card-form.schema";
import { useCreateEditCreditCardForm } from "./use-create-edit-credit-card-form";

export function CreateEditCreditCardForm({
  card,
  defaultCurrencyCode,
  onCancel,
  onSuccess,
  editExtras,
}: {
  card?: CreditCard;
  defaultCurrencyCode: string;
  onCancel: () => void;
  onSuccess: () => void;
  /** Rendered above the actions when editing (the delete section). */
  editExtras?: React.ReactNode;
}) {
  const {
    accountsQuery,
    currenciesQuery,
    errorMessage,
    form,
    isEdit,
    isPending,
    onSubmit,
    selectedOwner,
  } = useCreateEditCreditCardForm({ card, defaultCurrencyCode, onSuccess });

  const values = form.watch();
  const ownerOptions =
    accountsQuery.data?.data.map((account) => ({
      value: account.id,
      label: account.name,
      description: `${account.institutionName ? `${account.institutionName} · ` : ""}${account.currencyCode}`,
    })) ?? [];

  return (
    <form className="space-y-6" onSubmit={onSubmit} noValidate>
      <div className="-mx-1 rounded-xl border border-border/70 bg-muted/10 p-3">
        <CreditCardPreview
          brand={values.brand}
          color={values.color}
          institutionName={values.institutionName}
          last4={values.last4}
          name={values.name}
          className="mx-auto max-w-sm"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormItem
          control={form.control}
          name="name"
          label="Card name"
          placeholder="Travel Rewards"
          disabled={isPending}
        />
        <FormItem
          type="combobox"
          control={form.control}
          name="brand"
          label="Brand"
          placeholder="Select a brand"
          searchPlaceholder="Search brands..."
          options={CREDIT_CARD_BRAND_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          renderOption={renderCreditCardBrandOption}
          renderValue={renderCreditCardBrandValue}
          disabled={isPending}
        />
      </div>

      <FormItem
        type="combobox"
        control={form.control}
        name="ownerAccountId"
        label="Owner account"
        placeholder="Select a cash account"
        searchPlaceholder="Search cash accounts..."
        emptyMessage="No cash accounts found. Create one before adding a card."
        options={ownerOptions}
        disabled={isPending || isEdit}
        description={
          isEdit
            ? "The owner account cannot change after the card is created."
            : "Cards inherit their currency from this cash account."
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <CurrencySelect
          control={form.control}
          name="currencyCode"
          label="Currency"
          disabled
          description="Derived from the owner account."
        />
        <FormItem
          control={form.control}
          name="last4"
          label="Last four digits"
          placeholder="4242"
          inputType="text"
          disabled={isPending}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormItem
          control={form.control}
          name="institutionName"
          label="Institution"
          placeholder="Northstar Bank"
          disabled={isPending}
        />
        <FormItem
          control={form.control}
          name="institutionDomain"
          label="Institution domain"
          placeholder="northstar.example"
          disabled={isPending}
        />
      </div>

      <FormItem
        type="color"
        control={form.control}
        name="color"
        label="Card color"
        presets={creditCardColorPresets}
        disabled={isPending}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <FormItem
          type="int"
          control={form.control}
          name="closingDay"
          label="Closing day"
          placeholder="1"
          disabled={isPending}
        />
        <FormItem
          type="int"
          control={form.control}
          name="dueDay"
          label="Due day"
          placeholder="15"
          disabled={isPending}
        />
        <FormItem
          type="input"
          inputType="money"
          control={form.control}
          name="creditLimitAmount"
          label="Credit limit"
          placeholder="0.00"
          disabled={isPending}
        />
      </div>

      <FormItem
        type="textarea"
        control={form.control}
        name="notes"
        label="Notes"
        placeholder="What is this card for?"
        disabled={isPending}
      />

      {accountsQuery.isError || currenciesQuery.isError ? (
        <FieldError>Couldn&apos;t load card options right now.</FieldError>
      ) : null}
      {selectedOwner && selectedOwner.currencyCode !== values.currencyCode ? (
        <FieldError>The selected account currency changed. Please review this form.</FieldError>
      ) : null}
      {errorMessage ? <Typography variant="small-destructive">{errorMessage}</Typography> : null}

      {isEdit ? editExtras : null}

      <FormActions>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isPending}
          loadingText={isEdit ? "Saving..." : "Creating card..."}
        >
          {isEdit ? "Save changes" : "Create credit card"}
        </Button>
      </FormActions>
    </form>
  );
}
