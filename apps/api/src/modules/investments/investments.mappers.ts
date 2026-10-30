import type { InvestmentEvent } from "@luraba/contracts/investments";
import { d, type EventMeta, formatISODateTime, type LedgerEvent } from "@luraba/domain";
import type { AssetRecord, InvestmentEventRecord } from "./investments.types";

export function toLedgerEvent(record: InvestmentEventRecord, accountCurrency: string): LedgerEvent {
  const sameCurrency = record.currencyId === accountCurrency;
  return {
    id: record.id,
    type: record.type as LedgerEvent["type"],
    assetId: record.assetId,
    tradeDate: record.tradeDate,
    quantity: record.quantity,
    unitPrice: record.unitPrice,
    grossAmount: record.grossAmount,
    fees: record.fees,
    taxesWithheld: record.taxesWithheld,
    netAmount: record.netAmount,
    currency: record.currencyId,
    fxRateToBase: record.fxRateToAccountBase ?? (sameCurrency ? "1" : null),
    meta: (record.meta ?? null) as EventMeta | null,
  };
}

/** Plain decimal text without trailing zeros (`1005.000000000000` -> `1005`). */
export function trimDecimal(value: string | null): string | null {
  return value === null ? null : d(value).toFixed();
}

export function toEventResource(
  record: InvestmentEventRecord,
  asset?: Pick<AssetRecord, "symbol" | "name">,
): InvestmentEvent {
  return {
    id: record.id,
    accountId: record.accountId,
    assetId: record.assetId,
    assetSymbol: asset?.symbol ?? null,
    assetName: asset?.name ?? null,
    type: record.type as InvestmentEvent["type"],
    tradeDate: record.tradeDate,
    settlementDate: record.settlementDate,
    quantity: trimDecimal(record.quantity),
    unitPrice: trimDecimal(record.unitPrice),
    grossAmount: d(record.grossAmount).toFixed(),
    fees: d(record.fees).toFixed(),
    taxesWithheld: d(record.taxesWithheld).toFixed(),
    netAmount: d(record.netAmount).toFixed(),
    currencyCode: record.currencyId,
    fxRateToAccountBase: trimDecimal(record.fxRateToAccountBase),
    notes: record.notes,
    source: record.source,
    externalId: record.externalId,
    relatedEventId: record.relatedEventId,
    transactionId: record.transactionId,
    meta: (record.meta ?? {}) as Record<string, unknown>,
    createdByUserId: record.createdByUserId,
    createdAt: formatISODateTime(record.createdAt),
  };
}
