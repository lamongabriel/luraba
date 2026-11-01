"use client";

import type { FieldValues } from "react-hook-form";
import { ComboboxControl, type FormComboboxOption } from "@/components/forms/form-combobox";

import { AccountDisplay, type AccountDisplayInput } from "./account-display";
import {
  type CatalogSelectControlProps,
  CatalogSelectField,
  type CatalogSelectFieldProps,
} from "./select-field";

/**
 * Searchable account picker. Options show the picture or type icon, the name and a second line with
 * institution, account type and currency (`Chase · Checking · USD`); credit cards show
 * `Visa •••• 1234`. Pass any list of accounts or cards. `XSelect` is the react-hook-form form,
 * `XSelectControl` the plain `value` / `onChange` one.
 */
export function AccountSelectControl({
  accounts,
  placeholder = "Choose an account",
  ...props
}: CatalogSelectControlProps & { accounts: readonly AccountDisplayInput[] }) {
  const byId = new Map(accounts.map((account) => [account.id, account]));
  const options: FormComboboxOption[] = accounts.map((account) => {
    const institution = "institutionName" in account ? (account.institutionName ?? "") : "";
    const currency = "currencyCode" in account ? account.currencyCode : "";
    return {
      value: account.id,
      label: account.name,
      searchText: `${institution} ${currency}`,
    };
  });

  return (
    <ComboboxControl
      {...props}
      options={options}
      placeholder={placeholder}
      searchPlaceholder="Search accounts..."
      emptyMessage="No accounts found."
      contentWidth="max-content"
      renderOption={(option) => (
        <AccountDisplay account={byId.get(option.value)} size="md" detail="full" />
      )}
      renderValue={(option) =>
        option ? <AccountDisplay account={byId.get(option.value)} size="sm" /> : undefined
      }
    />
  );
}

export function AccountSelect<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  labelAdornment,
  accounts,
  ...rest
}: CatalogSelectFieldProps<TFieldValues> & { accounts: readonly AccountDisplayInput[] }) {
  return (
    <CatalogSelectField
      control={control}
      name={name}
      label={label}
      description={description}
      className={className}
      labelAdornment={labelAdornment}
      render={(field) => (
        <AccountSelectControl
          {...field}
          accounts={accounts}
          placeholder={rest.placeholder}
          disabled={rest.disabled}
          triggerClassName={rest.triggerClassName}
        />
      )}
    />
  );
}
