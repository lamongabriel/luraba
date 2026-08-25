import type {
  AccountDetails,
  CreatableNonCardAccountType,
  UpdateAccountProfile,
} from "@/interfaces/account"
import type {
  CreateAccountHttpBody,
  UpdateAccountHttpBody,
} from "@/interfaces/http/accounts-http"
import { majorToMinorUnits, minorToMajorUnits } from "@/lib/finance"

import type { CreateEditAccountFormValues } from "./create-edit-account-form.schema"

export function getCreateEditAccountDefaultValues(
  defaultCurrencyCode: string,
  type: CreatableNonCardAccountType = "cash",
  account?: AccountDetails,
  precision = 2,
): CreateEditAccountFormValues {
  if (account) {
    return getAccountEditDefaultValues(account, precision)
  }

  const common = {
    currencyCode: defaultCurrencyCode,
    institutionDomain: "",
    institutionName: "",
    name: "",
    notes: "",
  }
  const nonCard = { ...common, openingBalance: undefined, balanceAsOfDate: "" }

  switch (type) {
    case "cash":
      return {
        ...nonCard,
        type,
        subtype: "checking",
      }
    case "investment":
      return {
        ...nonCard,
        type,
        subtype: "brokerage",
      }
    case "crypto":
      return {
        ...nonCard,
        type,
        subtype: "wallet",
        walletAddress: "",
        network: "",
      }
    case "property":
      return {
        ...nonCard,
        type,
        subtype: "house",
        addressLine1: "",
        addressLine2: "",
        city: "",
        region: "",
        postalCode: "",
        countryCode: "",
        area: undefined,
        areaUnit: "",
        yearBuilt: undefined,
      }
    case "vehicle":
      return {
        ...nonCard,
        type,
        subtype: "car",
        make: "",
        model: "",
        year: undefined,
        trim: "",
        vin: "",
        licensePlate: "",
        mileage: undefined,
        mileageUnit: "",
      }
    case "loan":
      return {
        ...nonCard,
        type,
        subtype: "personal",
        originalPrincipal: undefined,
        annualInterestRate: undefined,
        interestRateType: "",
        termMonths: undefined,
        startDate: "",
        maturityDate: "",
        paymentAmount: undefined,
        paymentFrequency: "",
        securedAssetAccountId: "",
      }
    case "other_asset":
      return { ...nonCard, type, subtype: "other" }
    case "other_liability":
      return { ...nonCard, type, subtype: "other" }
    default:
      throw new Error("Unsupported account type.")
  }
}

export const optionalAccountText = (value: string) => value.trim() || undefined
export const nullableAccountText = (value: string) => value.trim() || null

export const optionalAccountNumber = (value: number | "" | undefined) =>
  value === "" ? undefined : value

function buildCommonPayload(values: CreateEditAccountFormValues) {
  return {
    currencyCode: values.currencyCode.trim().toUpperCase(),
    institutionDomain: optionalAccountText(values.institutionDomain),
    institutionName: optionalAccountText(values.institutionName),
    name: values.name.trim(),
    notes: optionalAccountText(values.notes),
  }
}

function buildCommonUpdatePayload(
  values: CreateEditAccountFormValues,
): Omit<UpdateAccountHttpBody, "details"> {
  return {
    institutionDomain: nullableAccountText(values.institutionDomain),
    institutionName: nullableAccountText(values.institutionName),
    name: values.name.trim(),
    notes: nullableAccountText(values.notes),
  }
}

export function buildCreateAccountPayload(
  values: CreateEditAccountFormValues,
  precision: number,
): CreateAccountHttpBody {
  const openingBalance = optionalAccountNumber(values.openingBalance)

  switch (values.type) {
    case "cash":
      return {
        ...buildCommonPayload(values),
        type: values.type,
        details: {
          kind: values.type,
          subtype: values.subtype,
        },
        openingBalance:
          openingBalance === undefined
            ? undefined
            : majorToMinorUnits(openingBalance, precision),
        balanceAsOfDate: optionalAccountText(values.balanceAsOfDate),
      }
    case "investment":
      return {
        ...buildCommonPayload(values),
        type: values.type,
        details: {
          kind: values.type,
          subtype: values.subtype,
        },
        openingBalance:
          openingBalance === undefined
            ? undefined
            : majorToMinorUnits(openingBalance, precision),
        balanceAsOfDate: optionalAccountText(values.balanceAsOfDate),
      }
    case "crypto":
      return {
        ...buildCommonPayload(values),
        type: values.type,
        details: {
          kind: values.type,
          subtype: values.subtype,
          walletAddress: optionalAccountText(values.walletAddress),
          network: optionalAccountText(values.network),
        },
        openingBalance:
          openingBalance === undefined
            ? undefined
            : majorToMinorUnits(openingBalance, precision),
        balanceAsOfDate: optionalAccountText(values.balanceAsOfDate),
      }
    case "property":
      return {
        ...buildCommonPayload(values),
        type: values.type,
        details: {
          kind: values.type,
          subtype: values.subtype,
          addressLine1: optionalAccountText(values.addressLine1),
          addressLine2: optionalAccountText(values.addressLine2),
          city: optionalAccountText(values.city),
          region: optionalAccountText(values.region),
          postalCode: optionalAccountText(values.postalCode),
          countryCode: optionalAccountText(values.countryCode)?.toUpperCase(),
          area: optionalAccountNumber(values.area),
          areaUnit: values.areaUnit || undefined,
          yearBuilt: optionalAccountNumber(values.yearBuilt),
        },
        openingBalance:
          openingBalance === undefined
            ? undefined
            : majorToMinorUnits(openingBalance, precision),
        balanceAsOfDate: optionalAccountText(values.balanceAsOfDate),
      }
    case "vehicle":
      return {
        ...buildCommonPayload(values),
        type: values.type,
        details: {
          kind: values.type,
          subtype: values.subtype,
          make: optionalAccountText(values.make),
          model: optionalAccountText(values.model),
          year: optionalAccountNumber(values.year),
          trim: optionalAccountText(values.trim),
          vin: optionalAccountText(values.vin),
          licensePlate: optionalAccountText(values.licensePlate),
          mileage: optionalAccountNumber(values.mileage),
          mileageUnit: values.mileageUnit || undefined,
        },
        openingBalance:
          openingBalance === undefined
            ? undefined
            : majorToMinorUnits(openingBalance, precision),
        balanceAsOfDate: optionalAccountText(values.balanceAsOfDate),
      }
    case "loan": {
      const originalPrincipal = optionalAccountNumber(values.originalPrincipal)
      const paymentAmount = optionalAccountNumber(values.paymentAmount)

      return {
        ...buildCommonPayload(values),
        type: values.type,
        details: {
          kind: values.type,
          subtype: values.subtype,
          originalPrincipal:
            originalPrincipal === undefined
              ? undefined
              : majorToMinorUnits(originalPrincipal, precision),
          annualInterestRate: optionalAccountNumber(values.annualInterestRate),
          interestRateType: values.interestRateType || undefined,
          termMonths: optionalAccountNumber(values.termMonths),
          startDate: optionalAccountText(values.startDate),
          maturityDate: optionalAccountText(values.maturityDate),
          paymentAmount:
            paymentAmount === undefined
              ? undefined
              : majorToMinorUnits(paymentAmount, precision),
          paymentFrequency: values.paymentFrequency || undefined,
          securedAssetAccountId: optionalAccountText(
            values.securedAssetAccountId,
          ),
        },
        openingBalance:
          openingBalance === undefined
            ? undefined
            : majorToMinorUnits(openingBalance, precision),
        balanceAsOfDate: optionalAccountText(values.balanceAsOfDate),
      }
    }
    case "other_asset":
      return {
        ...buildCommonPayload(values),
        type: values.type,
        details: { kind: values.type, subtype: values.subtype },
        openingBalance:
          openingBalance === undefined
            ? undefined
            : majorToMinorUnits(openingBalance, precision),
        balanceAsOfDate: optionalAccountText(values.balanceAsOfDate),
      }
    case "other_liability":
      return {
        ...buildCommonPayload(values),
        type: values.type,
        details: { kind: values.type, subtype: values.subtype },
        openingBalance:
          openingBalance === undefined
            ? undefined
            : majorToMinorUnits(openingBalance, precision),
        balanceAsOfDate: optionalAccountText(values.balanceAsOfDate),
      }
  }
}

export function buildUpdateAccountPayload(
  values: CreateEditAccountFormValues,
  precision: number,
): UpdateAccountHttpBody {
  return {
    ...buildCommonUpdatePayload(values),
    details: buildUpdateAccountDetailsPayload(values, precision),
  }
}

function getAccountEditDefaultValues(
  account: AccountDetails,
  precision: number,
): CreateEditAccountFormValues {
  const details = account.details
  const common = {
    currencyCode: account.currencyCode,
    institutionDomain: account.institutionDomain ?? "",
    institutionName: account.institutionName ?? "",
    name: account.name,
    notes: account.notes ?? "",
  }
  const nonCard = { ...common, openingBalance: undefined, balanceAsOfDate: "" }
  const money = (value: number | null) =>
    value === null ? undefined : minorToMajorUnits(value, precision)

  switch (details.kind) {
    case "cash":
      return { ...nonCard, type: "cash", subtype: details.subtype }
    case "investment":
      return { ...nonCard, type: "investment", subtype: details.subtype }
    case "crypto":
      return {
        ...nonCard,
        type: "crypto",
        subtype: details.subtype,
        walletAddress: details.walletAddress ?? "",
        network: details.network ?? "",
      }
    case "property":
      return {
        ...nonCard,
        type: "property",
        subtype: details.subtype,
        addressLine1: details.addressLine1 ?? "",
        addressLine2: details.addressLine2 ?? "",
        city: details.city ?? "",
        region: details.region ?? "",
        postalCode: details.postalCode ?? "",
        countryCode: details.countryCode ?? "",
        area: details.area ?? undefined,
        areaUnit: details.areaUnit ?? "",
        yearBuilt: details.yearBuilt ?? undefined,
      }
    case "vehicle":
      return {
        ...nonCard,
        type: "vehicle",
        subtype: details.subtype,
        make: details.make ?? "",
        model: details.model ?? "",
        year: details.year ?? undefined,
        trim: details.trim ?? "",
        vin: details.vin ?? "",
        licensePlate: details.licensePlate ?? "",
        mileage: details.mileage ?? undefined,
        mileageUnit: details.mileageUnit ?? "",
      }
    case "loan":
      return {
        ...nonCard,
        type: "loan",
        subtype: details.subtype,
        originalPrincipal: money(details.originalPrincipal),
        annualInterestRate: details.annualInterestRate ?? undefined,
        interestRateType: details.interestRateType ?? "",
        termMonths: details.termMonths ?? undefined,
        startDate: details.startDate ?? "",
        maturityDate: details.maturityDate ?? "",
        paymentAmount: money(details.paymentAmount),
        paymentFrequency: details.paymentFrequency ?? "",
        securedAssetAccountId: details.securedAssetAccountId ?? "",
      }
    case "other_asset":
      return { ...nonCard, type: "other_asset", subtype: details.subtype }
    case "other_liability":
      return { ...nonCard, type: "other_liability", subtype: details.subtype }
    default:
      throw new Error("Unsupported account profile.")
  }
}

function buildUpdateAccountDetailsPayload(
  values: CreateEditAccountFormValues,
  precision: number,
): UpdateAccountProfile {
  switch (values.type) {
    case "cash":
      return { kind: "cash", subtype: values.subtype }
    case "investment":
      return { kind: "investment", subtype: values.subtype }
    case "crypto":
      return {
        kind: "crypto",
        subtype: values.subtype,
        walletAddress: nullableAccountText(values.walletAddress),
        network: nullableAccountText(values.network),
      }
    case "property":
      return {
        kind: "property",
        subtype: values.subtype,
        addressLine1: nullableAccountText(values.addressLine1),
        addressLine2: nullableAccountText(values.addressLine2),
        city: nullableAccountText(values.city),
        region: nullableAccountText(values.region),
        postalCode: nullableAccountText(values.postalCode),
        countryCode:
          nullableAccountText(values.countryCode)?.toUpperCase() ?? null,
        area: optionalAccountNumber(values.area) ?? null,
        areaUnit: values.areaUnit || null,
        yearBuilt: optionalAccountNumber(values.yearBuilt) ?? null,
      }
    case "vehicle":
      return {
        kind: "vehicle",
        subtype: values.subtype,
        make: nullableAccountText(values.make),
        model: nullableAccountText(values.model),
        year: optionalAccountNumber(values.year) ?? null,
        trim: nullableAccountText(values.trim),
        vin: nullableAccountText(values.vin),
        licensePlate: nullableAccountText(values.licensePlate),
        mileage: optionalAccountNumber(values.mileage) ?? null,
        mileageUnit: values.mileageUnit || null,
      }
    case "loan": {
      const originalPrincipal = optionalAccountNumber(values.originalPrincipal)
      const paymentAmount = optionalAccountNumber(values.paymentAmount)

      return {
        kind: "loan",
        subtype: values.subtype,
        originalPrincipal:
          originalPrincipal === undefined
            ? null
            : majorToMinorUnits(originalPrincipal, precision),
        annualInterestRate:
          optionalAccountNumber(values.annualInterestRate) ?? null,
        interestRateType: values.interestRateType || null,
        termMonths: optionalAccountNumber(values.termMonths) ?? null,
        startDate: nullableAccountText(values.startDate),
        maturityDate: nullableAccountText(values.maturityDate),
        paymentAmount:
          paymentAmount === undefined
            ? null
            : majorToMinorUnits(paymentAmount, precision),
        paymentFrequency: values.paymentFrequency || null,
        securedAssetAccountId: nullableAccountText(
          values.securedAssetAccountId,
        ),
      }
    }
    case "other_asset":
      return { kind: "other_asset", subtype: values.subtype }
    case "other_liability":
      return { kind: "other_liability", subtype: values.subtype }
    default:
      throw new Error("Unsupported account profile.")
  }
}
