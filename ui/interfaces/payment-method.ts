export interface PaymentMethod {
  id: string
  code: string
  name: string
  scope: "system" | "household"
  currencyCode: string | null
  translationKey: string | null
  color: string | null
  icon: string | null
  createdAt: string
  updatedAt: string
}
