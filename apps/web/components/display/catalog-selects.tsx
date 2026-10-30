"use client";

import {
  type CatalogOption,
  DATE_FORMAT_CATALOG,
  DATE_FORMAT_OPTIONS,
  flagEmoji,
  LANGUAGE_CATALOG,
  LANGUAGE_OPTIONS,
  PREFERRED_PERIOD_OPTIONS,
  PREFERRED_THEME_OPTIONS,
} from "@luraba/contracts";
import type * as React from "react";
import type { FieldValues } from "react-hook-form";
import { ComboboxControl, type FormComboboxOption } from "@/components/forms/form-combobox";
import { useCurrencyCatalog } from "@/hooks/use-currency-catalog";
import { createTimezoneChoices } from "@/lib/timezones";
import { useLocationOptionsQuery } from "@/queries/reference-data/use-location-options-query";

import { CurrencyLabel } from "./currency-display";
import {
  type CatalogSelectControlProps,
  CatalogSelectField,
  type CatalogSelectFieldProps,
} from "./select-field";

/**
 * Searchable selects for every shared option set: currency, country, language, time zone, date
 * format, default period and theme. Each has two forms with the same look:
 * - `XSelect` for react-hook-form (label, description and error like `FormItem`);
 * - `XSelectControl` for plain state (`value` / `onChange`).
 * Options, labels and flags come from `@luraba/contracts` catalogs; never build these lists in a page.
 */

const Flag = ({ code }: { code: string | null | undefined }) => {
  const emoji = flagEmoji(code);
  return emoji ? (
    <span aria-hidden="true" className="shrink-0 text-base leading-none">
      {emoji}
    </span>
  ) : null;
};

function SimpleControl({
  options,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  renderOption,
  renderValue,
  ...props
}: CatalogSelectControlProps & {
  options: FormComboboxOption[];
  searchPlaceholder: string;
  emptyMessage: string;
  renderOption?: (option: FormComboboxOption, selected: boolean) => React.ReactNode;
  renderValue?: (option: FormComboboxOption | undefined) => React.ReactNode;
}) {
  return (
    <ComboboxControl
      {...props}
      options={options}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={emptyMessage}
      renderOption={renderOption}
      renderValue={renderValue}
    />
  );
}

/* ----------------------------- Currency ----------------------------- */

export function CurrencySelectControl({
  exclude,
  only,
  placeholder = "Select a currency",
  ...props
}: CatalogSelectControlProps & {
  /** Currency codes to hide (e.g. the currency being converted from). */
  exclude?: readonly string[];
  /** Restrict the choices to these codes. */
  only?: readonly string[];
}) {
  const { currencies, get, isPending } = useCurrencyCatalog();
  const options: FormComboboxOption[] = currencies
    .filter((c) => !exclude?.includes(c.code) && (!only || only.includes(c.code)))
    .map((c) => ({
      value: c.code,
      label: c.code,
      description: c.name,
      searchText: `${c.code} ${c.symbol} ${c.name}`,
    }));

  return (
    <SimpleControl
      {...props}
      disabled={props.disabled || isPending}
      options={options}
      placeholder={placeholder}
      searchPlaceholder="Search currencies..."
      emptyMessage="No currencies found."
      renderOption={(option) => <CurrencyLabel currency={get(option.value)} showName />}
      renderValue={(option) =>
        option || props.value ? <CurrencyLabel currency={get(props.value)} /> : undefined
      }
    />
  );
}

export function CurrencySelect<TFieldValues extends FieldValues>({
  placeholder,
  disabled,
  triggerClassName,
  exclude,
  only,
  ...field
}: CatalogSelectFieldProps<TFieldValues> & {
  exclude?: readonly string[];
  only?: readonly string[];
}) {
  return (
    <CatalogSelectField
      {...field}
      render={(control) => (
        <CurrencySelectControl
          {...control}
          placeholder={placeholder}
          disabled={disabled}
          triggerClassName={triggerClassName}
          exclude={exclude}
          only={only}
        />
      )}
    />
  );
}

/* ----------------------------- Country ----------------------------- */

export function CountrySelectControl({
  placeholder = "Select country",
  ...props
}: CatalogSelectControlProps) {
  const query = useLocationOptionsQuery();
  const countries = query.data?.countries ?? [];
  const byCode = new Map(countries.map((country) => [country.code, country]));
  const options: FormComboboxOption[] = countries.map((country) => ({
    value: country.code,
    label: country.name,
    description: country.code,
    searchText: `${country.code} ${country.name}`,
  }));

  return (
    <SimpleControl
      {...props}
      disabled={props.disabled || query.isPending || query.isError}
      options={options}
      placeholder={placeholder}
      searchPlaceholder="Search countries..."
      emptyMessage="No countries found."
      renderOption={(option) => (
        <>
          <Flag code={option.value} />
          <span className="min-w-0 truncate">{option.label}</span>
          <span className="ml-auto text-[0.65rem] text-muted-foreground">{option.value}</span>
        </>
      )}
      renderValue={(option) =>
        option ? (
          <span className="flex min-w-0 items-center gap-2">
            <Flag code={byCode.get(option.value)?.code ?? option.value} />
            <span className="truncate">{option.label}</span>
            <span className="shrink-0 text-[0.65rem] text-muted-foreground">{option.value}</span>
          </span>
        ) : undefined
      }
    />
  );
}

export function CountrySelect<TFieldValues extends FieldValues>({
  placeholder,
  disabled,
  triggerClassName,
  ...field
}: CatalogSelectFieldProps<TFieldValues>) {
  return (
    <CatalogSelectField
      {...field}
      render={(control) => (
        <CountrySelectControl
          {...control}
          placeholder={placeholder}
          disabled={disabled}
          triggerClassName={triggerClassName}
        />
      )}
    />
  );
}

/* ----------------------------- Time zone ----------------------------- */

export function TimeZoneSelectControl({
  placeholder = "Select time zone",
  ...props
}: CatalogSelectControlProps) {
  const query = useLocationOptionsQuery();
  const choices = createTimezoneChoices(query.data?.timezones ?? []);
  const offsets = new Map(choices.map((choice) => [choice.value, choice.offset]));

  return (
    <SimpleControl
      {...props}
      disabled={props.disabled || query.isPending || query.isError}
      options={choices}
      placeholder={placeholder}
      searchPlaceholder="Search time zones..."
      emptyMessage="No time zones found."
      renderOption={(option) => (
        <>
          <span className="min-w-0 flex-1">
            <span className="block truncate">{option.label}</span>
            <span className="block truncate text-[0.7rem] text-muted-foreground">
              {option.description}
            </span>
          </span>
          <span className="shrink-0 text-[0.65rem] text-muted-foreground">
            {offsets.get(option.value)}
          </span>
        </>
      )}
      renderValue={(option) =>
        option ? (
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate">{option.label}</span>
            <span className="shrink-0 text-[0.65rem] text-muted-foreground">
              {offsets.get(option.value)}
            </span>
          </span>
        ) : undefined
      }
    />
  );
}

export function TimeZoneSelect<TFieldValues extends FieldValues>({
  placeholder,
  disabled,
  triggerClassName,
  ...field
}: CatalogSelectFieldProps<TFieldValues>) {
  return (
    <CatalogSelectField
      {...field}
      render={(control) => (
        <TimeZoneSelectControl
          {...control}
          placeholder={placeholder}
          disabled={disabled}
          triggerClassName={triggerClassName}
        />
      )}
    />
  );
}

/* ----------------------------- Static catalogs ----------------------------- */

function toComboboxOptions(options: readonly CatalogOption[]): FormComboboxOption[] {
  return options.map((option) => ({
    value: option.value,
    label: option.label,
    description: option.description,
    searchText: `${option.value} ${option.label}`,
  }));
}

export function LanguageSelectControl({
  placeholder = "Select language",
  ...props
}: CatalogSelectControlProps) {
  return (
    <SimpleControl
      {...props}
      options={toComboboxOptions(LANGUAGE_OPTIONS)}
      placeholder={placeholder}
      searchPlaceholder="Search languages..."
      emptyMessage="No languages found."
      renderOption={(option) => <LanguageLabel code={option.value} />}
      renderValue={(option) => (option ? <LanguageLabel code={option.value} /> : undefined)}
    />
  );
}

function LanguageLabel({ code }: { code: string }) {
  const entry = (LANGUAGE_CATALOG as Record<string, (typeof LANGUAGE_CATALOG)["en"] | undefined>)[
    code
  ];
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Flag code={entry?.countryCode} />
      <span className="truncate">{entry?.label ?? code}</span>
      {entry && entry.nativeLabel !== entry.label ? (
        <span className="shrink-0 text-[0.65rem] text-muted-foreground">{entry.nativeLabel}</span>
      ) : null}
    </span>
  );
}

export function LanguageSelect<TFieldValues extends FieldValues>({
  placeholder,
  disabled,
  triggerClassName,
  ...field
}: CatalogSelectFieldProps<TFieldValues>) {
  return (
    <CatalogSelectField
      {...field}
      render={(control) => (
        <LanguageSelectControl
          {...control}
          placeholder={placeholder}
          disabled={disabled}
          triggerClassName={triggerClassName}
        />
      )}
    />
  );
}

export function DateFormatSelectControl({
  placeholder = "Select date format",
  ...props
}: CatalogSelectControlProps) {
  const options = DATE_FORMAT_OPTIONS.map((option) => ({
    value: option.value,
    label: option.value,
    description: option.label,
    searchText: `${option.value} ${option.label} ${option.example}`,
  }));
  const render = (option: FormComboboxOption | undefined) => {
    if (!option) return undefined;
    const entry = DATE_FORMAT_CATALOG[option.value as keyof typeof DATE_FORMAT_CATALOG];
    return (
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate">{option.label}</span>
        {entry ? (
          <span className="shrink-0 text-[0.65rem] text-muted-foreground">{entry.example}</span>
        ) : null}
      </span>
    );
  };

  return (
    <SimpleControl
      {...props}
      options={options}
      placeholder={placeholder}
      searchPlaceholder="Search date formats..."
      emptyMessage="No date formats found."
      renderOption={(option) => render(option)}
      renderValue={render}
    />
  );
}

export function DateFormatSelect<TFieldValues extends FieldValues>({
  placeholder,
  disabled,
  triggerClassName,
  ...field
}: CatalogSelectFieldProps<TFieldValues>) {
  return (
    <CatalogSelectField
      {...field}
      render={(control) => (
        <DateFormatSelectControl
          {...control}
          placeholder={placeholder}
          disabled={disabled}
          triggerClassName={triggerClassName}
        />
      )}
    />
  );
}

export function PreferredPeriodSelectControl({
  placeholder = "Select a period",
  ...props
}: CatalogSelectControlProps) {
  return (
    <SimpleControl
      {...props}
      options={toComboboxOptions(PREFERRED_PERIOD_OPTIONS)}
      placeholder={placeholder}
      searchPlaceholder="Search periods..."
      emptyMessage="No periods found."
    />
  );
}

export function PreferredThemeSelectControl({
  placeholder = "Select a theme",
  ...props
}: CatalogSelectControlProps) {
  return (
    <SimpleControl
      {...props}
      options={toComboboxOptions(PREFERRED_THEME_OPTIONS)}
      placeholder={placeholder}
      searchPlaceholder="Search themes..."
      emptyMessage="No themes found."
    />
  );
}
