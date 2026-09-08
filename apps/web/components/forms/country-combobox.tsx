"use client";

import type { LocationCountryOption } from "@luraba/contracts";
import type * as React from "react";
import type { Control, FieldValues, Path } from "react-hook-form";
import { FormCombobox, type FormComboboxOption } from "@/components/forms/form-combobox";

export function CountryCombobox<TFieldValues extends FieldValues>({
  control,
  countries,
  name,
  label,
  disabled,
  className,
  labelAdornment,
}: {
  control: Control<TFieldValues>;
  countries: readonly LocationCountryOption[];
  name: Path<TFieldValues>;
  label: React.ReactNode;
  disabled?: boolean;
  className?: string;
  labelAdornment?: React.ReactNode;
}) {
  const countryOptions = countries.map((country) => ({
    value: country.code,
    label: country.name,
    description: country.code,
    searchText: `${country.code} ${country.name}`,
  }));
  const countriesByCode = new Map(countries.map((country) => [country.code, country]));

  return (
    <FormCombobox
      control={control}
      name={name}
      label={label}
      labelAdornment={labelAdornment}
      options={countryOptions}
      placeholder="Select country"
      searchPlaceholder="Search countries..."
      emptyMessage="No countries found."
      disabled={disabled}
      className={className}
      renderOption={(option: FormComboboxOption) => {
        const country = countriesByCode.get(option.value);

        return (
          <>
            <span aria-hidden="true" className="text-base leading-none">
              {country?.emoji}
            </span>
            <span className="min-w-0 truncate">{option.label}</span>
            <span className="ml-auto text-[0.65rem] text-muted-foreground">{option.value}</span>
          </>
        );
      }}
      renderValue={(option) => {
        if (!option) return undefined;
        const country = countriesByCode.get(option.value);

        return (
          <span className="flex min-w-0 items-center gap-2">
            <span aria-hidden="true" className="text-base leading-none">
              {country?.emoji}
            </span>
            <span className="truncate">{option.label}</span>
            <span className="shrink-0 text-[0.65rem] text-muted-foreground">{option.value}</span>
          </span>
        );
      }}
    />
  );
}
