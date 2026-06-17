import { eq } from 'drizzle-orm';
import type { HouseholdContext } from '@/config/permissions';
import { db } from '@/db';
import { creditCardsTable } from '@/db/schemas/credit-cards.schema';
import { accountsRepository } from '@/modules/accounts/accounts.repository';
import * as accountsService from '@/modules/accounts/accounts.service';
import { ledgerAccountsRepository } from '@/modules/ledger-accounts/ledger-accounts.repository';
import { ConflictError } from '@/shared/errors';
import { now } from '@/shared/lib/date';
import * as cycleService from './credit-card-cycles.service';
import * as paymentService from './credit-card-payments.service';
import * as purchaseService from './credit-card-purchases.service';
import type { CreditCardRow } from './credit-cards.helpers';
import * as creditCardsRepository from './credit-cards.repository';
import { ensureCurrency, mapCreditCard } from './credit-cards.shared';
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
  ListCreditCardCyclesQuery,
  UpdateCreditCardCycleDto,
  UpdateCreditCardDto,
  UpdateCreditCardPaymentDto,
  UpdateCreditCardPurchaseDto,
} from './credit-cards.types';

export async function listCreditCards(context: HouseholdContext): Promise<CreditCardResponse[]> {
  const cards = await creditCardsRepository.listByHouseholdId(context.householdId);
  return Promise.all(cards.map((card) => mapCreditCard(card)));
}

export async function createCreditCard(
  context: HouseholdContext,
  dto: CreateCreditCardDto,
): Promise<CreditCardResponse> {
  await ensureCurrency(dto.currencyCode);

  const existing = await accountsRepository.findByHouseholdAndName(context, dto.name);
  if (existing) {
    throw new ConflictError('An account with this name already exists');
  }

  const card = await db.transaction(async (tx) => {
    const account = await accountsService.createAccountRecordInTransaction(tx, context, {
      name: dto.name,
      institutionName: dto.institutionName,
      institutionDomain: dto.institutionDomain,
      notes: dto.notes,
      classification: 'liability',
      type: 'credit_card',
      currencyId: dto.currencyCode,
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
        accountId: account.id,
        brand: dto.brand,
        last4: dto.last4,
        color: dto.color,
        closingDay: dto.closingDay,
        dueDay: dto.dueDay,
        creditLimitAmount: dto.creditLimitAmount ?? -1,
      })
      .returning();

    const cardRow = {
      id: createdCard.id,
      accountId: account.id,
      name: account.name,
      institutionName: account.institutionName ?? null,
      institutionDomain: account.institutionDomain ?? null,
      institutionLogoUrl: account.institutionLogoUrl ?? null,
      notes: account.notes ?? null,
      classification: 'liability',
      type: 'credit_card',
      currencyCode: account.currencyId,
      brand: createdCard.brand,
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
    const duplicate = await accountsRepository.findByHouseholdAndName(context, dto.name);
    if (duplicate) {
      throw new ConflictError('An account with this name already exists');
    }
  }

  const updated = await db.transaction(async (tx) => {
    let updatedAccount = {
      name: existingCard.name,
      institutionName: existingCard.institutionName,
      institutionDomain: existingCard.institutionDomain,
      institutionLogoUrl: existingCard.institutionLogoUrl,
      notes: existingCard.notes,
    };

    if (
      dto.name !== undefined ||
      dto.institutionName !== undefined ||
      dto.institutionDomain !== undefined ||
      dto.notes !== undefined
    ) {
      const account = await accountsService.updateAccountRecordInTransaction(
        tx,
        context,
        existingCard.accountId,
        {
          name: dto.name,
          institutionName: dto.institutionName === undefined ? undefined : dto.institutionName,
          institutionDomain:
            dto.institutionDomain === undefined ? undefined : dto.institutionDomain,
          notes: dto.notes === undefined ? undefined : dto.notes,
        },
      );

      if (account) {
        updatedAccount = {
          name: account.name,
          institutionName: account.institutionName ?? null,
          institutionDomain: account.institutionDomain ?? null,
          institutionLogoUrl: account.institutionLogoUrl ?? null,
          notes: account.notes ?? null,
        };
      }
    }

    await tx
      .update(creditCardsTable)
      .set({
        brand: dto.brand,
        last4: dto.last4,
        color: dto.color === undefined ? undefined : dto.color,
        closingDay: dto.closingDay,
        dueDay: dto.dueDay,
        creditLimitAmount: dto.creditLimitAmount,
        updatedAt: now(),
      })
      .where(eq(creditCardsTable.id, existingCard.id));

    const card: CreditCardRow = {
      ...existingCard,
      name: updatedAccount.name,
      institutionName: updatedAccount.institutionName,
      institutionDomain: updatedAccount.institutionDomain,
      institutionLogoUrl: updatedAccount.institutionLogoUrl,
      notes: updatedAccount.notes,
      brand: dto.brand ?? existingCard.brand,
      last4: dto.last4 ?? existingCard.last4,
      color: dto.color === undefined ? existingCard.color : dto.color,
      closingDay: dto.closingDay ?? existingCard.closingDay,
      dueDay: dto.dueDay ?? existingCard.dueDay,
      creditLimitAmount: dto.creditLimitAmount ?? existingCard.creditLimitAmount,
      updatedAt: now(),
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
  await accountsService.deleteAccount(context, card.accountId);
}

export async function listBillingCycles(
  context: HouseholdContext,
  creditCardId: string,
  query: ListCreditCardCyclesQuery,
): Promise<CreditCardCycleSummary[]> {
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
