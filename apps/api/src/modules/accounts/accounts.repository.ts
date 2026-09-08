import type { AccountSubtype } from "@luraba/contracts/accounts";
import { now } from "@luraba/domain";
import { and, eq, sql } from "drizzle-orm";
import { unionAll } from "drizzle-orm/pg-core";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import {
  cashAccountProfilesTable,
  cryptoAccountProfilesTable,
  investmentAccountProfilesTable,
  loanAccountProfilesTable,
  otherAssetAccountProfilesTable,
  otherLiabilityAccountProfilesTable,
  propertyAccountProfilesTable,
  vehicleAccountProfilesTable,
} from "@/db/schemas/account-profiles.schema";
import { accountsTable } from "@/db/schemas/accounts.schema";
import type { TxClient } from "@/db/types";
import { buildAccountBalanceSubquery } from "@/modules/ledger-accounts/ledger-accounts.repository";
import { type DbListPage, getPagination } from "@/shared/list";
import { HouseholdScopedRepository } from "@/shared/repositories/household-scoped.repository";
import {
  buildAccountsListOrder,
  buildAccountsListWhere,
  type ListAccountsQuery,
} from "./accounts.query";
import type { AccountRecord } from "./accounts.types";

type CreateAccountValues = Omit<
  typeof accountsTable.$inferInsert,
  "id" | "householdId" | "createdAt" | "updatedAt"
>;
type AccountDetailsRecord = AccountRecord & { balance: number; subtype: AccountSubtype };

function buildAccountProfileSummarySubquery() {
  return unionAll(
    db
      .select({
        accountId: cashAccountProfilesTable.accountId,
        subtype: sql<AccountSubtype>`${cashAccountProfilesTable.subtype}::text`.as("subtype"),
        searchText: sql<string>`${cashAccountProfilesTable.subtype}::text`.as("search_text"),
      })
      .from(cashAccountProfilesTable),
    db
      .select({
        accountId: investmentAccountProfilesTable.accountId,
        subtype: sql<AccountSubtype>`${investmentAccountProfilesTable.subtype}::text`.as("subtype"),
        searchText: sql<string>`${investmentAccountProfilesTable.subtype}::text`.as("search_text"),
      })
      .from(investmentAccountProfilesTable),
    db
      .select({
        accountId: cryptoAccountProfilesTable.accountId,
        subtype: sql<AccountSubtype>`${cryptoAccountProfilesTable.subtype}::text`.as("subtype"),
        searchText:
          sql<string>`concat_ws(' ', ${cryptoAccountProfilesTable.subtype}, ${cryptoAccountProfilesTable.walletAddress}, ${cryptoAccountProfilesTable.network})`.as(
            "search_text",
          ),
      })
      .from(cryptoAccountProfilesTable),
    db
      .select({
        accountId: propertyAccountProfilesTable.accountId,
        subtype: sql<AccountSubtype>`${propertyAccountProfilesTable.subtype}::text`.as("subtype"),
        searchText:
          sql<string>`concat_ws(' ', ${propertyAccountProfilesTable.subtype}, ${propertyAccountProfilesTable.addressLine1}, ${propertyAccountProfilesTable.addressLine2}, ${propertyAccountProfilesTable.city}, ${propertyAccountProfilesTable.region}, ${propertyAccountProfilesTable.postalCode}, ${propertyAccountProfilesTable.countryCode}, ${propertyAccountProfilesTable.yearBuilt})`.as(
            "search_text",
          ),
      })
      .from(propertyAccountProfilesTable),
    db
      .select({
        accountId: vehicleAccountProfilesTable.accountId,
        subtype: sql<AccountSubtype>`${vehicleAccountProfilesTable.subtype}::text`.as("subtype"),
        searchText:
          sql<string>`concat_ws(' ', ${vehicleAccountProfilesTable.subtype}, ${vehicleAccountProfilesTable.make}, ${vehicleAccountProfilesTable.model}, ${vehicleAccountProfilesTable.year}, ${vehicleAccountProfilesTable.trim}, ${vehicleAccountProfilesTable.vin}, ${vehicleAccountProfilesTable.licensePlate})`.as(
            "search_text",
          ),
      })
      .from(vehicleAccountProfilesTable),
    db
      .select({
        accountId: loanAccountProfilesTable.accountId,
        subtype: sql<AccountSubtype>`${loanAccountProfilesTable.subtype}::text`.as("subtype"),
        searchText:
          sql<string>`concat_ws(' ', ${loanAccountProfilesTable.subtype}, ${loanAccountProfilesTable.interestRateType}, ${loanAccountProfilesTable.paymentFrequency})`.as(
            "search_text",
          ),
      })
      .from(loanAccountProfilesTable),
    db
      .select({
        accountId: otherAssetAccountProfilesTable.accountId,
        subtype: sql<AccountSubtype>`${otherAssetAccountProfilesTable.subtype}::text`.as("subtype"),
        searchText: sql<string>`${otherAssetAccountProfilesTable.subtype}::text`.as("search_text"),
      })
      .from(otherAssetAccountProfilesTable),
    db
      .select({
        accountId: otherLiabilityAccountProfilesTable.accountId,
        subtype: sql<AccountSubtype>`${otherLiabilityAccountProfilesTable.subtype}::text`.as(
          "subtype",
        ),
        searchText: sql<string>`${otherLiabilityAccountProfilesTable.subtype}::text`.as(
          "search_text",
        ),
      })
      .from(otherLiabilityAccountProfilesTable),
  ).as("account_profile_summaries");
}

class AccountRepository extends HouseholdScopedRepository<AccountRecord> {
  constructor() {
    super(accountsTable, { orderBy: accountsTable.name });
  }

  async findByHouseholdAndName(
    context: HouseholdContext,
    name: string,
  ): Promise<AccountRecord | undefined> {
    const rows = await db
      .select()
      .from(accountsTable)
      .where(and(eq(accountsTable.householdId, context.householdId), eq(accountsTable.name, name)));
    return rows[0];
  }

  async listPage(
    context: HouseholdContext,
    query: ListAccountsQuery,
  ): Promise<DbListPage<AccountDetailsRecord>> {
    const accountBalances = buildAccountBalanceSubquery();
    const accountProfiles = buildAccountProfileSummarySubquery();
    const rawBalance = sql<number>`coalesce(${accountBalances.balance}, 0)::integer`;
    const displayedBalance = sql<number>`case when ${accountsTable.classification} = 'asset' then ${rawBalance} else -${rawBalance} end`;
    const where = buildAccountsListWhere(
      context.householdId,
      query,
      displayedBalance,
      sql`${accountProfiles.subtype}`,
      sql`${accountProfiles.searchText}`,
    );
    const orderBy = buildAccountsListOrder(
      query,
      displayedBalance,
      sql`${accountProfiles.subtype}`,
    );
    const { limit, offset } = getPagination(query);
    const [countRow, rows] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::integer` })
        .from(accountsTable)
        .leftJoin(accountBalances, eq(accountBalances.accountId, accountsTable.id))
        .innerJoin(accountProfiles, eq(accountProfiles.accountId, accountsTable.id))
        .where(where),
      db
        .select({
          id: accountsTable.id,
          householdId: accountsTable.householdId,
          name: accountsTable.name,
          institutionName: accountsTable.institutionName,
          institutionDomain: accountsTable.institutionDomain,
          institutionLogoUrl: accountsTable.institutionLogoUrl,
          notes: accountsTable.notes,
          classification: accountsTable.classification,
          type: accountsTable.type,
          currencyId: accountsTable.currencyId,
          createdAt: accountsTable.createdAt,
          updatedAt: accountsTable.updatedAt,
          balance: rawBalance,
          subtype: accountProfiles.subtype,
        })
        .from(accountsTable)
        .leftJoin(accountBalances, eq(accountBalances.accountId, accountsTable.id))
        .innerJoin(accountProfiles, eq(accountProfiles.accountId, accountsTable.id))
        .where(where)
        .orderBy(...orderBy)
        .limit(limit)
        .offset(offset),
    ]);

    return {
      rows,
      totalCount: countRow[0]?.count ?? 0,
    };
  }

  async createInTransaction(
    tx: TxClient,
    context: HouseholdContext,
    values: CreateAccountValues,
  ): Promise<AccountRecord> {
    const timestamp = now();
    const rows = await tx
      .insert(accountsTable)
      .values({
        ...values,
        householdId: context.householdId,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .returning();

    return rows[0];
  }

  async deleteInTransaction(
    tx: TxClient,
    context: HouseholdContext,
    accountId: string,
  ): Promise<AccountRecord | undefined> {
    const rows = await tx
      .delete(accountsTable)
      .where(
        and(eq(accountsTable.id, accountId), eq(accountsTable.householdId, context.householdId)),
      )
      .returning();

    return rows[0];
  }

  async updateInTransaction(
    tx: TxClient,
    context: HouseholdContext,
    accountId: string,
    values: Partial<CreateAccountValues>,
  ): Promise<AccountRecord | undefined> {
    const rows = await tx
      .update(accountsTable)
      .set({
        ...values,
        updatedAt: now(),
      })
      .where(
        and(eq(accountsTable.id, accountId), eq(accountsTable.householdId, context.householdId)),
      )
      .returning();

    return rows[0];
  }
}

export const accountsRepository = new AccountRepository();
