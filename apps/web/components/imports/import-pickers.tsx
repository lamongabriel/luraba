"use client";

import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { MAX_PER_PAGE } from "@luraba/contracts";
import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { AccountDisplay, MerchantDisplay } from "@/components/display";
import { ComboboxControl } from "@/components/forms/form-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateMerchantMutation } from "@/mutations/merchants/use-merchant-mutations";
import { useAccountsQuery } from "@/queries/accounts/use-accounts-query";
import { useCreditCardsQuery } from "@/queries/credit-cards/use-credit-cards-query";
import { merchantQueryKeys, useMerchantsQuery } from "@/queries/merchants/use-merchants-query";

type PickerProps = {
  id: string;
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
};

/** Bank, cash and investment accounts (never credit cards). */
export function AccountPicker({ id, value, onChange, placeholder, disabled }: PickerProps) {
  const query = useAccountsQuery({ perPage: MAX_PER_PAGE });
  const accounts = (query.data?.data ?? []).filter((account) => account.type !== "credit_card");
  const byId = new Map(accounts.map((account) => [account.id, account]));
  return (
    <ComboboxControl
      id={id}
      value={value ?? ""}
      onChange={(next) => onChange(next || null)}
      options={accounts.map((account) => ({ value: account.id, label: account.name }))}
      placeholder={query.isPending ? "Loading accounts..." : (placeholder ?? "Choose an account")}
      searchPlaceholder="Search accounts..."
      emptyMessage="No accounts found."
      disabled={disabled || query.isPending}
      renderOption={(option) => {
        const account = byId.get(option.value);
        return account ? <AccountDisplay account={account} size="sm" /> : option.label;
      }}
      renderValue={(option) => {
        const account = option ? byId.get(option.value) : undefined;
        return account ? <AccountDisplay account={account} size="xs" /> : undefined;
      }}
    />
  );
}

export function CreditCardPicker({ id, value, onChange, placeholder, disabled }: PickerProps) {
  const query = useCreditCardsQuery({ perPage: MAX_PER_PAGE });
  const cards = query.data?.data ?? [];
  const byId = new Map(cards.map((card) => [card.id, card]));
  return (
    <ComboboxControl
      id={id}
      value={value ?? ""}
      onChange={(next) => onChange(next || null)}
      options={cards.map((card) => ({ value: card.id, label: card.name }))}
      placeholder={query.isPending ? "Loading cards..." : (placeholder ?? "Choose a credit card")}
      searchPlaceholder="Search cards..."
      emptyMessage="No credit cards found."
      disabled={disabled || query.isPending}
      renderOption={(option) => {
        const card = byId.get(option.value);
        return card ? <AccountDisplay account={card} size="sm" /> : option.label;
      }}
      renderValue={(option) => {
        const card = option ? byId.get(option.value) : undefined;
        return card ? <AccountDisplay account={card} size="xs" /> : undefined;
      }}
    />
  );
}

/** Merchant combobox with a "create it now" row, so a new bank name can get its merchant in place. */
export function MerchantPicker({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  suggestedName,
}: PickerProps & { suggestedName?: string }) {
  const queryClient = useQueryClient();
  const query = useMerchantsQuery({ perPage: MAX_PER_PAGE });
  const create = useCreateMerchantMutation({
    onSuccess: async (merchant) => {
      await queryClient.invalidateQueries({ queryKey: merchantQueryKeys.all });
      setCreating(false);
      onChange(merchant.id);
    },
  });
  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState(suggestedName ?? "");
  const merchants = query.data?.data ?? [];
  const byId = new Map(merchants.map((merchant) => [merchant.id, merchant]));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <div className="min-w-0 flex-1">
          <ComboboxControl
            id={id}
            value={value ?? ""}
            onChange={(next) => onChange(next || null)}
            options={merchants.map((merchant) => ({ value: merchant.id, label: merchant.name }))}
            placeholder={
              query.isPending ? "Loading merchants..." : (placeholder ?? "Choose a merchant")
            }
            searchPlaceholder="Search merchants..."
            emptyMessage="No merchants found."
            disabled={disabled || query.isPending}
            renderOption={(option) => {
              const merchant = byId.get(option.value);
              return merchant ? <MerchantDisplay merchant={merchant} size="sm" /> : option.label;
            }}
            renderValue={(option) => {
              const merchant = option ? byId.get(option.value) : undefined;
              return merchant ? <MerchantDisplay merchant={merchant} size="xs" /> : undefined;
            }}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Create a new merchant"
          disabled={disabled}
          onClick={() => {
            setName(suggestedName ?? "");
            setCreating((open) => !open);
          }}
        >
          <HugeiconsIcon icon={Add01Icon} />
        </Button>
      </div>
      {creating ? (
        <form
          className="flex items-center gap-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim()) create.mutate({ name: name.trim() });
          }}
        >
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Merchant name, e.g. Amazon"
            aria-label="New merchant name"
            autoFocus
          />
          <Button type="submit" size="default" disabled={!name.trim() || create.isPending}>
            Create
          </Button>
        </form>
      ) : null}
    </div>
  );
}
