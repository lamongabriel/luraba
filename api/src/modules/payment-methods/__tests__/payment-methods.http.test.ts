import request from 'supertest';
import app from '@/app';
import { createAuthenticatedContext, createAuthHeaders } from '@/test/auth';
import { buildPaymentMethodInput } from '@/test/factories';

describe('payment methods routes', () => {
  it('GET /api/v1/payment-methods requires authentication', async () => {
    const response = await request(app).get('/api/v1/payment-methods');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/payment-methods lists system and household methods', async () => {
    const context = await createAuthenticatedContext();

    await request(app)
      .post('/api/v1/payment-methods')
      .set(createAuthHeaders(context.token, context.household.id))
      .send(
        buildPaymentMethodInput({
          name: 'Meal Voucher',
          color: '#16A34A',
          icon: 'Restaurant02Icon',
        }),
      );

    const response = await request(app)
      .get('/api/v1/payment-methods')
      .set(createAuthHeaders(context.token, context.household.id));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'cash',
          scope: 'system',
          translationKey: 'paymentMethods.system.cash',
        }),
        expect.objectContaining({
          code: 'meal_voucher',
          scope: 'household',
          translationKey: null,
          color: '#16A34A',
          icon: 'Restaurant02Icon',
        }),
      ]),
    );
  });

  it('POST /api/v1/payment-methods creates a household method', async () => {
    const context = await createAuthenticatedContext();

    const response = await request(app)
      .post('/api/v1/payment-methods')
      .set(createAuthHeaders(context.token, context.household.id))
      .send(buildPaymentMethodInput({ name: 'Gift Card', code: 'gift-card', currencyCode: 'USD' }));

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        code: 'gift_card',
        name: 'Gift Card',
        scope: 'household',
        currencyCode: 'USD',
      }),
    );
  });

  it('POST /api/v1/payment-methods validates body fields', async () => {
    const context = await createAuthenticatedContext();

    const response = await request(app)
      .post('/api/v1/payment-methods')
      .set(createAuthHeaders(context.token, context.household.id))
      .send({ name: '', color: 'blue' });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/v1/payment-methods respects household permissions', async () => {
    const context = await createAuthenticatedContext({ role: 'viewer' });

    const response = await request(app)
      .post('/api/v1/payment-methods')
      .set(createAuthHeaders(context.token, context.household.id))
      .send(buildPaymentMethodInput({ name: 'Viewer Voucher' }));

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('PATCH /api/v1/payment-methods/:id updates a household method', async () => {
    const context = await createAuthenticatedContext();
    const created = await request(app)
      .post('/api/v1/payment-methods')
      .set(createAuthHeaders(context.token, context.household.id))
      .send(buildPaymentMethodInput({ name: 'Patch Payment Method', currencyCode: 'BRL' }));

    const response = await request(app)
      .patch(`/api/v1/payment-methods/${created.body.data.id}`)
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        name: 'Patched Payment Method',
        currencyCode: null,
        color: null,
        icon: null,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        id: created.body.data.id,
        name: 'Patched Payment Method',
        currencyCode: null,
        color: null,
        icon: null,
      }),
    );
  });

  it('DELETE /api/v1/payment-methods/:id deletes a household method', async () => {
    const context = await createAuthenticatedContext();
    const created = await request(app)
      .post('/api/v1/payment-methods')
      .set(createAuthHeaders(context.token, context.household.id))
      .send(buildPaymentMethodInput({ name: 'Delete Payment Method' }));

    const response = await request(app)
      .delete(`/api/v1/payment-methods/${created.body.data.id}`)
      .set(createAuthHeaders(context.token, context.household.id));

    expect(response.status).toBe(204);

    const list = await request(app)
      .get('/api/v1/payment-methods')
      .set(createAuthHeaders(context.token, context.household.id));

    expect(list.body.data).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: created.body.data.id })]),
    );
  });
});
