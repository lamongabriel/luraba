import type { CreateCreditCardInput, CreditCard, UpdateCreditCardInput } from "@luraba/contracts";
import {
  CREDIT_CARD_BRAND_VALUES,
  type CreditCardBrand,
  DEFAULT_CREDIT_CARD_COLOR,
} from "@/lib/credit-cards";
import { majorToMinorUnits, minorToMajorUnits } from "@/lib/finance";

import type { CreateEditCreditCardFormValues } from "./create-edit-credit-card-form.schema";

export function getCreateEditCreditCardDefaultValues(
  defaultCurrencyCode: string,
  card?: CreditCard,
  precision = 2,
): CreateEditCreditCardFormValues {
  const brand = CREDIT_CARD_BRAND_VALUES.find((value) => value === card?.brand) ?? "Visa";

  return {
    name: card?.name ?? "",
    ownerAccountId: card?.ownerAccountId ?? "",
    currencyCode: card?.currencyCode ?? defaultCurrencyCode,
    institutionName: card?.institutionName ?? "",
    institutionDomain: card?.institutionDomain ?? "",
    notes: card?.notes ?? "",
    brand: brand as CreditCardBrand,
    last4: card?.last4 ?? "",
    color: card?.color ?? DEFAULT_CREDIT_CARD_COLOR,
    closingDay: card?.closingDay ?? 1,
    dueDay: card?.dueDay ?? 15,
    // Cards stored before the limit became required hold -1: the person must enter one on save.
    creditLimitAmount:
      card && card.creditLimitAmount > 0
        ? minorToMajorUnits(card.creditLimitAmount, precision)
        : "",
  };
}

function optionalValue(value: string) {
  return value.trim() || undefined;
}

export function buildCreateCreditCardPayload(
  values: CreateEditCreditCardFormValues,
  precision: number,
): CreateCreditCardInput {
  return {
    name: values.name.trim(),
    ownerAccountId: values.ownerAccountId,
    institutionName: optionalValue(values.institutionName),
    institutionDomain: optionalValue(values.institutionDomain),
    notes: optionalValue(values.notes),
    brand: values.brand,
    last4: values.last4,
    color: values.color || undefined,
    closingDay: values.closingDay,
    dueDay: values.dueDay,
    creditLimitAmount: majorToMinorUnits(Number(values.creditLimitAmount), precision),
  };
}

export function buildUpdateCreditCardPayload(
  values: CreateEditCreditCardFormValues,
  precision: number,
): UpdateCreditCardInput {
  return {
    name: values.name.trim(),
    institutionName: values.institutionName.trim() || null,
    institutionDomain: values.institutionDomain.trim() || null,
    notes: values.notes.trim() || null,
    brand: values.brand,
    last4: values.last4,
    color: values.color || null,
    closingDay: values.closingDay,
    dueDay: values.dueDay,
    creditLimitAmount: majorToMinorUnits(Number(values.creditLimitAmount), precision),
  };
}
