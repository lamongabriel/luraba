import type { PaymentType } from "react-svg-credit-card-payment-icons"

export const CREDIT_CARD_BRAND_OPTIONS = [
  { label: "Visa", value: "Visa", paymentType: "Visa" },
  { label: "Mastercard", value: "Mastercard", paymentType: "Mastercard" },
  {
    label: "American Express",
    value: "American Express",
    paymentType: "AmericanExpress",
  },
  { label: "Discover", value: "Discover", paymentType: "Discover" },
  { label: "Elo", value: "Elo", paymentType: "Elo" },
  { label: "Hipercard", value: "Hipercard", paymentType: "Hipercard" },
  { label: "JCB", value: "JCB", paymentType: "JCB" },
  { label: "Maestro", value: "Maestro", paymentType: "Maestro" },
  { label: "UnionPay", value: "UnionPay", paymentType: "UnionPay" },
  { label: "Other", value: "Other", paymentType: "Generic" },
] as const satisfies ReadonlyArray<{
  label: string
  value: string
  paymentType: PaymentType
}>

export const CREDIT_CARD_BRAND_VALUES = CREDIT_CARD_BRAND_OPTIONS.map(
  (brand) => brand.value,
) as [
  (typeof CREDIT_CARD_BRAND_OPTIONS)[number]["value"],
  ...(typeof CREDIT_CARD_BRAND_OPTIONS)[number]["value"][],
]

export type CreditCardBrand =
  (typeof CREDIT_CARD_BRAND_OPTIONS)[number]["value"]

export const CREDIT_CARD_COLOR_PRESETS = [
  { label: "Silver", value: "#d4d4d8" },
  { label: "Midnight", value: "#18181b" },
  { label: "Ocean", value: "#164e63" },
  { label: "Forest", value: "#25543d" },
  { label: "Clay", value: "#8c3f2e" },
  { label: "Slate", value: "#475569" },
] as const

export function getCreditCardBrand(brand: string | undefined) {
  return (
    CREDIT_CARD_BRAND_OPTIONS.find(
      (option) => option.value.toLowerCase() === brand?.toLowerCase(),
    ) ?? CREDIT_CARD_BRAND_OPTIONS[9]
  )
}
