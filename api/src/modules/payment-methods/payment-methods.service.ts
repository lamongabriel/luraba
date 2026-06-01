import type { HouseholdContext } from '@/config/permissions';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/errors';
import { formatISODateTime } from '@/shared/lib/date';
import { paymentMethodsRepository } from './payment-methods.repository';
import type {
  CreatePaymentMethodRequestBody,
  CreatePaymentMethodResponse,
  ListPaymentMethodsRequestQuery,
  ListPaymentMethodsResponse,
  PaymentMethod,
  PaymentMethodRecord,
  UpdatePaymentMethodRequestBody,
  UpdatePaymentMethodResponse,
} from './payment-methods.types';

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

  const currency = await paymentMethodsRepository.findCurrencyByCode(currencyCode);
  if (!currency) {
    throw new NotFoundError('Currency');
  }
}

export async function listPaymentMethods(
  context: HouseholdContext,
  query: ListPaymentMethodsRequestQuery,
): Promise<ListPaymentMethodsResponse> {
  await assertCurrencyExists(query.currencyCode);

  const methods = await paymentMethodsRepository.list(context, query.currencyCode);
  return methods.map(mapPaymentMethodRecord);
}

export async function createPaymentMethod(
  context: HouseholdContext,
  dto: CreatePaymentMethodRequestBody,
): Promise<CreatePaymentMethodResponse> {
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
  dto: UpdatePaymentMethodRequestBody,
): Promise<UpdatePaymentMethodResponse> {
  const method = await paymentMethodsRepository.get(paymentMethodId, context);
  if (!method) {
    throw new NotFoundError('Payment method');
  }

  const currencyId = dto.currencyCode === null ? null : dto.currencyCode ?? method.currencyId;
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

export async function deletePaymentMethod(context: HouseholdContext, paymentMethodId: string): Promise<void> {
  const method = await paymentMethodsRepository.get(paymentMethodId, context);
  if (!method) {
    throw new NotFoundError('Payment method');
  }

  if (await paymentMethodsRepository.hasTransactions(paymentMethodId, context)) {
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
