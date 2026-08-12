import { aliasedTable, sql } from 'drizzle-orm';
import { accountsTable } from '@/db/schemas/accounts.schema';
import type { creditCardBillingCyclesTable } from '@/db/schemas/credit-card-billing-cycles.schema';
import { creditCardsTable } from '@/db/schemas/credit-cards.schema';
import { formatISODate } from '@/shared/lib/date';
import type { BaseCreditCardCycleSummary, CreditCardCycleItem } from './credit-cards.types';

export const creditCardLedgerAccountsTable = aliasedTable(accountsTable, 'credit_card_ledgers');
export const creditCardOwnerAccountsTable = aliasedTable(accountsTable, 'credit_card_owners');

export type CreditCardRow = {
  id: string;
  ownerAccountId: string;
  ledgerAccountId: string;
  name: string;
  institutionName: string | null;
  institutionDomain: string | null;
  institutionLogoUrl: string | null;
  notes: string | null;
  ownerAccount: {
    id: string;
    name: string;
    institutionName: string | null;
    institutionLogoUrl: string | null;
    type: 'cash';
    classification: 'asset';
    currencyCode: string;
  };
  classification: 'liability';
  type: 'credit_card';
  currencyCode: string;
  brand: string;
  productType: 'credit';
  last4: string;
  color: string | null;
  closingDay: number;
  dueDay: number;
  creditLimitAmount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CreditCardSelectRow = {
  id: string;
  ownerAccountId: string;
  ledgerAccountId: string;
  name: string;
  institutionName: string | null;
  institutionDomain: string | null;
  institutionLogoUrl: string | null;
  notes: string | null;
  ownerAccountName: string;
  ownerAccountInstitutionName: string | null;
  ownerAccountInstitutionLogoUrl: string | null;
  ownerAccountType: 'cash';
  ownerAccountClassification: 'asset';
  ownerAccountCurrencyCode: string;
  classification: 'liability';
  type: 'credit_card';
  currencyCode: string;
  brand: string;
  productType: 'credit';
  last4: string;
  color: string | null;
  closingDay: number;
  dueDay: number;
  creditLimitAmount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CreditCardCycleItemRow = {
  installmentId: string;
  purchaseId: string;
  transactionId: string;
  description: string;
  categoryId: string | null;
  merchantId: string | null;
  installmentNumber: number;
  installmentCount: number;
  amount: number;
  purchaseDate: Date;
  postedDate: Date;
};

export const creditCardSelect = {
  id: creditCardsTable.id,
  ownerAccountId: creditCardsTable.ownerAccountId,
  ledgerAccountId: creditCardsTable.ledgerAccountId,
  name: creditCardsTable.name,
  institutionName: creditCardsTable.institutionName,
  institutionDomain: creditCardsTable.institutionDomain,
  institutionLogoUrl: creditCardsTable.institutionLogoUrl,
  notes: creditCardsTable.notes,
  ownerAccountName: sql<string>`${creditCardOwnerAccountsTable.name}`.as('owner_account_name'),
  ownerAccountInstitutionName: sql<
    string | null
  >`${creditCardOwnerAccountsTable.institutionName}`.as('owner_account_institution_name'),
  ownerAccountInstitutionLogoUrl: sql<
    string | null
  >`${creditCardOwnerAccountsTable.institutionLogoUrl}`.as('owner_account_institution_logo_url'),
  ownerAccountType: sql<'cash'>`${creditCardOwnerAccountsTable.type}`.as('owner_account_type'),
  ownerAccountClassification: sql<'asset'>`${creditCardOwnerAccountsTable.classification}`.as(
    'owner_account_classification',
  ),
  ownerAccountCurrencyCode: sql<string>`${creditCardOwnerAccountsTable.currencyId}`.as(
    'owner_account_currency_code',
  ),
  classification: sql<'liability'>`${creditCardLedgerAccountsTable.classification}`.as(
    'classification',
  ),
  type: sql<'credit_card'>`${creditCardLedgerAccountsTable.type}`.as('type'),
  currencyCode: sql<string>`${creditCardOwnerAccountsTable.currencyId}`.as('currency_code'),
  brand: creditCardsTable.brand,
  productType: creditCardsTable.productType,
  last4: creditCardsTable.last4,
  color: creditCardsTable.color,
  closingDay: creditCardsTable.closingDay,
  dueDay: creditCardsTable.dueDay,
  creditLimitAmount: creditCardsTable.creditLimitAmount,
  createdAt: creditCardsTable.createdAt,
  updatedAt: creditCardsTable.updatedAt,
} as const;

export function splitInstallmentAmounts(totalAmount: number, installmentCount: number): number[] {
  const baseAmount = Math.floor(totalAmount / installmentCount);
  const remainder = totalAmount - baseAmount * installmentCount;
  return Array.from({ length: installmentCount }, (_value, index) =>
    index === installmentCount - 1 ? baseAmount + remainder : baseAmount,
  );
}

export function toCreditCardRow(row: CreditCardSelectRow): CreditCardRow {
  return {
    id: row.id,
    ownerAccountId: row.ownerAccountId,
    ledgerAccountId: row.ledgerAccountId,
    name: row.name,
    institutionName: row.institutionName ?? null,
    institutionDomain: row.institutionDomain ?? null,
    institutionLogoUrl: row.institutionLogoUrl ?? null,
    notes: row.notes ?? null,
    ownerAccount: {
      id: row.ownerAccountId,
      name: row.ownerAccountName,
      institutionName: row.ownerAccountInstitutionName ?? null,
      institutionLogoUrl: row.ownerAccountInstitutionLogoUrl ?? null,
      type: 'cash',
      classification: 'asset',
      currencyCode: row.ownerAccountCurrencyCode,
    },
    classification: 'liability',
    type: 'credit_card',
    currencyCode: row.ownerAccountCurrencyCode,
    brand: row.brand,
    productType: row.productType,
    last4: row.last4,
    color: row.color ?? null,
    closingDay: row.closingDay,
    dueDay: row.dueDay,
    creditLimitAmount: row.creditLimitAmount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapCycleRow(
  row: typeof creditCardBillingCyclesTable.$inferSelect,
): BaseCreditCardCycleSummary {
  return {
    id: row.id,
    creditCardId: row.creditCardId,
    periodStart: formatISODate(row.periodStart),
    periodEnd: formatISODate(row.periodEnd),
    closingDate: formatISODate(row.closingDate),
    dueDate: formatISODate(row.dueDate),
    status: row.status,
    statementAmount: row.statementAmount,
    paidAmount: row.paidAmount,
    remainingAmount: row.remainingAmount,
  };
}

export function mapCycleItemRow(row: CreditCardCycleItemRow): CreditCardCycleItem {
  return {
    installmentId: row.installmentId,
    purchaseId: row.purchaseId,
    transactionId: row.transactionId,
    description: row.description,
    categoryId: row.categoryId ?? null,
    merchantId: row.merchantId ?? null,
    installmentNumber: row.installmentNumber,
    installmentCount: row.installmentCount,
    amount: row.amount,
    purchaseDate: formatISODate(row.purchaseDate),
    postedDate: formatISODate(row.postedDate),
  };
}

export function mapCycleItems(rows: CreditCardCycleItemRow[]): CreditCardCycleItem[] {
  return rows.map((row) => mapCycleItemRow(row));
}

export function rangesOverlap(
  left: { periodStart: Date; periodEnd: Date },
  right: { periodStart: Date; periodEnd: Date },
): boolean {
  return left.periodStart <= right.periodEnd && right.periodStart <= left.periodEnd;
}
