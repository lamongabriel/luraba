"use client";

import { CardBrandMark } from "@/components/display/card-brand";
import type { FormComboboxOption } from "@/components/forms/form-combobox";
import { cn } from "@/lib/utils";

/** A brand mark with an optional label (selects, forms). The mark is the shared transparent `CardBrandMark`. */
export function CreditCardBrand({
  brand,
  label,
  className,
}: {
  brand: string;
  label?: string;
  className?: string;
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <CardBrandMark brand={brand} />
      {label === undefined ? null : <span className="truncate">{label}</span>}
    </span>
  );
}

export function CreditCardBrandMark({ brand, className }: { brand: string; className?: string }) {
  return <CardBrandMark brand={brand} className={cn("h-4 w-6 text-[0.5rem]", className)} />;
}

export function renderCreditCardBrandOption(option: FormComboboxOption) {
  return <CreditCardBrand brand={option.value} label={option.label} />;
}

export function renderCreditCardBrandValue(option: FormComboboxOption | undefined) {
  return option ? <CreditCardBrand brand={option.value} label={option.label} /> : null;
}
