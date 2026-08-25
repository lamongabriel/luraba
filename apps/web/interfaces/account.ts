export const ACCOUNT_CLASSIFICATIONS = ["asset", "liability"] as const
export type AccountClassification = (typeof ACCOUNT_CLASSIFICATIONS)[number]

export const ACCOUNT_TYPES = [
  "cash",
  "investment",
  "crypto",
  "property",
  "vehicle",
  "loan",
  "credit_card",
  "other_asset",
  "other_liability",
] as const
export type AccountType = (typeof ACCOUNT_TYPES)[number]
export type CreatableNonCardAccountType = Exclude<AccountType, "credit_card">

export type CashAccountSubtype =
  | "checking"
  | "savings"
  | "cash"
  | "money_market"
  | "certificate_of_deposit"
  | "prepaid"
  | "other"
export type InvestmentAccountSubtype =
  | "brokerage"
  | "retirement"
  | "pension"
  | "education"
  | "employee_stock"
  | "other"
export type CryptoAccountSubtype =
  | "exchange"
  | "wallet"
  | "custody"
  | "staking"
  | "other"
export type PropertyAccountSubtype =
  | "house"
  | "apartment"
  | "condominium"
  | "land"
  | "commercial"
  | "storage"
  | "parking"
  | "other"
export type VehicleAccountSubtype =
  | "car"
  | "motorcycle"
  | "truck"
  | "van"
  | "recreational_vehicle"
  | "boat"
  | "aircraft"
  | "other"
export type LoanAccountSubtype =
  | "mortgage"
  | "auto"
  | "student"
  | "personal"
  | "business"
  | "line_of_credit"
  | "other"
export type OtherAssetSubtype =
  | "collectible"
  | "precious_metal"
  | "business_ownership"
  | "receivable"
  | "other"
export type OtherLiabilitySubtype =
  | "tax"
  | "medical"
  | "payable"
  | "legal"
  | "other"
export type AccountSubtype =
  | CashAccountSubtype
  | InvestmentAccountSubtype
  | CryptoAccountSubtype
  | PropertyAccountSubtype
  | VehicleAccountSubtype
  | LoanAccountSubtype
  | OtherAssetSubtype
  | OtherLiabilitySubtype
  | "credit"

export interface Account {
  id: string
  name: string
  institutionName: string | null
  institutionDomain: string | null
  institutionLogoUrl: string | null
  notes: string | null
  classification: AccountClassification
  type: AccountType
  currencyCode: string
  createdAt: string
  updatedAt: string
}

export interface AccountSummary extends Account {
  subtype: AccountSubtype
  balance: number
}

export type AccountProfile =
  | {
      kind: "cash"
      subtype: CashAccountSubtype
    }
  | {
      kind: "investment"
      subtype: InvestmentAccountSubtype
    }
  | {
      kind: "crypto"
      subtype: CryptoAccountSubtype
      walletAddress: string | null
      network: string | null
    }
  | {
      kind: "property"
      subtype: PropertyAccountSubtype
      addressLine1: string | null
      addressLine2: string | null
      city: string | null
      region: string | null
      postalCode: string | null
      countryCode: string | null
      area: number | null
      areaUnit: "sqm" | "sqft" | null
      yearBuilt: number | null
    }
  | {
      kind: "vehicle"
      subtype: VehicleAccountSubtype
      make: string | null
      model: string | null
      year: number | null
      trim: string | null
      vin: string | null
      licensePlate: string | null
      mileage: number | null
      mileageUnit: "km" | "mi" | null
    }
  | {
      kind: "loan"
      subtype: LoanAccountSubtype
      originalPrincipal: number | null
      annualInterestRate: number | null
      interestRateType: "fixed" | "variable" | null
      termMonths: number | null
      startDate: string | null
      maturityDate: string | null
      paymentAmount: number | null
      paymentFrequency:
        | "weekly"
        | "biweekly"
        | "monthly"
        | "quarterly"
        | "annually"
        | "other"
        | null
      securedAssetAccountId: string | null
    }
  | { kind: "other_asset"; subtype: OtherAssetSubtype }
  | { kind: "other_liability"; subtype: OtherLiabilitySubtype }

export type CreateAccountProfile =
  | {
      kind: "cash"
      subtype: CashAccountSubtype
    }
  | {
      kind: "investment"
      subtype: InvestmentAccountSubtype
    }
  | {
      kind: "crypto"
      subtype: CryptoAccountSubtype
      walletAddress?: string
      network?: string
    }
  | {
      kind: "property"
      subtype: PropertyAccountSubtype
      addressLine1?: string
      addressLine2?: string
      city?: string
      region?: string
      postalCode?: string
      countryCode?: string
      area?: number
      areaUnit?: "sqm" | "sqft"
      yearBuilt?: number
    }
  | {
      kind: "vehicle"
      subtype: VehicleAccountSubtype
      make?: string
      model?: string
      year?: number
      trim?: string
      vin?: string
      licensePlate?: string
      mileage?: number
      mileageUnit?: "km" | "mi"
    }
  | {
      kind: "loan"
      subtype: LoanAccountSubtype
      originalPrincipal?: number
      annualInterestRate?: number
      interestRateType?: "fixed" | "variable"
      termMonths?: number
      startDate?: string
      maturityDate?: string
      paymentAmount?: number
      paymentFrequency?:
        | "weekly"
        | "biweekly"
        | "monthly"
        | "quarterly"
        | "annually"
        | "other"
      securedAssetAccountId?: string
    }
  | { kind: "other_asset"; subtype: OtherAssetSubtype }
  | { kind: "other_liability"; subtype: OtherLiabilitySubtype }

export type UpdateAccountProfile = {
  [TProfile in Exclude<
    AccountProfile,
    { kind: "credit_card" }
  > as TProfile["kind"]]: {
    kind: TProfile["kind"]
  } & Partial<Omit<TProfile, "kind">>
}[CreatableNonCardAccountType]

export interface AccountDetails extends Omit<Account, "type"> {
  type: CreatableNonCardAccountType
  balance: number
  details: AccountProfile
}
