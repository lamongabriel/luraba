import {
  assetFixedIncomeTermsTable,
  assetsTable,
  investmentEventsTable,
  portfolioSnapshotsTable,
} from "@luraba/db/schemas/investments.schema";
import { addIsoDays } from "@luraba/domain";
import { eq, min, sql } from "drizzle-orm";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import { MarketDataRouteError } from "@/modules/market-data/market-data.router";
import { isMarketOpen, marketDataService } from "@/modules/market-data/market-data.service";
import { MACRO_SERIES } from "@/modules/market-data/market-data.types";
import { logger } from "@/shared/logger";
import { clearReferenceCaches } from "./investments.macro";
import type { AssetRecord } from "./investments.types";
import { computeHoldings, resolveScope, todayIso } from "./investments.valuation";

const CONCURRENCY = 4;

export type HeldAsset = { householdId: string; asset: AssetRecord; firstTradeDate: string };

/** Every asset that appears in at least one event, once, with a household whose provider settings apply. */
export async function listHeldAssets(): Promise<HeldAsset[]> {
  const rows = await db
    .select({
      householdId: investmentEventsTable.householdId,
      asset: assetsTable,
      firstTradeDate: min(investmentEventsTable.tradeDate),
    })
    .from(investmentEventsTable)
    .innerJoin(assetsTable, eq(assetsTable.id, investmentEventsTable.assetId))
    .groupBy(investmentEventsTable.householdId, assetsTable.id);
  const seen = new Map<string, HeldAsset>();
  for (const row of rows) {
    const existing = seen.get(row.asset.id);
    const first = row.firstTradeDate ?? todayIso();
    if (!existing)
      seen.set(row.asset.id, {
        householdId: row.householdId,
        asset: row.asset,
        firstTradeDate: first,
      });
    else if (first < existing.firstTradeDate) existing.firstTradeDate = first;
  }
  return [...seen.values()];
}

const quoted = (asset: AssetRecord) =>
  ![
    "CDB",
    "LCI",
    "LCA",
    "LC",
    "LCD",
    "DEBENTURE",
    "DEBENTURE_INCENTIVADA",
    "CRI",
    "CRA",
    "POUPANCA",
    "TESOURO_DIRETO",
    "US_TREASURY_BILL",
    "US_TREASURY_NOTE",
    "US_TREASURY_BOND",
    "US_TIPS",
    "US_I_BOND",
    "CD",
    "CORPORATE_BOND",
    "CASH_EQUIVALENT",
    "OTHER",
  ].includes(asset.assetClass);

async function pool<T>(items: T[], worker: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      while (next < items.length) {
        const item = items[next++] as T;
        await worker(item);
      }
    }),
  );
}

export type RefreshOutcome = { refreshed: number; skipped: number; failed: number };

/** Refreshes quotes whose market is open (or that have never been fetched). Weekends and closed markets are skipped. */
export async function refreshHeldQuotes(
  options: { force?: boolean; at?: Date } = {},
): Promise<RefreshOutcome> {
  const held = (await listHeldAssets()).filter((h) => quoted(h.asset));
  const outcome: RefreshOutcome = { refreshed: 0, skipped: 0, failed: 0 };
  await pool(held, async ({ householdId, asset }) => {
    if (!options.force && !isMarketOpen(asset.country, options.at)) {
      outcome.skipped += 1;
      return;
    }
    try {
      await marketDataService.refreshQuote(householdId, asset, true);
      outcome.refreshed += 1;
    } catch (err) {
      outcome.failed += 1;
      logger.debug({ err, symbol: asset.symbol }, "[investments] Quote refresh failed");
    }
  });
  return outcome;
}

export async function topUpHistory(): Promise<number> {
  const held = (await listHeldAssets()).filter((h) => quoted(h.asset));
  const today = todayIso();
  let done = 0;
  await pool(held, async ({ householdId, asset, firstTradeDate }) => {
    try {
      await marketDataService.ensureHistory(
        householdId,
        asset,
        addIsoDays(firstTradeDate, -7),
        today,
      );
      done += 1;
    } catch (err) {
      logger.debug({ err, symbol: asset.symbol }, "[investments] History top-up failed");
    }
  });
  return done;
}

export async function syncMacro(): Promise<number> {
  const today = todayIso();
  const from = addIsoDays(today, -365 * 15);
  let total = 0;
  for (const series of MACRO_SERIES) {
    try {
      total += await marketDataService.syncMacro(series, from, today);
    } catch (err) {
      // A series no provider serves yet (US CPI today) is not a failure worth a warning.
      if (err instanceof MarketDataRouteError && err.code === "NOT_FOUND") continue;
      logger.warn(
        { series, reason: err instanceof Error ? err.message : String(err) },
        "[investments] Macro sync incomplete, will resume on the next run",
      );
    }
  }
  if (total > 0) clearReferenceCaches();
  return total;
}

export async function syncTesouro(): Promise<number> {
  const rows = await db
    .select({
      id: assetsTable.id,
      title: assetFixedIncomeTermsTable.tesouroTitle,
      maturity: assetFixedIncomeTermsTable.maturityDate,
    })
    .from(assetFixedIncomeTermsTable)
    .innerJoin(assetsTable, eq(assetsTable.id, assetFixedIncomeTermsTable.assetId))
    .where(
      sql`${assetFixedIncomeTermsTable.tesouroTitle} is not null and ${assetFixedIncomeTermsTable.maturityDate} is not null`,
    );
  if (rows.length === 0) return 0;
  try {
    return await marketDataService.syncTreasuryPrices(
      rows.map((r) => ({
        id: r.id,
        tesouroTitle: r.title as string,
        maturityDate: r.maturity as string,
      })),
    );
  } catch (err) {
    logger.debug({ err }, "[investments] Tesouro sync failed");
    return 0;
  }
}

/** One value snapshot per investment account and day, in the account currency (cheap history reads). */
export async function snapshotAccounts(): Promise<number> {
  const households = await db
    .selectDistinct({ householdId: investmentEventsTable.householdId })
    .from(investmentEventsTable);
  const today = todayIso();
  let count = 0;
  for (const { householdId } of households) {
    const context = {
      householdId,
      userId: "",
      role: "owner",
      permissions: [],
    } as unknown as HouseholdContext;
    const base = await resolveScope(context);
    for (const account of base.accounts) {
      const scope = {
        ...(await resolveScope(context, { accountId: account.id })),
        reportingCurrency: account.currencyId,
      };
      const holdings = await computeHoldings(scope);
      await db
        .insert(portfolioSnapshotsTable)
        .values({
          accountId: account.id,
          snapshotDate: today,
          value: holdings.totalMarketValue.plus(holdings.cashReporting).toFixed(),
          invested: holdings.rows
            .reduce(
              (t, r) => t.plus(r.invested),
              holdings.totalMarketValue.minus(holdings.totalMarketValue),
            )
            .toFixed(),
          cash: holdings.cashReporting.toFixed(),
        })
        .onConflictDoUpdate({
          target: [portfolioSnapshotsTable.accountId, portfolioSnapshotsTable.snapshotDate],
          set: {
            value: holdings.totalMarketValue.plus(holdings.cashReporting).toFixed(),
            cash: holdings.cashReporting.toFixed(),
          },
        });
      count += 1;
    }
  }
  return count;
}

// ---------------------------------------------------------------- refresh on read

const inFlight = new Set<string>();
const lastKick = new Map<string, number>();
const KICK_COOLDOWN_MS = 30_000;

/**
 * Called when positions are read: quotes older than their market TTL are refreshed in the
 * background (never awaited by the request). Returns how many assets are being refreshed so the
 * client can show cached values now and refetch shortly after.
 */
export function refreshStaleInBackground(
  householdId: string,
  assets: AssetRecord[],
  quoteAsOf: (assetId: string) => Date | undefined,
  now = new Date(),
): number {
  let started = 0;
  for (const asset of assets) {
    if (!quoted(asset) || inFlight.has(asset.id)) continue;
    const asOf = quoteAsOf(asset.id);
    const open = isMarketOpen(asset.country, now);
    const ttlMs = open ? 60_000 : 6 * 60 * 60_000;
    if (asOf && now.getTime() - asOf.getTime() < ttlMs) continue;
    if (!open && asOf) continue; // closed market: the last close is as fresh as it gets
    if (now.getTime() - (lastKick.get(asset.id) ?? 0) < KICK_COOLDOWN_MS) continue;
    lastKick.set(asset.id, now.getTime());
    inFlight.add(asset.id);
    started += 1;
    void marketDataService
      .refreshQuote(householdId, asset, true)
      .catch((err) =>
        logger.debug({ err, symbol: asset.symbol }, "[investments] Background refresh failed"),
      )
      .finally(() => inFlight.delete(asset.id));
  }
  void started;
  return assets.filter((a) => inFlight.has(a.id)).length;
}

export function isRefreshing(assetIds: string[]): boolean {
  return assetIds.some((id) => inFlight.has(id));
}
