"use client"

import { PaymentIcon } from "react-svg-credit-card-payment-icons"

import type { FormComboboxOption } from "@/components/forms/form-combobox"
import { getCreditCardBrand } from "@/lib/credit-cards"
import { cn } from "@/lib/utils"

export function CreditCardBrand({
  brand,
  label,
  className,
}: {
  brand: string
  label?: string
  className?: string
}) {
  const option = getCreditCardBrand(brand)

  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <span className="flex h-7 w-10 shrink-0 items-center justify-center">
        <PaymentIcon type={option.paymentType} format="logo" />
      </span>
      {label === undefined ? null : <span className="truncate">{label}</span>}
    </span>
  )
}

export function CreditCardBrandMark({
  brand,
  className,
}: {
  brand: string
  className?: string
}) {
  const option = getCreditCardBrand(brand)

  return (
    <PaymentIcon
      type={option.paymentType}
      format="logo"
      aria-hidden="true"
      className={cn("size-4 shrink-0", className)}
    />
  )
}

export function renderCreditCardBrandOption(option: FormComboboxOption) {
  return <CreditCardBrand brand={option.value} label={option.label} />
}

export function renderCreditCardBrandValue(
  option: FormComboboxOption | undefined,
) {
  return option ? (
    <CreditCardBrand brand={option.value} label={option.label} />
  ) : null
}
