import type {
  CreatePaymentMethodInput,
  PaymentMethod,
  UpdatePaymentMethodInput,
} from '@luraba/contracts/payment-methods';
import type { HouseholdContext } from '@/config/permissions';
import { currenciesRepository } from '@/modules/currencies/currencies.repository';
import * as transactionsRepository from '@/modules/transactions/transactions.repository';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/errors';
import { formatISODateTime } from '@/shared/lib/date';
import { createListMeta, type ListResult } from '@/shared/list';
import type { ListPaymentMethodsQuery } from './payment-methods.query';
import { paymentMethodsRepository } from './payment-methods.repository';
import type { PaymentMethodRecord } from './payment-methods.types';

function toPaymentMethodCode(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '_')
    .replace(/^_+|_+$/gu, '')
    .slice(0, 32);
}

function mapPaymentMethodRecord(method: PaymentMethodRecord): PaymentMethod {
  return {
    id: method.id,
    code: method.code,
    name: method.name,
    scope: method.householdId ? 'household' : 'system',
    currencyCode: method.currencyId ?? null,
    translationKey: method.translationKey ?? null,
    color: method.color ?? null,
    icon: method.icon ?? null,
    createdAt: formatISODateTime(method.createdAt),
    updatedAt: formatISODateTime(method.updatedAt),
  };
}

async function assertCurrencyExists(currencyCode?: string): Promise<void> {
  if (!currencyCode) {
    return;
  }

  const currency = await currenciesRepository.findByCode(currencyCode);
  if (!currency) {
    throw new NotFoundError('Currency');
  }
}

export async function listPaymentMethods(
  context: HouseholdContext,
  query: ListPaymentMethodsQuery,
): Promise<ListResult<PaymentMethod>> {
  await assertCurrencyExists(query.currencyCode);

  const page = await paymentMethodsRepository.listPage(context, query);

  return {
    data: page.rows.map(mapPaymentMethodRecord),
    meta: createListMeta(query, page.totalCount),
  };
}

export async function createPaymentMethod(
  context: HouseholdContext,
  dto: CreatePaymentMethodInput,
): Promise<PaymentMethod> {
  await assertCurrencyExists(dto.currencyCode);

  const code = toPaymentMethodCode(dto.code ?? dto.name);
  if (!code) {
    throw new ValidationError('Payment method code is required');
  }

  const existing = await paymentMethodsRepository.findByCode(context, code, dto.currencyCode);
  if (existing) {
    throw new ConflictError('Payment method already exists');
  }

  const method = await paymentMethodsRepository.create(context, {
    code,
    name: dto.name.trim(),
    currencyId: dto.currencyCode ?? null,
    color: dto.color,
    icon: dto.icon,
  });

  return mapPaymentMethodRecord(method);
}

export async function updatePaymentMethod(
  context: HouseholdContext,
  paymentMethodId: string,
  dto: UpdatePaymentMethodInput,
): Promise<PaymentMethod> {
  const method = await paymentMethodsRepository.get(paymentMethodId, context);
  if (!method) {
    throw new NotFoundError('Payment method');
  }

  const currencyId = dto.currencyCode === null ? null : (dto.currencyCode ?? method.currencyId);
  await assertCurrencyExists(currencyId ?? undefined);

  const code = dto.code ? toPaymentMethodCode(dto.code) : method.code;
  if (!code) {
    throw new ValidationError('Payment method code is required');
  }

  if (code !== method.code || currencyId !== method.currencyId) {
    const existing = await paymentMethodsRepository.findByCode(context, code, currencyId);
    if (existing && existing.id !== paymentMethodId) {
      throw new ConflictError('Payment method already exists');
    }
  }

  const updated = await paymentMethodsRepository.update(paymentMethodId, context, {
    code: dto.code ? code : undefined,
    name: dto.name?.trim(),
    currencyId: dto.currencyCode === undefined ? undefined : currencyId,
    color: dto.color,
    icon: dto.icon,
  });

  if (!updated) {
    throw new NotFoundError('Payment method');
  }

  return mapPaymentMethodRecord(updated);
}

export async function deletePaymentMethod(
  context: HouseholdContext,
  paymentMethodId: string,
): Promise<void> {
  const method = await paymentMethodsRepository.get(paymentMethodId, context);
  if (!method) {
    throw new NotFoundError('Payment method');
  }

  if (await transactionsRepository.hasPaymentMethod(context, paymentMethodId)) {
    throw new ValidationError('Payment methods used by transactions cannot be deleted');
  }

  const deleted = await paymentMethodsRepository.delete(paymentMethodId, context);
  if (!deleted) {
    throw new NotFoundError('Payment method');
  }
}

export async function findAvailablePaymentMethod(
  context: HouseholdContext,
  code: string,
  currencyCode: string,
) {
  return paymentMethodsRepository.findAvailableByCode(context, code, currencyCode);
}
