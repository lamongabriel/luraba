import {
  assetProviderSymbolsTable,
  assetQuotesTable,
  assetsTable,
  macroIndexValuesTable,
  marketDataProviderSettingsTable,
  priceHistoryTable,
} from "@luraba/db/schemas/investments.schema";
import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import type { Candle, MacroPoint, MacroSeriesId } from "./market-data.types";

export type AssetRecord = typeof assetsTable.$inferSelect;
export type QuoteRecord = typeof assetQuotesTable.$inferSelect;
export type ProviderSettingsRecord = typeof marketDataProviderSettingsTable.$inferSelect;

/**
 * Market data tables are global (prices and macro series are shared by every household), so this
 * repository is not household scoped. Provider settings are the one household table here.
 */
class MarketDataRepository {
  async providerSymbols(assetIds: string[]): Promise<Map<string, Record<string, string>>> {
    const result = new Map<string, Record<string, string>>();
    if (assetIds.length === 0) return result;
    const rows = await db
      .select()
      .from(assetProviderSymbolsTable)
      .where(inArray(assetProviderSymbolsTable.assetId, assetIds));
    for (const row of rows) {
      const current = result.get(row.assetId) ?? {};
      current[row.provider] = row.providerSymbol;
      result.set(row.assetId, current);
    }
    return result;
  }

  async getQuote(assetId: string): Promise<QuoteRecord | undefined> {
    const [row] = await db
      .select()
      .from(assetQuotesTable)
      .where(eq(assetQuotesTable.assetId, assetId));
    return row;
  }

  async getQuotes(assetIds: string[]): Promise<Map<string, QuoteRecord>> {
    if (assetIds.length === 0) return new Map();
    const rows = await db
      .select()
      .from(assetQuotesTable)
      .where(inArray(assetQuotesTable.assetId, assetIds));
    return new Map(rows.map((row) => [row.assetId, row]));
  }

  async upsertQuote(values: typeof assetQuotesTable.$inferInsert): Promise<void> {
    await db
      .insert(assetQuotesTable)
      .values(values)
      .onConflictDoUpdate({
        target: assetQuotesTable.assetId,
        set: { ...values, fetchedAt: new Date() },
      });
  }

  async upsertPrices(assetId: string, candles: Candle[], source: string): Promise<void> {
    if (candles.length === 0) return;
    for (let i = 0; i < candles.length; i += 500) {
      const chunk = candles.slice(i, i + 500);
      await db
        .insert(priceHistoryTable)
        .values(
          chunk.map((c) => ({
            assetId,
            priceDate: c.date,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            adjClose: c.adjClose ?? null,
            volume: c.volume ?? null,
            source,
          })),
        )
        .onConflictDoUpdate({
          target: [
            priceHistoryTable.assetId,
            priceHistoryTable.priceDate,
            priceHistoryTable.source,
          ],
          set: {
            open: sql`excluded.open`,
            high: sql`excluded.high`,
            low: sql`excluded.low`,
            close: sql`excluded.close`,
            adjClose: sql`excluded.adj_close`,
            volume: sql`excluded.volume`,
          },
        });
    }
  }

  /** One price per day; a manual price wins over provider prices for the same date. */
  async getPrices(
    assetId: string,
    from: string,
    to: string,
  ): Promise<{ date: string; close: string; source: string }[]> {
    const rows = await db
      .select({
        date: priceHistoryTable.priceDate,
        close: priceHistoryTable.close,
        source: priceHistoryTable.source,
      })
      .from(priceHistoryTable)
      .where(
        and(
          eq(priceHistoryTable.assetId, assetId),
          gte(priceHistoryTable.priceDate, from),
          lte(priceHistoryTable.priceDate, to),
        ),
      )
      .orderBy(asc(priceHistoryTable.priceDate));
    const byDate = new Map<string, { date: string; close: string; source: string }>();
    for (const row of rows) {
      const existing = byDate.get(row.date);
      if (!existing || (row.source === "manual" && existing.source !== "manual"))
        byDate.set(row.date, row);
    }
    return [...byDate.values()];
  }

  async getPricesForAssets(assetIds: string[], from: string, to: string) {
    const result = new Map<string, { date: string; close: string; source: string }[]>();
    if (assetIds.length === 0) return result;
    const rows = await db
      .select({
        assetId: priceHistoryTable.assetId,
        date: priceHistoryTable.priceDate,
        close: priceHistoryTable.close,
        source: priceHistoryTable.source,
      })
      .from(priceHistoryTable)
      .where(
        and(
          inArray(priceHistoryTable.assetId, assetIds),
          gte(priceHistoryTable.priceDate, from),
          lte(priceHistoryTable.priceDate, to),
        ),
      )
      .orderBy(asc(priceHistoryTable.priceDate));
    const index = new Map<string, Map<string, { date: string; close: string; source: string }>>();
    for (const row of rows) {
      const perAsset = index.get(row.assetId) ?? new Map();
      const existing = perAsset.get(row.date);
      if (!existing || (row.source === "manual" && existing.source !== "manual")) {
        perAsset.set(row.date, { date: row.date, close: row.close, source: row.source });
      }
      index.set(row.assetId, perAsset);
    }
    for (const [assetId, perAsset] of index) result.set(assetId, [...perAsset.values()]);
    return result;
  }

  async getLatestPrice(assetId: string, onOrBefore?: string) {
    const conditions = [eq(priceHistoryTable.assetId, assetId)];
    if (onOrBefore) conditions.push(lte(priceHistoryTable.priceDate, onOrBefore));
    const [row] = await db
      .select({
        date: priceHistoryTable.priceDate,
        close: priceHistoryTable.close,
        source: priceHistoryTable.source,
      })
      .from(priceHistoryTable)
      .where(and(...conditions))
      .orderBy(
        desc(priceHistoryTable.priceDate),
        sql`(${priceHistoryTable.source} = 'manual') desc`,
      )
      .limit(1);
    return row;
  }

  /** Date span already stored from providers (manual prices do not count as coverage). */
  async getCoverage(assetId: string): Promise<{ min: string | null; max: string | null }> {
    const [row] = await db
      .select({
        min: sql<string | null>`min(${priceHistoryTable.priceDate})`,
        max: sql<string | null>`max(${priceHistoryTable.priceDate})`,
      })
      .from(priceHistoryTable)
      .where(
        and(eq(priceHistoryTable.assetId, assetId), sql`${priceHistoryTable.source} <> 'manual'`),
      );
    return { min: row?.min ?? null, max: row?.max ?? null };
  }

  async upsertMacro(series: MacroSeriesId, points: MacroPoint[], source: string): Promise<void> {
    for (let i = 0; i < points.length; i += 1000) {
      const chunk = points.slice(i, i + 1000);
      await db
        .insert(macroIndexValuesTable)
        .values(chunk.map((p) => ({ series, refDate: p.date, value: p.value, source })))
        .onConflictDoUpdate({
          target: [macroIndexValuesTable.series, macroIndexValuesTable.refDate],
          set: { value: sql`excluded.value`, source: sql`excluded.source` },
        });
    }
  }

  async getMacro(series: string, from: string, to: string): Promise<MacroPoint[]> {
    const rows = await db
      .select({ date: macroIndexValuesTable.refDate, value: macroIndexValuesTable.value })
      .from(macroIndexValuesTable)
      .where(
        and(
          eq(macroIndexValuesTable.series, series),
          gte(macroIndexValuesTable.refDate, from),
          lte(macroIndexValuesTable.refDate, to),
        ),
      )
      .orderBy(asc(macroIndexValuesTable.refDate));
    return rows;
  }

  async getMacroRange(series: string): Promise<{ min: string | null; max: string | null }> {
    const [row] = await db
      .select({
        min: sql<string | null>`min(${macroIndexValuesTable.refDate})`,
        max: sql<string | null>`max(${macroIndexValuesTable.refDate})`,
      })
      .from(macroIndexValuesTable)
      .where(eq(macroIndexValuesTable.series, series));
    return { min: row?.min ?? null, max: row?.max ?? null };
  }

  async listProviderSettings(householdId: string): Promise<ProviderSettingsRecord[]> {
    return db
      .select()
      .from(marketDataProviderSettingsTable)
      .where(eq(marketDataProviderSettingsTable.householdId, householdId));
  }

  async upsertProviderSettings(
    householdId: string,
    providerId: string,
    values: Partial<
      Pick<ProviderSettingsRecord, "enabled" | "priority" | "apiKeyEncrypted" | "premium">
    >,
  ): Promise<ProviderSettingsRecord> {
    const [row] = await db
      .insert(marketDataProviderSettingsTable)
      .values({ householdId, providerId, ...values })
      .onConflictDoUpdate({
        target: [
          marketDataProviderSettingsTable.householdId,
          marketDataProviderSettingsTable.providerId,
        ],
        set: { ...values, updatedAt: new Date() },
      })
      .returning();
    return row as ProviderSettingsRecord;
  }

  async assetsByIds(ids: string[]): Promise<AssetRecord[]> {
    if (ids.length === 0) return [];
    return db.select().from(assetsTable).where(inArray(assetsTable.id, ids));
  }
}

export const marketDataRepository = new MarketDataRepository();
