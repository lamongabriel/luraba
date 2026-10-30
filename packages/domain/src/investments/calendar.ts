import type { IsoDate } from "./types.js";

const DAY_MS = 86_400_000;

export function isoToUtc(date: IsoDate): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year as number, (month as number) - 1, day as number));
}

export function utcToIso(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

export function addIsoDays(date: IsoDate, days: number): IsoDate {
  return utcToIso(new Date(isoToUtc(date).getTime() + days * DAY_MS));
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export function diffIsoDays(from: IsoDate, to: IsoDate): number {
  return Math.round((isoToUtc(to).getTime() - isoToUtc(from).getTime()) / DAY_MS);
}

export function isWeekend(date: IsoDate): boolean {
  const day = isoToUtc(date).getUTCDay();
  return day === 0 || day === 6;
}

/** Gregorian Easter Sunday (anonymous algorithm). */
export function easterSunday(year: number): IsoDate {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const dd = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - dd - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return utcToIso(new Date(Date.UTC(year, month - 1, day)));
}

export type CalendarHoliday = { date: IsoDate; name: string };

/**
 * ANBIMA national holidays for a year (the calendar behind CDI/BUS-252 accruals). Weekend
 * holidays are included; callers treat them as non-business days anyway.
 * Black Awareness Day (Nov 20) is national since 2024 (Lei 14.759/2023).
 */
export function anbimaHolidays(year: number): CalendarHoliday[] {
  const easter = easterSunday(year);
  const fixed = (month: string, day: string, name: string): CalendarHoliday => ({
    date: `${year}-${month}-${day}`,
    name,
  });
  const holidays: CalendarHoliday[] = [
    fixed("01", "01", "New Year's Day (Confraternização Universal)"),
    { date: addIsoDays(easter, -48), name: "Carnival Monday" },
    { date: addIsoDays(easter, -47), name: "Carnival Tuesday" },
    { date: addIsoDays(easter, -2), name: "Good Friday (Sexta-feira Santa)" },
    fixed("04", "21", "Tiradentes"),
    fixed("05", "01", "Labour Day"),
    { date: addIsoDays(easter, 60), name: "Corpus Christi" },
    fixed("09", "07", "Independence Day"),
    fixed("10", "12", "Nossa Senhora Aparecida"),
    fixed("11", "02", "All Souls' Day (Finados)"),
    fixed("11", "15", "Republic Proclamation Day"),
    fixed("12", "25", "Christmas"),
  ];
  if (year >= 2024) {
    holidays.push(fixed("11", "20", "Black Awareness Day"));
  }
  return holidays.sort((x, y) => x.date.localeCompare(y.date));
}

/**
 * B3 trading-calendar extras on top of the national holidays: no session on Dec 24 and Dec 31
 * (and Jan 25 São Paulo anniversary before 2022). One-off closures are not generated; update the
 * `holiday_calendar` table for those.
 */
export function b3ExtraHolidays(year: number): CalendarHoliday[] {
  const extra: CalendarHoliday[] = [
    { date: `${year}-12-24`, name: "Christmas Eve (no B3 session)" },
    { date: `${year}-12-31`, name: "New Year's Eve (no B3 session)" },
  ];
  if (year < 2022) {
    extra.push({ date: `${year}-01-25`, name: "São Paulo anniversary" });
  }
  return extra;
}

export class BusinessCalendar {
  private readonly holidays: Set<IsoDate>;

  constructor(holidays: Iterable<IsoDate>) {
    this.holidays = new Set(holidays);
  }

  /** National (ANBIMA) calendar for the years given, 2000..2035 by default. */
  static anbima(fromYear = 2000, toYear = 2035): BusinessCalendar {
    const dates: IsoDate[] = [];
    for (let year = fromYear; year <= toYear; year++) {
      for (const holiday of anbimaHolidays(year)) {
        dates.push(holiday.date);
      }
    }
    return new BusinessCalendar(dates);
  }

  isBusinessDay(date: IsoDate): boolean {
    return !isWeekend(date) && !this.holidays.has(date);
  }

  /** First business day on or after `date`. */
  nextBusinessDay(date: IsoDate): IsoDate {
    let cursor = date;
    while (!this.isBusinessDay(cursor)) {
      cursor = addIsoDays(cursor, 1);
    }
    return cursor;
  }

  /** Last business day on or before `date`. */
  previousBusinessDay(date: IsoDate): IsoDate {
    let cursor = date;
    while (!this.isBusinessDay(cursor)) {
      cursor = addIsoDays(cursor, -1);
    }
    return cursor;
  }

  addBusinessDays(date: IsoDate, count: number): IsoDate {
    let cursor = date;
    let remaining = Math.abs(count);
    const step = count < 0 ? -1 : 1;
    while (remaining > 0) {
      cursor = addIsoDays(cursor, step);
      if (this.isBusinessDay(cursor)) {
        remaining--;
      }
    }
    return cursor;
  }

  /** Business days `d` with `from <= d < to` (the BUS/252 count: the start day accrues, the end day does not). */
  countBusinessDays(from: IsoDate, to: IsoDate): number {
    let count = 0;
    for (let cursor = from; cursor < to; cursor = addIsoDays(cursor, 1)) {
      if (this.isBusinessDay(cursor)) {
        count++;
      }
    }
    return count;
  }

  businessDaysBetween(from: IsoDate, to: IsoDate): IsoDate[] {
    const days: IsoDate[] = [];
    for (let cursor = from; cursor < to; cursor = addIsoDays(cursor, 1)) {
      if (this.isBusinessDay(cursor)) {
        days.push(cursor);
      }
    }
    return days;
  }

  lastBusinessDayOfMonth(year: number, month: number): IsoDate {
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return this.previousBusinessDay(iso);
  }
}
