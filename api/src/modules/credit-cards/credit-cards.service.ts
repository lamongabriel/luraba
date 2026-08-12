import { eq } from 'drizzle-orm';
import type { HouseholdContext } from '@/config/permissions';
import { db } from '@/db';
import { creditCardsTable } from '@/db/schemas/credit-cards.schema';
import { accountsRepository } from '@/modules/accounts/accounts.repository';
import * as accountsService from '@/modules/accounts/accounts.service';
import { ledgerAccountsRepository } from '@/modules/ledger-accounts/ledger-accounts.repository';
import { ConflictError, ValidationError } from '@/shared/errors';
import { now } from '@/shared/lib/date';
import { createListMeta, type ListResult } from '@/shared/list';
import * as cycleService from './credit-card-cycles.service';
import * as paymentService from './credit-card-payments.service';
import * as purchaseService from './credit-card-purchases.service';
import type { CreditCardRow } from './credit-cards.helpers';
import type { ListCreditCardCyclesQuery, ListCreditCardsRequestQuery } from './credit-cards.query';
import * as creditCardsRepository from './credit-cards.repository';
import { computeRemainingCreditAmount, mapCreditCard } from './credit-cards.shared';
import type {
  CreateCreditCardDto,
  CreateCreditCardPaymentDto,
  CreateCreditCardPurchaseDto,
  CreditCardCycleDetailResponse,
  CreditCardCycleSummary,
  CreditCardForecastQuery,
  CreditCardForecastResponse,
  CreditCardPaymentResponse,
  CreditCardPurchaseResponse,
  CreditCardResponse,
  ListCreditCardsResponse,
  UpdateCreditCardCycleDto,
  UpdateCreditCardDto,
  UpdateCreditCardPaymentDto,
  UpdateCreditCardPurchaseDto,
} from './credit-cards.types';

export async function listCreditCards(
  context: HouseholdContext,
  query: ListCreditCardsRequestQuery,
): Promise<ListResult<ListCreditCardsResponse[number]>> {
  const page = await creditCardsRepository.listPage(context.householdId, query);

  return {
    data: page.rows.map((card) => ({
      ...card,
      remainingCreditAmount: computeRemainingCreditAmount(card, card.balance),
    })),
    meta: createListMeta(query, page.totalCount),
  };
}

export async function createCreditCard(
  context: HouseholdContext,
  dto: CreateCreditCardDto,
): Promise<CreditCardResponse> {
  const ownerAccount = await accountsRepository.get(dto.ownerAccountId, context);
  if (!ownerAccount) throw new ValidationError('Owner account must belong to this household');
  if (ownerAccount.type !== 'cash' || ownerAccount.classification !== 'asset') {
    throw new ValidationError('Credit cards can only belong to cash asset accounts');
  }

  const existing = await creditCardsRepository.findByHouseholdAndName(
    context.householdId,
    dto.name,
  );
  if (existing) {
    throw new ConflictError('A credit card with this name already exists');
  }

  const institution = await accountsService.resolveInstitutionBranding(
    context,
    dto.institutionDomain,
  );

  const card = await db.transaction(async (tx) => {
    const account = await accountsService.createAccountRecordInTransaction(tx, context, {
      name: `Credit card ledger: ${dto.name}`,
      classification: 'liability',
      type: 'credit_card',
      currencyId: ownerAccount.currencyId,
    });

    await ledgerAccountsRepository.createForAccount(tx, {
      accountId: account.id,
      classification: 'liability',
      currencyCode: account.currencyId,
    });

    const [createdCard] = await tx
      .insert(creditCardsTable)
      .values({
        householdId: context.householdId,
        name: dto.name,
        institutionName: dto.institutionName ?? null,
        institutionDomain: institution.institutionDomain ?? null,
        institutionLogoUrl: institution.institutionLogoUrl ?? null,
        notes: dto.notes ?? null,
        ledgerAccountId: account.id,
        ownerAccountId: ownerAccount.id,
        brand: dto.brand,
        productType: dto.productType,
        last4: dto.last4,
        color: dto.color,
        closingDay: dto.closingDay,
        dueDay: dto.dueDay,
        creditLimitAmount: dto.creditLimitAmount ?? -1,
      })
      .returning();

    const cardRow = {
      id: createdCard.id,
      ownerAccountId: ownerAccount.id,
      ledgerAccountId: account.id,
      name: createdCard.name,
      institutionName: createdCard.institutionName,
      institutionDomain: createdCard.institutionDomain,
      institutionLogoUrl: createdCard.institutionLogoUrl,
      notes: createdCard.notes,
      ownerAccount: {
        id: ownerAccount.id,
        name: ownerAccount.name,
        institutionName: ownerAccount.institutionName ?? null,
        institutionLogoUrl: ownerAccount.institutionLogoUrl ?? null,
        type: 'cash',
        classification: 'asset',
        currencyCode: ownerAccount.currencyId,
      },
      classification: 'liability',
      type: 'credit_card',
      currencyCode: ownerAccount.currencyId,
      brand: createdCard.brand,
      productType: createdCard.productType,
      last4: createdCard.last4,
      color: createdCard.color ?? null,
      closingDay: createdCard.closingDay,
      dueDay: createdCard.dueDay,
      creditLimitAmount: createdCard.creditLimitAmount,
      createdAt: createdCard.createdAt,
      updatedAt: createdCard.updatedAt,
    } satisfies CreditCardRow;

    await cycleService.ensureCurrentCycle(tx, cardRow, context.timezone);
    await cycleService.syncCardCycles(tx, cardRow, context.timezone);

    return cardRow;
  });

  return mapCreditCard(card);
}

export async function getCreditCard(
  context: HouseholdContext,
  creditCardId: string,
): Promise<CreditCardResponse> {
  await db.transaction(async (tx) => {
    const card = await creditCardsRepository.findByIdOrThrow(context.householdId, creditCardId);
    await cycleService.syncCardCycles(tx, card, context.timezone);
  });

  return mapCreditCard(
    await creditCardsRepository.findByIdOrThrow(context.householdId, creditCardId),
  );
}

export async function updateCreditCard(
  context: HouseholdContext,
  creditCardId: string,
  dto: UpdateCreditCardDto,
): Promise<CreditCardResponse> {
  const existingCard = await creditCardsRepository.findByIdOrThrow(
    context.householdId,
    creditCardId,
  );

  if (dto.name && dto.name !== existingCard.name) {
    const duplicate = await creditCardsRepository.findByHouseholdAndName(
      context.householdId,
      dto.name,
    );
    if (duplicate) {
      throw new ConflictError('A credit card with this name already exists');
    }
  }

  const updated = await db.transaction(async (tx) => {
    const institution = await accountsService.resolveUpdatedInstitutionBranding(
      context,
      dto.institutionDomain,
    );
    const updatedAt = now();
    const nextInstitutionDomain =
      dto.institutionDomain === undefined
        ? existingCard.institutionDomain
        : institution.institutionDomain;
    const nextInstitutionLogoUrl =
      dto.institutionDomain === undefined
        ? existingCard.institutionLogoUrl
        : institution.institutionLogoUrl;

    await tx
      .update(creditCardsTable)
      .set({
        name: dto.name,
        institutionName: dto.institutionName,
        institutionDomain: nextInstitutionDomain,
        institutionLogoUrl: nextInstitutionLogoUrl,
        notes: dto.notes,
        brand: dto.brand,
        productType: dto.productType,
        last4: dto.last4,
        color: dto.color === undefined ? undefined : dto.color,
        closingDay: dto.closingDay,
        dueDay: dto.dueDay,
        creditLimitAmount: dto.creditLimitAmount,
        updatedAt,
      })
      .where(eq(creditCardsTable.id, existingCard.id));

    const card: CreditCardRow = {
      ...existingCard,
      name: dto.name ?? existingCard.name,
      institutionName:
        dto.institutionName === undefined ? existingCard.institutionName : dto.institutionName,
      institutionDomain: nextInstitutionDomain ?? null,
      institutionLogoUrl: nextInstitutionLogoUrl ?? null,
      notes: dto.notes === undefined ? existingCard.notes : dto.notes,
      brand: dto.brand ?? existingCard.brand,
      productType: dto.productType ?? existingCard.productType,
      last4: dto.last4 ?? existingCard.last4,
      color: dto.color === undefined ? existingCard.color : dto.color,
      closingDay: dto.closingDay ?? existingCard.closingDay,
      dueDay: dto.dueDay ?? existingCard.dueDay,
      creditLimitAmount: dto.creditLimitAmount ?? existingCard.creditLimitAmount,
      updatedAt,
    };

    if (dto.closingDay !== undefined || dto.dueDay !== undefined) {
      await cycleService.rebuildOpenAndFutureSchedules(tx, card, context.timezone);
    } else {
      await cycleService.syncCardCycles(tx, card, context.timezone);
    }

    return card;
  });

  return mapCreditCard(updated);
}

export async function deleteCreditCard(
  context: HouseholdContext,
  creditCardId: string,
): Promise<void> {
  const card = await creditCardsRepository.findByIdOrThrow(context.householdId, creditCardId);
  await accountsService.deleteAccount(context, card.ledgerAccountId);
}

export async function listBillingCycles(
  context: HouseholdContext,
  creditCardId: string,
  query: ListCreditCardCyclesQuery,
): Promise<ListResult<CreditCardCycleSummary>> {
  return cycleService.listBillingCycles(context, creditCardId, query);
}

export async function getBillingCycle(
  context: HouseholdContext,
  creditCardId: string,
  cycleId: string,
): Promise<CreditCardCycleDetailResponse> {
  return cycleService.getBillingCycle(context, creditCardId, cycleId);
}

export async function updateBillingCycle(
  context: HouseholdContext,
  creditCardId: string,
  cycleId: string,
  dto: UpdateCreditCardCycleDto,
): Promise<CreditCardCycleDetailResponse> {
  return cycleService.updateBillingCycle(context, creditCardId, cycleId, dto);
}

export async function createPurchase(
  context: HouseholdContext,
  creditCardId: string,
  dto: CreateCreditCardPurchaseDto,
): Promise<CreditCardPurchaseResponse> {
  return purchaseService.createPurchase(context, creditCardId, dto);
}

export async function getPurchase(
  context: HouseholdContext,
  creditCardId: string,
  purchaseId: string,
): Promise<CreditCardPurchaseResponse> {
  return purchaseService.getPurchase(context, creditCardId, purchaseId);
}

export async function updatePurchase(
  context: HouseholdContext,
  creditCardId: string,
  purchaseId: string,
  dto: UpdateCreditCardPurchaseDto,
): Promise<CreditCardPurchaseResponse> {
  return purchaseService.updatePurchase(context, creditCardId, purchaseId, dto);
}

export async function deletePurchase(
  context: HouseholdContext,
  creditCardId: string,
  purchaseId: string,
): Promise<void> {
  return purchaseService.deletePurchase(context, creditCardId, purchaseId);
}

export async function createPayment(
  context: HouseholdContext,
  creditCardId: string,
  dto: CreateCreditCardPaymentDto,
): Promise<CreditCardPaymentResponse> {
  return paymentService.createPayment(context, creditCardId, dto);
}

export async function getPayment(
  context: HouseholdContext,
  creditCardId: string,
  paymentId: string,
): Promise<CreditCardPaymentResponse> {
  return paymentService.getPayment(context, creditCardId, paymentId);
}

export async function updatePayment(
  context: HouseholdContext,
  creditCardId: string,
  paymentId: string,
  dto: UpdateCreditCardPaymentDto,
): Promise<CreditCardPaymentResponse> {
  return paymentService.updatePayment(context, creditCardId, paymentId, dto);
}

export async function deletePayment(
  context: HouseholdContext,
  creditCardId: string,
  paymentId: string,
): Promise<void> {
  return paymentService.deletePayment(context, creditCardId, paymentId);
}

export async function getForecast(
  context: HouseholdContext,
  creditCardId: string,
  query: CreditCardForecastQuery,
): Promise<CreditCardForecastResponse> {
  return cycleService.getForecast(context, creditCardId, query);
}
