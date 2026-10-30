import { holidayCalendarTable, taxRulesTable } from "@luraba/db/schemas/investments.schema";
import {
  addIsoDays,
  BusinessCalendar,
  DEFAULT_TAX_RULES,
  Dec,
  d,
  type IndexData,
  ONE,
  type TaxRuleRow,
  TaxRules,
} from "@luraba/domain";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { marketDataRepository } from "@/modules/market-data/market-data.repository";

type Loaded = { data: IndexData; loadedAt: number; from: string };
let cache: Loaded | null = null;
const TTL_MS = 5 * 60 * 1000;

const FALLBACK_CDI_ANNUAL = "0.10";
const FALLBACK_IPCA_MONTHLY = "0.004";

/**
 * Macro series as an `IndexData` for the fixed-income accrual. Missing days/months fall back to a
 * projection from the latest published value, which the accrual flags as estimated.
 */
export async function loadIndexData(from: string): Promise<IndexData> {
  if (cache && Date.now() - cache.loadedAt < TTL_MS && cache.from <= from) return cache.data;
  const to = addIsoDays(new Date().toISOString().slice(0, 10), 1);
  const start = from < "2000-01-01" ? "2000-01-01" : from;
  const [cdi, selic, ipca, igpm, usCpi] = await Promise.all([
    marketDataRepository.getMacro("CDI_DAILY", start, to),
    marketDataRepository.getMacro("SELIC_DAILY", start, to),
    marketDataRepository.getMacro("IPCA_MONTHLY", start, to),
    marketDataRepository.getMacro("IGPM_MONTHLY", start, to),
    marketDataRepository.getMacro("US_CPI_MONTHLY", start, to),
  ]);

  // Published daily rates are percentages per day (0.0551 = 0.0551%).
  const daily = (points: { date: string; value: string }[]) => {
    const map = new Map(points.map((p) => [p.date, d(p.value).div(100)]));
    return (date: string) => map.get(date);
  };
  const monthly = (points: { date: string; value: string }[]) => {
    const map = new Map(points.map((p) => [p.date.slice(0, 7), d(p.value).div(100)]));
    return (month: string) => map.get(month);
  };
  const annualFrom = (points: { date: string; value: string }[], fallback: string): string => {
    const last = points[points.length - 1];
    return last ? ONE.plus(d(last.value).div(100)).pow(252).minus(1).toFixed(10) : fallback;
  };
  const projectMonthly = (points: { date: string; value: string }[], fallback: string): string => {
    const recent = points.slice(-12);
    if (recent.length === 0) return fallback;
    const total = recent.reduce((acc, p) => acc.plus(d(p.value)), new Dec(0));
    return total.div(recent.length).div(100).toFixed(8);
  };

  const data: IndexData = {
    cdiDaily: daily(cdi),
    cdiAnnualProjection: annualFrom(cdi, FALLBACK_CDI_ANNUAL),
    selicDaily: daily(selic),
    selicAnnualProjection: annualFrom(selic, FALLBACK_CDI_ANNUAL),
    ipcaMonthly: monthly(ipca),
    ipcaProjectionMonthly: projectMonthly(ipca, FALLBACK_IPCA_MONTHLY),
    igpmMonthly: monthly(igpm),
    igpmProjectionMonthly: projectMonthly(igpm, FALLBACK_IPCA_MONTHLY),
    usCpiMonthly: monthly(usCpi),
    usCpiProjectionMonthly: projectMonthly(usCpi, "0.003"),
  };
  cache = { data, loadedAt: Date.now(), from };
  return data;
}

let calendarCache: { calendar: BusinessCalendar; loadedAt: number } | null = null;
let rulesCache: { rules: TaxRules; loadedAt: number } | null = null;

/** The ANBIMA holiday calendar from the `holiday_calendar` table (updatable data). */
export async function loadCalendar(): Promise<BusinessCalendar> {
  if (calendarCache && Date.now() - calendarCache.loadedAt < TTL_MS) return calendarCache.calendar;
  const rows = await db
    .select({ date: holidayCalendarTable.holidayDate })
    .from(holidayCalendarTable)
    .where(eq(holidayCalendarTable.calendar, "ANBIMA"));
  const calendar =
    rows.length > 0 ? new BusinessCalendar(rows.map((row) => row.date)) : BusinessCalendar.anbima();
  calendarCache = { calendar, loadedAt: Date.now() };
  return calendar;
}

/** Versioned tax rules from the `tax_rules` table; the shipped defaults when the table is empty. */
export async function loadTaxRules(): Promise<TaxRules> {
  if (rulesCache && Date.now() - rulesCache.loadedAt < TTL_MS) return rulesCache.rules;
  const rows = await db.select().from(taxRulesTable);
  const mapped: TaxRuleRow[] = rows.map((row) => ({
    country: row.country,
    ruleKey: row.ruleKey,
    assetClass: row.assetClass,
    eventType: row.eventType,
    rate: row.rate,
    minDays: row.minDays,
    maxDays: row.maxDays,
    threshold: row.threshold,
    params: row.params,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
    notes: row.notes,
  }));
  const rules = new TaxRules(mapped.length > 0 ? mapped : DEFAULT_TAX_RULES);
  rulesCache = { rules, loadedAt: Date.now() };
  return rules;
}

export function clearReferenceCaches(): void {
  cache = null;
  calendarCache = null;
  rulesCache = null;
}
