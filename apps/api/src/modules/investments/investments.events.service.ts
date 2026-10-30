import { createHash } from "node:crypto";
import type {
  AccountCash,
  CashMovementInput,
  EventBodyInput,
  InvestmentEvent,
} from "@luraba/contracts/investments";
import { investmentEventsTable } from "@luraba/db/schemas/investments.schema";
import {
  CASH_EVENT_TYPES,
  type Dec,
  d,
  findOversell,
  INCOME_EVENT_TYPES,
  jcpWithholding,
  parseISODate,
  type TaxProfile,
  usDividendWithholding,
  ZERO,
} from "@luraba/domain";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import { createTransaction } from "@/modules/transactions/transactions.service";
import { NotFoundError, ValidationError } from "@/shared/errors";
import { accountTotalsInvalidate, requireInvestmentAccount } from "./investments.accounts.service";
import { FxConverter } from "./investments.fx";
import { loadTaxRules } from "./investments.macro";
import { toEventResource, toLedgerEvent } from "./investments.mappers";
import * as repo from "./investments.repository";
import type { InvestmentAccountRecord, InvestmentEventRecord } from "./investments.types";

type EventValues = typeof investmentEventsTable.$inferInsert;

const ASSET_EVENT_TYPES = new Set([
  "BUY",
  "SELL",
  "SUBSCRIPTION",
  "DIVIDEND",
  "JCP",
  "FII_INCOME",
  "COUPON",
  "BOND_INTEREST",
  "AMORTIZATION",
  "RETURN_OF_CAPITAL",
  "SPLIT",
  "REVERSE_SPLIT",
  "BONUS_SHARES",
  "SUBSCRIPTION_RIGHT_RECEIVED",
  "SPIN_OFF",
  "MERGER",
  "TICKER_CHANGE",
  "DELISTING",
  "FI_APPLICATION",
  "FI_REDEMPTION",
  "FI_MATURITY",
]);
const ACQUISITIONS = new Set(["BUY", "SUBSCRIPTION", "FI_APPLICATION"]);
const DISPOSALS = new Set(["SELL", "FI_REDEMPTION", "FI_MATURITY"]);

function hashOf(parts: (string | null | undefined)[]): string {
  return createHash("sha1")
    .update(parts.map((p) => p ?? "").join("|"))
    .digest("hex");
}

export function dedupHashOf(input: {
  tradeDate: string;
  assetId: string | null;
  type: string;
  quantity: string | null;
  unitPrice: string | null;
  grossAmount: string;
}): string {
  return hashOf([
    input.tradeDate,
    input.assetId,
    input.type,
    input.quantity ? d(input.quantity).toFixed() : null,
    input.unitPrice ? d(input.unitPrice).toFixed() : null,
    d(input.grossAmount).toFixed(),
  ]);
}

export async function loadAssetMap(context: HouseholdContext, ids: (string | null)[]) {
  const unique = [...new Set(ids.filter((id): id is string => id !== null))];
  const assets = await repo.findAssets(context, unique);
  return new Map(assets.map((asset) => [asset.id, asset]));
}

/** Builds the row to store from a request body: derives gross, tax withholding, FX and net. */
export async function buildEventValues(
  context: HouseholdContext,
  account: InvestmentAccountRecord,
  body: EventBodyInput,
  extra: {
    source?: string;
    externalId?: string | null;
    relatedEventId?: string | null;
    transactionId?: string | null;
  } = {},
  fx: FxConverter = new FxConverter(),
): Promise<EventValues> {
  const type = body.type;
  const isCash = CASH_EVENT_TYPES.includes(type);
  let assetCurrency: string | null = null;
  if (ASSET_EVENT_TYPES.has(type)) {
    if (!body.assetId) throw new ValidationError(`${type} requires an asset`);
    const asset = await repo.findAsset(context, body.assetId);
    if (!asset) throw new NotFoundError("Asset");
    assetCurrency = asset.currencyId;
  }
  const currency = body.currencyCode ?? assetCurrency ?? account.currencyId;
  const quantity = body.quantity ? d(body.quantity) : null;
  const unitPrice = body.unitPrice ? d(body.unitPrice) : null;
  if (ACQUISITIONS.has(type) || DISPOSALS.has(type)) {
    if (!quantity || quantity.lte(0))
      throw new ValidationError(`${type} requires a positive quantity`);
  }
  let gross =
    body.grossAmount !== undefined
      ? d(body.grossAmount)
      : quantity && unitPrice
        ? quantity.mul(unitPrice)
        : ZERO;
  if (isCash && gross.lte(0)) throw new ValidationError("Amount must be greater than zero");
  const fees = d(body.fees ?? "0");
  const profile = account.settings.taxProfile as TaxProfile;
  let taxes = body.taxesWithheld !== undefined ? d(body.taxesWithheld) : ZERO;
  if (
    body.taxesWithheld === undefined &&
    INCOME_EVENT_TYPES.includes(type) &&
    !body.meta?.skipCash
  ) {
    const rules = await loadTaxRules();
    if (type === "JCP" && profile === "BR_INDIVIDUAL")
      taxes = jcpWithholding(gross, body.tradeDate, rules).irrf;
    else if (profile === "US_NONRESIDENT" && currency === "USD" && type === "DIVIDEND")
      taxes = usDividendWithholding(gross, profile, body.tradeDate, rules).withheld;
  }
  if (gross.isZero() && unitPrice && quantity) gross = quantity.mul(unitPrice);

  let net: Dec;
  if (ACQUISITIONS.has(type)) net = gross.plus(fees);
  else if (DISPOSALS.has(type)) net = gross.minus(fees).minus(taxes);
  else if (
    INCOME_EVENT_TYPES.includes(type) ||
    type === "AMORTIZATION" ||
    type === "RETURN_OF_CAPITAL"
  )
    net = gross.minus(taxes);
  else if (type === "FEE" || type === "TAX_PAYMENT") net = gross.plus(fees);
  else net = gross;

  const fxRate =
    body.fxRateToAccountBase !== undefined && body.fxRateToAccountBase !== null
      ? d(body.fxRateToAccountBase)
      : currency === account.currencyId
        ? null
        : await fx.rateOrOne(currency, account.currencyId, body.tradeDate);

  const meta = { ...(body.meta ?? {}) } as Record<string, unknown>;
  if (INCOME_EVENT_TYPES.includes(type) && !account.settings.autoCreditIncome) meta.skipCash = true;

  const grossText = gross.toFixed();
  return {
    householdId: context.householdId,
    accountId: account.id,
    assetId: ASSET_EVENT_TYPES.has(type) ? (body.assetId ?? null) : null,
    type,
    tradeDate: body.tradeDate,
    settlementDate: body.settlementDate ?? null,
    quantity: quantity ? quantity.toFixed() : null,
    unitPrice: unitPrice ? unitPrice.toFixed() : null,
    grossAmount: grossText,
    fees: fees.toFixed(),
    taxesWithheld: taxes.toFixed(),
    netAmount: net.toFixed(),
    currencyId: currency,
    fxRateToAccountBase: fxRate ? fxRate.toFixed() : null,
    notes: body.notes ?? null,
    source: extra.source ?? "manual",
    externalId: extra.externalId ?? null,
    dedupHash: dedupHashOf({
      tradeDate: body.tradeDate,
      assetId: body.assetId ?? null,
      type,
      quantity: quantity?.toFixed() ?? null,
      unitPrice: unitPrice?.toFixed() ?? null,
      grossAmount: grossText,
    }),
    relatedEventId: extra.relatedEventId ?? null,
    transactionId: extra.transactionId ?? null,
    meta,
    createdByUserId: context.userId,
  };
}

/** Rejects a change that would leave any sale without enough shares, replaying the account's events. */
async function assertLedgerValid(
  context: HouseholdContext,
  account: InvestmentAccountRecord,
  mutate: (events: InvestmentEventRecord[]) => InvestmentEventRecord[],
): Promise<void> {
  const current = await repo.eventsRepository.listForEngine(context, [account.id]);
  const next = mutate(current);
  const issue = findOversell(
    next.map((event) => toLedgerEvent(event, account.currencyId)),
    {
      method: account.settings.costBasisMethod as "AVERAGE" | "FIFO" | "SPECIFIC_LOT",
      detectDayTrade: account.settings.taxProfile === "BR_INDIVIDUAL",
    },
  );
  if (issue) throw new ValidationError(issue.message);
}

function provisional(
  values: EventValues,
  id = "00000000-0000-0000-0000-000000000000",
): InvestmentEventRecord {
  const now = new Date();
  return {
    id,
    householdId: values.householdId,
    accountId: values.accountId,
    assetId: values.assetId ?? null,
    type: values.type,
    tradeDate: values.tradeDate,
    settlementDate: values.settlementDate ?? null,
    quantity: values.quantity ?? null,
    unitPrice: values.unitPrice ?? null,
    grossAmount: values.grossAmount ?? "0",
    fees: values.fees ?? "0",
    taxesWithheld: values.taxesWithheld ?? "0",
    netAmount: values.netAmount ?? "0",
    currencyId: values.currencyId,
    fxRateToAccountBase: values.fxRateToAccountBase ?? null,
    notes: values.notes ?? null,
    source: values.source ?? "manual",
    externalId: values.externalId ?? null,
    dedupHash: values.dedupHash ?? null,
    relatedEventId: values.relatedEventId ?? null,
    transactionId: values.transactionId ?? null,
    meta: (values.meta ?? {}) as Record<string, unknown>,
    createdByUserId: values.createdByUserId ?? null,
    createdAt: now,
    updatedAt: now,
  } as InvestmentEventRecord;
}

async function resource(
  context: HouseholdContext,
  record: InvestmentEventRecord,
): Promise<InvestmentEvent> {
  const assets = await loadAssetMap(context, [record.assetId]);
  return toEventResource(record, record.assetId ? assets.get(record.assetId) : undefined);
}

export async function createEvent(
  context: HouseholdContext,
  body: EventBodyInput,
): Promise<InvestmentEvent> {
  const account = await requireInvestmentAccount(context, body.accountId);
  const values = await buildEventValues(context, account, body);
  await assertLedgerValid(context, account, (events) => [...events, provisional(values)]);
  const [row] = await db.insert(investmentEventsTable).values(values).returning();
  accountTotalsInvalidate(account.id);
  return resource(context, row as InvestmentEventRecord);
}

export async function updateEvent(
  context: HouseholdContext,
  id: string,
  patch: Partial<EventBodyInput>,
): Promise<InvestmentEvent> {
  const existing = await repo.eventsRepository.get(id, context);
  if (!existing) throw new NotFoundError("Event");
  const account = await requireInvestmentAccount(context, patch.accountId ?? existing.accountId);
  const merged: EventBodyInput = {
    accountId: account.id,
    assetId: existing.assetId,
    type: existing.type as EventBodyInput["type"],
    tradeDate: existing.tradeDate,
    settlementDate: existing.settlementDate,
    quantity: existing.quantity ? d(existing.quantity).toFixed() : null,
    unitPrice: existing.unitPrice ? d(existing.unitPrice).toFixed() : null,
    fees: d(existing.fees).toFixed(),
    currencyCode: existing.currencyId,
    notes: existing.notes,
    meta: existing.meta as EventBodyInput["meta"],
    ...(patch.grossAmount === undefined &&
    patch.quantity === undefined &&
    patch.unitPrice === undefined
      ? { grossAmount: d(existing.grossAmount).toFixed() }
      : {}),
    ...(patch.taxesWithheld === undefined
      ? { taxesWithheld: d(existing.taxesWithheld).toFixed() }
      : {}),
    ...(patch.fxRateToAccountBase === undefined
      ? { fxRateToAccountBase: existing.fxRateToAccountBase }
      : {}),
    ...patch,
  };
  const values = await buildEventValues(context, account, merged, {
    source: existing.source,
    externalId: existing.externalId,
    relatedEventId: existing.relatedEventId,
    transactionId: existing.transactionId,
  });
  await assertLedgerValid(context, account, (events) =>
    events.map((event) => (event.id === id ? provisional(values, id) : event)),
  );
  const updated = await repo.eventsRepository.update(id, context, {
    ...values,
    householdId: undefined,
  } as never);
  accountTotalsInvalidate(account.id);
  if (existing.accountId !== account.id) accountTotalsInvalidate(existing.accountId);
  return resource(context, updated as InvestmentEventRecord);
}

export async function deleteEvent(context: HouseholdContext, id: string): Promise<void> {
  const existing = await repo.eventsRepository.get(id, context);
  if (!existing) throw new NotFoundError("Event");
  const account = await requireInvestmentAccount(context, existing.accountId);
  await assertLedgerValid(context, account, (events) => events.filter((event) => event.id !== id));
  await repo.eventsRepository.delete(id, context);
  accountTotalsInvalidate(account.id);
}

export async function listEvents(
  context: HouseholdContext,
  query: {
    accountId?: string;
    assetId?: string;
    portfolioId?: string;
    type?: string;
    from?: string;
    to?: string;
    page: number;
    perPage: number;
  },
) {
  let accountIds: string[] | undefined = query.accountId ? [query.accountId] : undefined;
  if (!accountIds && query.portfolioId)
    accountIds =
      (await repo.portfolioAccountIds(context, query.portfolioId)).get(query.portfolioId) ?? [];
  const page = await repo.eventsRepository.listPage(context, { ...query, accountIds });
  const assets = await loadAssetMap(
    context,
    page.rows.map((row) => row.assetId),
  );
  return {
    data: page.rows.map((row) =>
      toEventResource(row, row.assetId ? assets.get(row.assetId) : undefined),
    ),
    meta: {
      pagination: {
        page: query.page,
        perPage: query.perPage,
        totalCount: page.totalCount,
        totalPages: Math.max(1, Math.ceil(page.totalCount / query.perPage)),
      },
    },
  };
}

// ---------------------------------------------------------------- cash

const CASH_KIND_TO_TYPE = {
  deposit: "DEPOSIT",
  withdrawal: "WITHDRAWAL",
  transfer_in: "TRANSFER_IN",
  transfer_out: "TRANSFER_OUT",
  fx_conversion: "FX_CONVERSION",
  interest: "INTEREST_ON_CASH",
  fee: "FEE",
} as const;

export async function getAccountCash(
  context: HouseholdContext,
  accountId: string,
): Promise<AccountCash> {
  const account = await requireInvestmentAccount(context, accountId);
  const { loadAccountLedgers, resolveScope } = await import("./investments.valuation");
  const scope = await resolveScope(context, { accountId });
  const [entry] = await loadAccountLedgers(scope);
  const cash = [];
  for (const [currencyCode, amount] of Object.entries(entry?.ledger.cash ?? {})) {
    cash.push({ currencyCode, amount: await scope.fx.minor(amount, currencyCode) });
  }
  const events = (entry?.events ?? []).filter((event) =>
    CASH_EVENT_TYPES.includes(event.type as never),
  );
  return {
    accountId: account.id,
    cash,
    ledger: events
      .slice()
      .reverse()
      .map((event) => toEventResource(event)),
  };
}

export async function addCashMovement(
  context: HouseholdContext,
  accountId: string,
  input: CashMovementInput,
): Promise<AccountCash> {
  const account = await requireInvestmentAccount(context, accountId);
  const type = CASH_KIND_TO_TYPE[input.kind];
  const fx = new FxConverter();
  let transactionId: string | null = null;
  const realTransfer =
    input.counterpartAccountId &&
    ["deposit", "withdrawal", "transfer_in", "transfer_out"].includes(input.kind);

  if (realTransfer) {
    if (input.currencyCode !== account.currencyId)
      throw new ValidationError("A transfer must use the investment account's currency");
    const counterpart = await repo.findAccount(context, input.counterpartAccountId as string);
    if (!counterpart) throw new NotFoundError("Account");
    const incoming = input.kind === "deposit" || input.kind === "transfer_in";
    const minor = await fx.minor(d(input.amount), account.currencyId);
    const date = parseISODate(input.date);
    const transaction = await createTransaction(context, {
      type: "transfer",
      description: incoming ? `Transfer to ${account.name}` : `Transfer from ${account.name}`,
      purchaseDate: date,
      postedDate: date,
      fromAccountId: incoming ? counterpart.id : account.id,
      toAccountId: incoming ? account.id : counterpart.id,
      ...(incoming ? { toAmount: minor } : { fromAmount: minor }),
    } as never);
    transactionId = (transaction as { id: string }).id;
  }

  const meta: Record<string, unknown> = {};
  if (input.counterpartAccountId) meta.counterpartAccountId = input.counterpartAccountId;
  if (input.kind === "fx_conversion") {
    if (!input.toCurrencyCode || !input.toAmount)
      throw new ValidationError("FX conversion needs a target currency and amount");
    meta.toCurrency = input.toCurrencyCode;
    meta.toAmount = input.toAmount;
  }
  const values = await buildEventValues(
    context,
    account,
    {
      accountId,
      type,
      tradeDate: input.date,
      grossAmount: input.amount,
      currencyCode: input.currencyCode,
      notes: input.notes ?? null,
      meta: meta as never,
    },
    { transactionId },
    fx,
  );
  await assertLedgerValid(context, account, (events) => [...events, provisional(values)]);
  await db.insert(investmentEventsTable).values(values);
  accountTotalsInvalidate(account.id);
  return getAccountCash(context, accountId);
}
