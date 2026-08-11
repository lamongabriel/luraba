import { accountsTable } from '@/db/schemas/accounts.schema';
import type { creditCardBillingCyclesTable } from '@/db/schemas/credit-card-billing-cycles.schema';
import { creditCardsTable } from '@/db/schemas/credit-cards.schema';
import { formatISODate } from '@/shared/lib/date';
import type { BaseCreditCardCycleSummary, CreditCardCycleItem } from './credit-cards.types';

export type CreditCardRow = {
  id: string;
  accountId: string;
  name: string;
  institutionName: string | null;
  institutionDomain: string | null;
  institutionLogoUrl: string | null;
  notes: string | null;
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
  accountId: string;
  name: string;
  institutionName: string | null;
  institutionDomain: string | null;
  institutionLogoUrl: string | null;
  notes: string | null;
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
  accountId: creditCardsTable.accountId,
  name: accountsTable.name,
  institutionName: accountsTable.institutionName,
  institutionDomain: accountsTable.institutionDomain,
  institutionLogoUrl: accountsTable.institutionLogoUrl,
  notes: accountsTable.notes,
  classification: accountsTable.classification,
  type: accountsTable.type,
  currencyCode: accountsTable.currencyId,
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
    ...row,
    classification: 'liability',
    type: 'credit_card',
    institutionName: row.institutionName ?? null,
    institutionDomain: row.institutionDomain ?? null,
    institutionLogoUrl: row.institutionLogoUrl ?? null,
    notes: row.notes ?? null,
    color: row.color ?? null,
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
