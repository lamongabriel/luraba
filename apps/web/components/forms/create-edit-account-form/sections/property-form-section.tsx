"use client";

import { CountryCombobox } from "@/components/forms/country-combobox";
import { FormItem } from "@/components/forms/form-item";
import { Typography } from "@/components/ui/typography";
import { AREA_UNIT_OPTIONS } from "@/lib/accounts";
import { useLocationOptionsQuery } from "@/queries/reference-data/use-location-options-query";

import type { CreateEditAccountSectionProps } from "./create-edit-account-section.types";

export function PropertyFormSection({ disabled, form }: CreateEditAccountSectionProps) {
  const locationOptionsQuery = useLocationOptionsQuery();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormItem control={form.control} name="addressLine1" label="Address" disabled={disabled} />
      <FormItem
        control={form.control}
        name="addressLine2"
        label="Address line 2"
        disabled={disabled}
      />
      <FormItem control={form.control} name="city" label="City" disabled={disabled} />
      <FormItem control={form.control} name="region" label="State / region" disabled={disabled} />
      <FormItem control={form.control} name="postalCode" label="Postal code" disabled={disabled} />
      <CountryCombobox
        control={form.control}
        countries={locationOptionsQuery.data?.countries ?? []}
        name="countryCode"
        label="Country"
        disabled={disabled || locationOptionsQuery.isPending || locationOptionsQuery.isError}
      />
      <FormItem
        control={form.control}
        name="area"
        label="Area"
        inputType="number"
        step="0.01"
        disabled={disabled}
      />
      <FormItem
        type="select"
        control={form.control}
        name="areaUnit"
        label="Area unit"
        placeholder="Select unit"
        disabled={disabled}
        options={AREA_UNIT_OPTIONS}
      />
      <FormItem
        type="int"
        control={form.control}
        name="yearBuilt"
        label="Year built"
        disabled={disabled}
      />
      {locationOptionsQuery.isError ? (
        <Typography variant="small-destructive" className="sm:col-span-2">
          Couldn&apos;t load countries. Try again before saving this property.
        </Typography>
      ) : null}
    </div>
  );
}
