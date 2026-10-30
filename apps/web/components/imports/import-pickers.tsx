"use client";

import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { MAX_PER_PAGE } from "@luraba/contracts";
import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { AccountDisplay, MerchantDisplay } from "@/components/display";
import { CategorySelectControl } from "@/components/forms/form-category-select";
import { ComboboxControl } from "@/components/forms/form-combobox";
import { TagSelectControl } from "@/components/forms/form-tag-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateCategoryMutation } from "@/mutations/categories/use-category-mutations";
import { useCreateMerchantMutation } from "@/mutations/merchants/use-merchant-mutations";
import { useCreateTagMutation } from "@/mutations/tags/use-tag-mutations";
import { useAccountsQuery } from "@/queries/accounts/use-accounts-query";
import { categoryQueryKeys } from "@/queries/categories/use-categories-query";
import { useCreditCardsQuery } from "@/queries/credit-cards/use-credit-cards-query";
import { merchantQueryKeys, useMerchantsQuery } from "@/queries/merchants/use-merchants-query";
import { tagQueryKeys } from "@/queries/tags/use-tags-query";

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

/** The "+" button and name field that create a record without leaving the step. */
function InlineCreate({
  open,
  onToggle,
  onCreate,
  pending,
  initialName,
  placeholder,
  label,
  disabled,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  onCreate: (name: string) => void;
  pending: boolean;
  initialName: string;
  placeholder: string;
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const [name, setName] = React.useState(initialName);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <div className="min-w-0 flex-1">{children}</div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={label}
          disabled={disabled}
          onClick={() => {
            setName(initialName);
            onToggle();
          }}
        >
          <HugeiconsIcon icon={Add01Icon} />
        </Button>
      </div>
      {open ? (
        <form
          className="flex items-center gap-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim()) onCreate(name.trim());
          }}
        >
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={placeholder}
            aria-label={label}
            autoFocus
          />
          <Button type="submit" disabled={!name.trim() || pending}>
            Create
          </Button>
        </form>
      ) : null}
    </div>
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
  const [creating, setCreating] = React.useState(false);
  const create = useCreateMerchantMutation({
    onSuccess: async (merchant) => {
      await queryClient.invalidateQueries({ queryKey: merchantQueryKeys.all });
      setCreating(false);
      onChange(merchant.id);
    },
  });
  const merchants = query.data?.data ?? [];
  const byId = new Map(merchants.map((merchant) => [merchant.id, merchant]));

  return (
    <InlineCreate
      open={creating}
      onToggle={() => setCreating((open) => !open)}
      onCreate={(name) => create.mutate({ name })}
      pending={create.isPending}
      initialName={suggestedName ?? ""}
      placeholder="Merchant name, e.g. Starbucks"
      label="Create a new merchant"
      disabled={disabled}
    >
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
    </InlineCreate>
  );
}

/** Category select with a "create it now" row. `type` is used for the new category. */
export function CategoryPicker({
  id,
  value,
  onChange,
  type,
  suggestedName,
  placeholder,
  disabled,
}: {
  id: string;
  value: string | null;
  onChange: (value: string | null) => void;
  type: "expense" | "income";
  suggestedName?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = React.useState(false);
  const create = useCreateCategoryMutation({
    onSuccess: async (category) => {
      await queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all });
      setCreating(false);
      onChange(category.id);
    },
  });
  return (
    <InlineCreate
      open={creating}
      onToggle={() => setCreating((open) => !open)}
      onCreate={(name) => create.mutate({ name, type })}
      pending={create.isPending}
      initialName={suggestedName ?? ""}
      placeholder="Category name, e.g. Groceries"
      label="Create a new category"
      disabled={disabled}
    >
      <CategorySelectControl
        id={id}
        value={value ?? ""}
        onChange={(next) => onChange(next || null)}
        allowClear
        clearLabel="No category"
        placeholder={placeholder ?? "Choose a category"}
        disabled={disabled}
      />
    </InlineCreate>
  );
}

/** Tag multi-select with a "create it now" row; a new tag is added to the selection. */
export function TagPicker({
  id,
  value,
  onChange,
  suggestedName,
  placeholder,
  disabled,
}: {
  id: string;
  value: string[];
  onChange: (value: string[]) => void;
  suggestedName?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = React.useState(false);
  const create = useCreateTagMutation({
    onSuccess: async (tag) => {
      await queryClient.invalidateQueries({ queryKey: tagQueryKeys.all });
      setCreating(false);
      onChange([...value, tag.id]);
    },
  });
  return (
    <InlineCreate
      open={creating}
      onToggle={() => setCreating((open) => !open)}
      onCreate={(name) => create.mutate({ name })}
      pending={create.isPending}
      initialName={suggestedName ?? ""}
      placeholder="Tag name, e.g. Work"
      label="Create a new tag"
      disabled={disabled}
    >
      <TagSelectControl
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder ?? "Choose tags"}
        maxVisibleTags={3}
        disabled={disabled}
      />
    </InlineCreate>
  );
}
