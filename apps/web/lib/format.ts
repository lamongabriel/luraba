import { format as formatWithDateFns, isValid, parseISO } from "date-fns"
import { enUS, ptBR } from "date-fns/locale"

const DATE_LOCALES = {
  en: enUS,
  "pt-BR": ptBR,
} as const

type DateLanguage = keyof typeof DATE_LOCALES
type DateInput = Date | string | number | undefined

interface FormatDateOptions {
  formatString?: string
  language?: DateLanguage
  fallback?: string
}

function resolveDateLanguage(language = "en"): DateLanguage {
  return language === "pt-BR" ? "pt-BR" : "en"
}

export function parseDateValue(value: DateInput) {
  if (value === undefined || value === null || value === "") return undefined

  const date =
    value instanceof Date
      ? value
      : typeof value === "string"
        ? parseISO(
            /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value,
          )
        : new Date(value)

  return isValid(date) ? date : undefined
}

export function formatDate(
  date: DateInput,
  {
    formatString = "MMMM d, yyyy",
    language = "en",
    fallback = "",
  }: FormatDateOptions = {},
) {
  const parsedDate = parseDateValue(date)

  if (!parsedDate) return fallback

  return formatWithDateFns(parsedDate, formatString, {
    locale: DATE_LOCALES[language],
  })
}

export function formatShortDate(date: DateInput, language = "en") {
  return formatDate(date, {
    language: resolveDateLanguage(language),
    formatString: "dd MMM yyyy",
  })
}
