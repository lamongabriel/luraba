const LANGUAGE_TO_LOCALE: Record<string, string> = {
  en: "en-US",
  "pt-BR": "pt-BR",
};

export function getLocale(language = "en") {
  return LANGUAGE_TO_LOCALE[language] ?? "en-US";
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
  }).format(amount / 100);
}

export function formatSignedCurrency(
  amount: number,
  currencyCode: string,
  language = "en",
) {
  return `${amount > 0 ? "+" : amount < 0 ? "-" : ""}${formatCurrency(Math.abs(amount), currencyCode, language)}`;
}

export function formatDate(value: string | Date, language = "en") {
  const date = typeof value === "string" ? new Date(`${value}T12:00:00`) : value;
  return new Intl.DateTimeFormat(getLocale(language), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatMonthLabel(monthKey: string, language = "en") {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat(getLocale(language), {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function shiftMonthKey(monthKey: string, offset: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function maskCardNumber(last4: string) {
  return `•••• •••• •••• ${last4}`;
}

export function sumAmounts(items: Array<{ amount: number }>) {
  return items.reduce((total, item) => total + item.amount, 0);
}
