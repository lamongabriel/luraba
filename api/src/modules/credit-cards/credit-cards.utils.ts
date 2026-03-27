export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function monthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function addDays(date: Date, days: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

export function addMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

export function clampDayOfMonth(year: number, monthIndex: number, day: number): number {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return Math.min(day, lastDay);
}

export function dateWithClampedDay(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, clampDayOfMonth(year, monthIndex, day)));
}

export function getTodayInTimezone(timezone: string): Date {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === 'year')?.value ?? 0);
  const month = Number(parts.find((part) => part.type === 'month')?.value ?? 1);
  const day = Number(parts.find((part) => part.type === 'day')?.value ?? 1);

  return new Date(Date.UTC(year, month - 1, day));
}

export function buildCycleFromClosingDate(closingDate: Date, closingDay: number, dueDay: number) {
  const previousClosing = dateWithClampedDay(closingDate.getUTCFullYear(), closingDate.getUTCMonth() - 1, closingDay);
  const periodStart = addDays(previousClosing, 1);
  const periodEnd = closingDate;

  let dueDate = dateWithClampedDay(closingDate.getUTCFullYear(), closingDate.getUTCMonth(), dueDay);
  if (dueDate <= closingDate) {
    dueDate = dateWithClampedDay(closingDate.getUTCFullYear(), closingDate.getUTCMonth() + 1, dueDay);
  }

  return {
    periodStart,
    periodEnd,
    closingDate,
    dueDate,
  };
}

export function buildCycleForPurchaseDate(purchaseDate: Date, closingDay: number, dueDay: number) {
  const purchaseYear = purchaseDate.getUTCFullYear();
  const purchaseMonth = purchaseDate.getUTCMonth();
  const sameMonthClosing = dateWithClampedDay(purchaseYear, purchaseMonth, closingDay);
  const closingDate = purchaseDate <= sameMonthClosing
    ? sameMonthClosing
    : dateWithClampedDay(purchaseYear, purchaseMonth + 1, closingDay);

  return buildCycleFromClosingDate(closingDate, closingDay, dueDay);
}

export function formatMonthKey(monthDate: Date): string {
  return `${monthDate.getUTCFullYear()}-${String(monthDate.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function parseMonthKey(monthKey: string): Date {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}
