"use client";

import { FormItem } from "@/components/forms/form-item";

import type { CreateEditAccountSectionProps } from "./create-edit-account-section.types";

export function CryptoFormSection({ disabled, form }: CreateEditAccountSectionProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormItem
        control={form.control}
        name="network"
        label="Network"
        placeholder="Ethereum"
        disabled={disabled}
      />
      <FormItem
        control={form.control}
        name="walletAddress"
        label="Wallet address"
        placeholder="0x..."
        disabled={disabled}
      />
    </div>
  );
}
