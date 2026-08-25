import { ConflictError, NotFoundError } from '@/shared/errors';
import { createAuthenticatedContext } from '@/test/auth';
import { buildPaymentMethodInput } from '@/test/factories';
import { ListPaymentMethodsRequestQuerySchema } from '../payment-methods.query';
import * as paymentMethodsService from '../payment-methods.service';

describe('payment methods service', () => {
  it('lists seeded system payment methods with translation keys', async () => {
    const context = await createAuthenticatedContext();

    const methods = await paymentMethodsService.listPaymentMethods(
      context.householdContext,
      ListPaymentMethodsRequestQuerySchema.parse({}),
    );

    expect(methods.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'cash',
          name: 'Cash',
          scope: 'system',
          currencyCode: null,
          translationKey: 'paymentMethods.system.cash',
        }),
        expect.objectContaining({
          code: 'pix',
          name: 'Pix',
          scope: 'system',
          currencyCode: 'BRL',
          translationKey: 'paymentMethods.system.pix',
        }),
      ]),
    );
  });

  it('creates a household payment method with color and icon', async () => {
    const context = await createAuthenticatedContext();

    const method = await paymentMethodsService.createPaymentMethod(
      context.householdContext,
      buildPaymentMethodInput({
        name: 'Meal Voucher',
        currencyCode: 'BRL',
        color: '#16A34A',
        icon: 'Restaurant02Icon',
      }),
    );

    expect(method).toEqual(
      expect.objectContaining({
        code: 'meal_voucher',
        name: 'Meal Voucher',
        scope: 'household',
        currencyCode: 'BRL',
        translationKey: null,
        color: '#16A34A',
        icon: 'Restaurant02Icon',
      }),
    );
  });

  it('lists household methods only for the active household', async () => {
    const context = await createAuthenticatedContext();
    const otherContext = await createAuthenticatedContext();

    await paymentMethodsService.createPaymentMethod(
      context.householdContext,
      buildPaymentMethodInput({ name: 'Meal Voucher' }),
    );
    await paymentMethodsService.createPaymentMethod(
      otherContext.householdContext,
      buildPaymentMethodInput({ name: 'Foreign Voucher' }),
    );

    const methods = await paymentMethodsService.listPaymentMethods(
      context.householdContext,
      ListPaymentMethodsRequestQuerySchema.parse({}),
    );

    expect(methods.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'meal_voucher' })]),
    );
    expect(methods.data).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'foreign_voucher' })]),
    );
  });

  it('filters methods by currency while keeping global methods', async () => {
    const context = await createAuthenticatedContext();

    await paymentMethodsService.createPaymentMethod(
      context.householdContext,
      buildPaymentMethodInput({ name: 'BRL Voucher', code: 'voucher', currencyCode: 'BRL' }),
    );
    await paymentMethodsService.createPaymentMethod(
      context.householdContext,
      buildPaymentMethodInput({ name: 'USD Voucher', code: 'voucher', currencyCode: 'USD' }),
    );
    await paymentMethodsService.createPaymentMethod(
      context.householdContext,
      buildPaymentMethodInput({ name: 'Global Wallet', code: 'wallet' }),
    );

    const methods = await paymentMethodsService.listPaymentMethods(context.householdContext, {
      ...ListPaymentMethodsRequestQuerySchema.parse({ currencyCode: 'BRL' }),
    });

    expect(methods.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'voucher', name: 'BRL Voucher', currencyCode: 'BRL' }),
        expect.objectContaining({ code: 'wallet', name: 'Global Wallet', currencyCode: null }),
        expect.objectContaining({ code: 'cash', currencyCode: null }),
      ]),
    );
    expect(methods.data).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'voucher', name: 'USD Voucher' })]),
    );
  });

  it('rejects unknown currencies', async () => {
    const context = await createAuthenticatedContext();

    await expect(
      paymentMethodsService.createPaymentMethod(
        context.householdContext,
        buildPaymentMethodInput({ currencyCode: 'ZZZ' }),
      ),
    ).rejects.toThrow(NotFoundError);

    await expect(
      paymentMethodsService.listPaymentMethods(
        context.householdContext,
        ListPaymentMethodsRequestQuerySchema.parse({ currencyCode: 'ZZZ' }),
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it('rejects duplicate household method codes for the same currency scope', async () => {
    const context = await createAuthenticatedContext();

    await paymentMethodsService.createPaymentMethod(
      context.householdContext,
      buildPaymentMethodInput({ name: 'Voucher', code: 'voucher' }),
    );

    await expect(
      paymentMethodsService.createPaymentMethod(
        context.householdContext,
        buildPaymentMethodInput({ name: 'Voucher Again', code: 'voucher' }),
      ),
    ).rejects.toThrow(ConflictError);
  });

  it('allows the same custom method code in different households', async () => {
    const context = await createAuthenticatedContext();
    const otherContext = await createAuthenticatedContext();

    const left = await paymentMethodsService.createPaymentMethod(
      context.householdContext,
      buildPaymentMethodInput({ name: 'Voucher', code: 'voucher' }),
    );
    const right = await paymentMethodsService.createPaymentMethod(
      otherContext.householdContext,
      buildPaymentMethodInput({ name: 'Voucher', code: 'voucher' }),
    );

    expect(left.id).not.toBe(right.id);
    expect(left.code).toBe(right.code);
  });

  it('updates a household payment method and can clear optional fields', async () => {
    const context = await createAuthenticatedContext();
    const method = await paymentMethodsService.createPaymentMethod(
      context.householdContext,
      buildPaymentMethodInput({
        name: 'Voucher',
        code: 'voucher',
        currencyCode: 'BRL',
        color: '#16A34A',
        icon: 'Restaurant02Icon',
      }),
    );

    const updated = await paymentMethodsService.updatePaymentMethod(
      context.householdContext,
      method.id,
      {
        name: 'Updated Voucher',
        code: 'updated-voucher',
        currencyCode: null,
        color: null,
        icon: null,
      },
    );

    expect(updated).toEqual(
      expect.objectContaining({
        id: method.id,
        code: 'updated_voucher',
        name: 'Updated Voucher',
        currencyCode: null,
        color: null,
        icon: null,
      }),
    );
  });

  it('deletes a household payment method', async () => {
    const context = await createAuthenticatedContext();
    const method = await paymentMethodsService.createPaymentMethod(
      context.householdContext,
      buildPaymentMethodInput({ name: 'Temporary Payment Method' }),
    );

    await paymentMethodsService.deletePaymentMethod(context.householdContext, method.id);

    await expect(
      paymentMethodsService.deletePaymentMethod(context.householdContext, method.id),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('payment methods DB list filters', () => {
  it('combines search, scope, code, currency, and nullability filters in SQL', async () => {
    const context = await createAuthenticatedContext();
    const target = await paymentMethodsService.createPaymentMethod(
      context.householdContext,
      buildPaymentMethodInput({
        name: 'Filter Target Method',
        code: 'filter_target_method',
        currencyCode: 'BRL',
      }),
    );

    const result = await paymentMethodsService.listPaymentMethods(
      context.householdContext,
      ListPaymentMethodsRequestQuerySchema.parse({
        search: 'Target',
        codes: 'filter_target_method,cash',
        scopes: 'household',
        currencyCode: 'BRL',
        hasCurrency: true,
        createdAtFrom: '2020-01-01',
        createdAtTo: '2030-01-01',
        updatedAtFrom: '2020-01-01',
        updatedAtTo: '2030-01-01',
        sort: 'code',
        perPage: 1,
      }),
    );

    expect(result.data).toEqual([expect.objectContaining({ id: target.id })]);
    expect(result.meta.pagination.totalCount).toBe(1);
  });
});
