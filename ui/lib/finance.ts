import { addMonths } from "date-fns"

import { formatDate as formatAppDate, parseDateValue } from "@/lib/format"

const LANGUAGE_TO_LOCALE: Record<string, string> = {
  en: "en-US",
  "pt-BR": "pt-BR",
}

export function getLocale(language = "en") {
  return LANGUAGE_TO_LOCALE[language] ?? "en-US"
}

function resolveDateLanguage(language = "en") {
  return language === "pt-BR" ? "pt-BR" : "en"
}

export function formatCurrency(
  amount: number,
  currencyCode: string,
  language = "en",
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat(getLocale(language), {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    ...options,
  }).format(amount / 100)
}

export function majorToMinorUnits(amount: number, precision: number) {
  return Math.round(amount * 10 ** precision)
}

export function minorToMajorUnits(amount: number, precision: number) {
  return amount / 10 ** precision
}

export function formatSignedCurrency(
  amount: number,
  currencyCode: string,
  language = "en",
) {
  return `${amount > 0 ? "+" : amount < 0 ? "-" : ""}${formatCurrency(Math.abs(amount), currencyCode, language)}`
}

export function formatDate(value: string | Date, language = "en") {
  return formatAppDate(value, {
    language: resolveDateLanguage(language),
    formatString: "dd MMM yyyy",
  })
}

export function formatMonthLabel(monthKey: string, language = "en") {
  return formatAppDate(`${monthKey}-01`, {
    language: resolveDateLanguage(language),
    formatString: "MMMM yyyy",
  })
}

export function shiftMonthKey(monthKey: string, offset: number) {
  const date = parseDateValue(`${monthKey}-01T12:00:00`)

  if (!date) return monthKey

  const shiftedDate = addMonths(date, offset)
  return formatAppDate(shiftedDate, { formatString: "yyyy-MM" })
}

export function getCurrentMonthKey() {
  return formatAppDate(new Date(), { formatString: "yyyy-MM" })
}

export function maskCardNumber(last4: string) {
  return `•••• •••• •••• ${last4}`
}

export function sumAmounts(items: Array<{ amount: number }>) {
  return items.reduce((total, item) => total + item.amount, 0)
}
