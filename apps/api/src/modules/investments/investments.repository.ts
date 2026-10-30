import { accountsTable } from "@luraba/db/schemas/accounts.schema";
import {
  allocationTargetsTable,
  assetFixedIncomeTermsTable,
  assetProviderSymbolsTable,
  assetsTable,
  darfPaymentsTable,
  householdAssetSettingsTable,
  investmentAccountSettingsTable,
  investmentEventsTable,
  investmentImportBatchesTable,
  investmentImportMappingsTable,
  investmentPortfoliosTable,
  investmentSettingsTable,
} from "@luraba/db/schemas/investments.schema";
import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import {
  type DbExecutor,
  HouseholdScopedRepository,
} from "@/shared/repositories/household-scoped.repository";
import type {
  AccountRecord,
  AccountSettingsRecord,
  AssetRecord,
  FixedIncomeTermsRecord,
  InvestmentAccountRecord,
  InvestmentEventRecord,
  InvestmentSettingsRecord,
  PortfolioRecord,
} from "./investments.types";

type PortfolioValues = Omit<
  typeof investmentPortfoliosTable.$inferInsert,
  "id" | "householdId" | "createdAt" | "updatedAt"
>;
type EventValues = Omit<
  typeof investmentEventsTable.$inferInsert,
  "id" | "householdId" | "createdAt" | "updatedAt"
>;

class PortfoliosRepository extends HouseholdScopedRepository<PortfolioRecord, PortfolioValues> {
  constructor() {
    super(investmentPortfoliosTable, { orderBy: investmentPortfoliosTable.name });
  }
}
export const portfoliosRepository = new PortfoliosRepository();

export type EventFilter = {
  accountIds?: string[];
  assetId?: string;
  type?: string;
  from?: string;
  to?: string;
  page?: number;
  perPage?: number;
};

function eventConditions(householdId: string, filter: EventFilter) {
  const conditions = [eq(investmentEventsTable.householdId, householdId)];
  if (filter.accountIds)
    conditions.push(inArray(investmentEventsTable.accountId, filter.accountIds));
  if (filter.assetId) conditions.push(eq(investmentEventsTable.assetId, filter.assetId));
  if (filter.type) conditions.push(eq(investmentEventsTable.type, filter.type));
  if (filter.from) conditions.push(gte(investmentEventsTable.tradeDate, filter.from));
  if (filter.to) conditions.push(lte(investmentEventsTable.tradeDate, filter.to));
  return and(...conditions);
}

class EventsRepository extends HouseholdScopedRepository<InvestmentEventRecord, EventValues> {
  constructor() {
    super(investmentEventsTable);
  }

  /** Every event of the given accounts in ledger order (date, then creation), for the engine. */
  async listForEngine(
    context: HouseholdContext,
    accountIds: string[],
    executor: DbExecutor = db,
  ): Promise<InvestmentEventRecord[]> {
    if (accountIds.length === 0) return [];
    return executor
      .select()
      .from(investmentEventsTable)
      .where(eventConditions(context.householdId, { accountIds }))
      .orderBy(
        asc(investmentEventsTable.tradeDate),
        asc(investmentEventsTable.createdAt),
        asc(investmentEventsTable.id),
      );
  }

  async listPage(context: HouseholdContext, filter: EventFilter) {
    const where = eventConditions(context.householdId, filter);
    const perPage = filter.perPage ?? 50;
    const page = filter.page ?? 1;
    const [count, rows] = await Promise.all([
      db.select({ count: sql<number>`count(*)::integer` }).from(investmentEventsTable).where(where),
      db
        .select()
        .from(investmentEventsTable)
        .where(where)
        .orderBy(desc(investmentEventsTable.tradeDate), desc(investmentEventsTable.createdAt))
        .limit(perPage)
        .offset((page - 1) * perPage),
    ]);
    return { rows, totalCount: count[0]?.count ?? 0 };
  }

  async findByExternalIds(
    context: HouseholdContext,
    accountId: string,
    externalIds: string[],
  ): Promise<Set<string>> {
    if (externalIds.length === 0) return new Set();
    const rows = await db
      .select({ externalId: investmentEventsTable.externalId })
      .from(investmentEventsTable)
      .where(
        and(
          eq(investmentEventsTable.householdId, context.householdId),
          eq(investmentEventsTable.accountId, accountId),
          inArray(investmentEventsTable.externalId, externalIds),
        ),
      );
    return new Set(rows.map((row) => row.externalId as string));
  }

  async findByHashes(
    context: HouseholdContext,
    accountId: string,
    hashes: string[],
  ): Promise<Set<string>> {
    if (hashes.length === 0) return new Set();
    const rows = await db
      .select({ hash: investmentEventsTable.dedupHash })
      .from(investmentEventsTable)
      .where(
        and(
          eq(investmentEventsTable.householdId, context.householdId),
          eq(investmentEventsTable.accountId, accountId),
          inArray(investmentEventsTable.dedupHash, hashes),
        ),
      );
    return new Set(rows.map((row) => row.hash as string));
  }

  async assetIdsHeld(context: HouseholdContext, accountIds: string[]): Promise<string[]> {
    if (accountIds.length === 0) return [];
    const rows = await db
      .selectDistinct({ assetId: investmentEventsTable.assetId })
      .from(investmentEventsTable)
      .where(
        and(
          eq(investmentEventsTable.householdId, context.householdId),
          inArray(investmentEventsTable.accountId, accountIds),
        ),
      );
    return rows.map((row) => row.assetId).filter((id): id is string => id !== null);
  }
}
export const eventsRepository = new EventsRepository();

// ---------------------------------------------------------------- settings & accounts

export async function getOrCreateSettings(
  context: HouseholdContext,
  defaultCurrency: string,
): Promise<InvestmentSettingsRecord> {
  const [existing] = await db
    .select()
    .from(investmentSettingsTable)
    .where(eq(investmentSettingsTable.householdId, context.householdId));
  if (existing) return existing;
  const [created] = await db
    .insert(investmentSettingsTable)
    .values({ householdId: context.householdId, reportingCurrencyId: defaultCurrency })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  const [row] = await db
    .select()
    .from(investmentSettingsTable)
    .where(eq(investmentSettingsTable.householdId, context.householdId));
  return row as InvestmentSettingsRecord;
}

export async function updateSettings(
  context: HouseholdContext,
  values: Partial<typeof investmentSettingsTable.$inferInsert>,
): Promise<void> {
  await db
    .update(investmentSettingsTable)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(investmentSettingsTable.householdId, context.householdId));
}

/** Investment accounts of the household with their settings; accounts without settings get defaults. */
export async function listInvestmentAccounts(
  context: HouseholdContext,
  defaults: { costBasisMethod: string; taxProfile: string },
  ids?: string[],
): Promise<InvestmentAccountRecord[]> {
  const conditions = [
    eq(accountsTable.householdId, context.householdId),
    eq(accountsTable.type, "investment"),
  ];
  if (ids) conditions.push(inArray(accountsTable.id, ids));
  const rows = await db
    .select({ account: accountsTable, settings: investmentAccountSettingsTable })
    .from(accountsTable)
    .leftJoin(
      investmentAccountSettingsTable,
      eq(investmentAccountSettingsTable.accountId, accountsTable.id),
    )
    .where(and(...conditions))
    .orderBy(asc(accountsTable.name));

  const missing = rows.filter((row) => !row.settings).map((row) => row.account.id);
  if (missing.length > 0) {
    await db
      .insert(investmentAccountSettingsTable)
      .values(
        missing.map((accountId) => ({
          accountId,
          costBasisMethod: defaults.costBasisMethod,
          taxProfile: defaults.taxProfile,
        })),
      )
      .onConflictDoNothing();
  }
  const settingsById = new Map<string, AccountSettingsRecord>();
  if (missing.length > 0) {
    const created = await db
      .select()
      .from(investmentAccountSettingsTable)
      .where(inArray(investmentAccountSettingsTable.accountId, missing));
    for (const row of created) settingsById.set(row.accountId, row);
  }
  return rows.map((row) => ({
    ...row.account,
    settings: (row.settings ?? settingsById.get(row.account.id)) as AccountSettingsRecord,
  }));
}

export async function upsertAccountSettings(
  accountId: string,
  values: Partial<typeof investmentAccountSettingsTable.$inferInsert>,
  executor: DbExecutor = db,
): Promise<void> {
  await executor
    .insert(investmentAccountSettingsTable)
    .values({ accountId, ...values })
    .onConflictDoUpdate({
      target: investmentAccountSettingsTable.accountId,
      set: { ...values, updatedAt: new Date() },
    });
}

export async function portfolioAccountIds(
  context: HouseholdContext,
  portfolioId?: string,
): Promise<Map<string, string[]>> {
  const rows = await db
    .select({
      accountId: investmentAccountSettingsTable.accountId,
      portfolioId: investmentAccountSettingsTable.portfolioId,
    })
    .from(investmentAccountSettingsTable)
    .innerJoin(accountsTable, eq(accountsTable.id, investmentAccountSettingsTable.accountId))
    .where(
      and(
        eq(accountsTable.householdId, context.householdId),
        portfolioId ? eq(investmentAccountSettingsTable.portfolioId, portfolioId) : sql`true`,
      ),
    );
  const result = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.portfolioId) continue;
    result.set(row.portfolioId, [...(result.get(row.portfolioId) ?? []), row.accountId]);
  }
  return result;
}

// ---------------------------------------------------------------- assets

export type AssetValues = Omit<typeof assetsTable.$inferInsert, "id" | "createdAt" | "updatedAt">;

/** Global catalog rows plus the household's own custom assets. */
function visibleTo(householdId: string) {
  return or(isNull(assetsTable.householdId), eq(assetsTable.householdId, householdId));
}

export async function findAsset(
  context: HouseholdContext,
  id: string,
): Promise<AssetRecord | undefined> {
  const [row] = await db
    .select()
    .from(assetsTable)
    .where(and(eq(assetsTable.id, id), visibleTo(context.householdId)));
  return row;
}

export async function findAssets(context: HouseholdContext, ids: string[]): Promise<AssetRecord[]> {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(assetsTable)
    .where(and(inArray(assetsTable.id, ids), visibleTo(context.householdId)));
}

export async function findAssetBySymbol(
  context: HouseholdContext,
  symbol: string,
  exchange?: string | null,
): Promise<AssetRecord | undefined> {
  const rows = await db
    .select()
    .from(assetsTable)
    .where(and(eq(assetsTable.symbol, symbol.toUpperCase()), visibleTo(context.householdId)))
    .orderBy(sql`(${assetsTable.householdId} is null)`);
  return rows.find((row) => !exchange || row.exchange === exchange) ?? rows[0];
}

export async function searchAssets(
  context: HouseholdContext,
  input: { search?: string; assetClass?: string; ids?: string[]; limit: number },
): Promise<AssetRecord[]> {
  const conditions = [visibleTo(context.householdId)];
  if (input.search)
    conditions.push(
      or(
        ilike(assetsTable.symbol, `${input.search}%`),
        ilike(assetsTable.name, `%${input.search}%`),
      ),
    );
  if (input.assetClass) conditions.push(eq(assetsTable.assetClass, input.assetClass));
  if (input.ids) conditions.push(inArray(assetsTable.id, input.ids));
  return db
    .select()
    .from(assetsTable)
    .where(and(...conditions))
    .orderBy(asc(assetsTable.symbol))
    .limit(input.limit);
}

export async function insertAsset(
  values: AssetValues,
  executor: DbExecutor = db,
): Promise<AssetRecord> {
  const [row] = await executor.insert(assetsTable).values(values).returning();
  return row as AssetRecord;
}

export async function updateAssetRow(
  id: string,
  values: Partial<AssetValues>,
): Promise<AssetRecord | undefined> {
  const [row] = await db
    .update(assetsTable)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(assetsTable.id, id))
    .returning();
  return row;
}

export async function replaceProviderSymbols(
  assetId: string,
  symbols: Record<string, string>,
  executor: DbExecutor = db,
): Promise<void> {
  for (const [provider, providerSymbol] of Object.entries(symbols)) {
    await executor
      .insert(assetProviderSymbolsTable)
      .values({ assetId, provider, providerSymbol })
      .onConflictDoUpdate({
        target: [assetProviderSymbolsTable.assetId, assetProviderSymbolsTable.provider],
        set: { providerSymbol },
      });
  }
}

export async function getFixedIncomeTerms(
  assetIds: string[],
): Promise<Map<string, FixedIncomeTermsRecord>> {
  if (assetIds.length === 0) return new Map();
  const rows = await db
    .select()
    .from(assetFixedIncomeTermsTable)
    .where(inArray(assetFixedIncomeTermsTable.assetId, assetIds));
  return new Map(rows.map((row) => [row.assetId, row]));
}

export async function upsertFixedIncomeTerms(
  assetId: string,
  values: Omit<typeof assetFixedIncomeTermsTable.$inferInsert, "assetId">,
  executor: DbExecutor = db,
): Promise<void> {
  await executor
    .insert(assetFixedIncomeTermsTable)
    .values({ assetId, ...values })
    .onConflictDoUpdate({ target: assetFixedIncomeTermsTable.assetId, set: values });
}

export async function getHouseholdAssetSettings(context: HouseholdContext, assetIds?: string[]) {
  const conditions = [eq(householdAssetSettingsTable.householdId, context.householdId)];
  if (assetIds) conditions.push(inArray(householdAssetSettingsTable.assetId, assetIds));
  const rows = await db
    .select()
    .from(householdAssetSettingsTable)
    .where(and(...conditions));
  return new Map(rows.map((row) => [row.assetId, row]));
}

export async function upsertHouseholdAssetSettings(
  context: HouseholdContext,
  assetId: string,
  values: { sector?: string | null; industry?: string | null; tags?: string[] },
): Promise<void> {
  await db
    .insert(householdAssetSettingsTable)
    .values({ householdId: context.householdId, assetId, ...values })
    .onConflictDoUpdate({
      target: [householdAssetSettingsTable.householdId, householdAssetSettingsTable.assetId],
      set: values,
    });
}

// ---------------------------------------------------------------- targets & darf

export async function listTargets(
  context: HouseholdContext,
  portfolioId: string,
  dimension?: string,
) {
  const conditions = [
    eq(allocationTargetsTable.householdId, context.householdId),
    eq(allocationTargetsTable.portfolioId, portfolioId),
  ];
  if (dimension) conditions.push(eq(allocationTargetsTable.dimension, dimension));
  return db
    .select()
    .from(allocationTargetsTable)
    .where(and(...conditions));
}

export async function replaceTargets(
  context: HouseholdContext,
  portfolioId: string,
  dimension: string,
  targets: { key: string; percent: string }[],
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .delete(allocationTargetsTable)
      .where(
        and(
          eq(allocationTargetsTable.householdId, context.householdId),
          eq(allocationTargetsTable.portfolioId, portfolioId),
          eq(allocationTargetsTable.dimension, dimension),
        ),
      );
    if (targets.length > 0) {
      await tx.insert(allocationTargetsTable).values(
        targets.map((t) => ({
          householdId: context.householdId,
          portfolioId,
          dimension,
          key: t.key,
          targetPercent: t.percent,
        })),
      );
    }
  });
}

export async function listDarfPayments(
  context: HouseholdContext,
  accountIds: string[],
  yearPrefix: string,
) {
  if (accountIds.length === 0) return [];
  return db
    .select()
    .from(darfPaymentsTable)
    .where(
      and(
        eq(darfPaymentsTable.householdId, context.householdId),
        inArray(darfPaymentsTable.accountId, accountIds),
        sql`${darfPaymentsTable.month} like ${`${yearPrefix}-%`}`,
      ),
    );
}

export async function insertDarfPayment(
  values: typeof darfPaymentsTable.$inferInsert,
  executor: DbExecutor = db,
) {
  const [row] = await executor
    .insert(darfPaymentsTable)
    .values(values)
    .onConflictDoUpdate({
      target: [darfPaymentsTable.accountId, darfPaymentsTable.month, darfPaymentsTable.bucket],
      set: { amount: values.amount, paidDate: values.paidDate, eventId: values.eventId },
    })
    .returning();
  return row;
}

export type { AccountRecord };

export async function findAccount(
  context: HouseholdContext,
  id: string,
): Promise<AccountRecord | undefined> {
  const [row] = await db
    .select()
    .from(accountsTable)
    .where(and(eq(accountsTable.id, id), eq(accountsTable.householdId, context.householdId)));
  return row;
}

/** Benchmark index assets (e.g. ^BVSP) live in the global catalog. */
export async function findBenchmarkAsset(symbol: string): Promise<AssetRecord | undefined> {
  const [row] = await db
    .select()
    .from(assetsTable)
    .where(and(eq(assetsTable.symbol, symbol), isNull(assetsTable.householdId)));
  return row;
}

/** Symbols to assets for imports: the household's own asset wins, then the global catalog entry (BR first for B3 files). */
export async function findAssetsBySymbols(
  context: HouseholdContext,
  symbols: string[],
  preferCountry?: string,
): Promise<Map<string, AssetRecord>> {
  if (symbols.length === 0) return new Map();
  const rows = await db
    .select()
    .from(assetsTable)
    .where(and(inArray(assetsTable.symbol, symbols), visibleTo(context.householdId)));
  const score = (asset: AssetRecord) =>
    (asset.householdId ? 0 : 2) + (preferCountry && asset.country === preferCountry ? 0 : 1);
  const result = new Map<string, AssetRecord>();
  for (const asset of rows) {
    const current = result.get(asset.symbol);
    if (!current || score(asset) < score(current)) result.set(asset.symbol, asset);
  }
  return result;
}

/** How many stored events of the account carry each dedup hash (identical trades on one day are legitimate). */
export async function dedupHashCounts(
  context: HouseholdContext,
  accountId: string,
  hashes: string[],
): Promise<Map<string, number>> {
  if (hashes.length === 0) return new Map();
  const rows = await db
    .select({ hash: investmentEventsTable.dedupHash, count: sql<number>`count(*)::integer` })
    .from(investmentEventsTable)
    .where(
      and(
        eq(investmentEventsTable.householdId, context.householdId),
        eq(investmentEventsTable.accountId, accountId),
        inArray(investmentEventsTable.dedupHash, hashes),
      ),
    )
    .groupBy(investmentEventsTable.dedupHash);
  return new Map(rows.map((r) => [r.hash as string, r.count]));
}

export async function insertImportBatch(values: typeof investmentImportBatchesTable.$inferInsert) {
  const [row] = await db.insert(investmentImportBatchesTable).values(values).returning();
  return row as typeof investmentImportBatchesTable.$inferSelect;
}

export async function getImportBatch(context: HouseholdContext, id: string) {
  const [row] = await db
    .select()
    .from(investmentImportBatchesTable)
    .where(
      and(
        eq(investmentImportBatchesTable.id, id),
        eq(investmentImportBatchesTable.householdId, context.householdId),
      ),
    );
  return row;
}

export async function markImportBatchCommitted(id: string): Promise<void> {
  await db
    .update(investmentImportBatchesTable)
    .set({ status: "committed", rows: [] })
    .where(eq(investmentImportBatchesTable.id, id));
}

export async function saveImportMapping(
  context: HouseholdContext,
  name: string,
  mapping: Record<string, string>,
): Promise<void> {
  await db
    .insert(investmentImportMappingsTable)
    .values({ householdId: context.householdId, name, mapping })
    .onConflictDoUpdate({
      target: [investmentImportMappingsTable.householdId, investmentImportMappingsTable.name],
      set: { mapping, updatedAt: new Date() },
    });
}

export async function getImportMapping(
  context: HouseholdContext,
  name: string,
): Promise<Record<string, string> | undefined> {
  const [row] = await db
    .select()
    .from(investmentImportMappingsTable)
    .where(
      and(
        eq(investmentImportMappingsTable.householdId, context.householdId),
        eq(investmentImportMappingsTable.name, name),
      ),
    );
  return row?.mapping;
}
