import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '@/app';
import * as accountsService from '@/modules/accounts/accounts.service';
import * as categoriesService from '@/modules/categories/categories.service';
import * as tagsService from '@/modules/tags/tags.service';
import { createAuthenticatedContext, createAuthHeaders } from '@/test/auth';
import {
  buildAccountInput,
  buildCategoryInput,
  buildTagInput,
  createHousehold,
  createHouseholdMembership,
} from '@/test/factories';

describe('transactions routes', () => {
  it('GET /api/v1/transactions requires authentication', async () => {
    const response = await request(app).get('/api/v1/transactions');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/transactions creates an expense with multiple tags', async () => {
    const context = await createAuthenticatedContext();

    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: 'Checking',
        type: 'depository',
        currencyCode: 'BRL',
      }),
    );

    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({
        name: 'Travel',
        type: 'expense',
      }),
    );

    const tripTag = await tagsService.createTag(
      context.householdContext,
      buildTagInput({ name: 'Gramado Trip', color: '#16A34A', icon: 'Ticket01Icon' }),
    );
    const annualTag = await tagsService.createTag(
      context.householdContext,
      buildTagInput({ name: '2026 Travel Expenses', color: '#2563EB', icon: 'Calendar03Icon' }),
    );
    const familyTag = await tagsService.createTag(
      context.householdContext,
      buildTagInput({ name: 'Family', color: '#F97316', icon: 'UserGroupIcon' }),
    );

    const response = await request(app)
      .post('/api/v1/transactions')
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        type: 'expense',
        description: 'Bus ticket to Gramado',
        amount: 25_000,
        currencyCode: 'BRL',
        paymentMethodCode: 'pix',
        accountId: account.id,
        categoryId: category.id,
        tagIds: [tripTag.id, annualTag.id, familyTag.id],
        purchaseDate: '2026-03-24',
        postedDate: '2026-03-24',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Gramado Trip', color: '#16A34A', icon: 'Ticket01Icon' }),
        expect.objectContaining({
          name: '2026 Travel Expenses',
          color: '#2563EB',
          icon: 'Calendar03Icon',
        }),
        expect.objectContaining({ name: 'Family', color: '#F97316', icon: 'UserGroupIcon' }),
      ]),
    );
  });

  it('POST /api/v1/transactions respects household permissions', async () => {
    const context = await createAuthenticatedContext({ role: 'viewer' });

    const response = await request(app)
      .post('/api/v1/transactions')
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        type: 'expense',
        description: 'Viewer attempt',
        amount: 25_000,
        currencyCode: 'BRL',
        paymentMethodCode: 'pix',
        accountId: 'b890a3dd-fc86-43e8-8d63-a0ed6167a7fd',
        categoryId: '3d9042a2-f46d-4572-b696-0a847161cbfd',
        purchaseDate: '2026-03-24',
        postedDate: '2026-03-24',
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('POST /api/v1/transactions creates an adjustment from a target balance', async () => {
    const context = await createAuthenticatedContext();

    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: 'Checking',
        type: 'depository',
        currencyCode: 'BRL',
      }),
    );

    const response = await request(app)
      .post('/api/v1/transactions')
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        type: 'adjustment',
        description: 'Opening balance',
        balance: 50_000,
        accountId: account.id,
        purchaseDate: '2026-03-24',
        postedDate: '2026-03-24',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.amount).toBe(50_000);
    expect(response.body.data.accountId).toBe(account.id);
  });

  it('POST /api/v1/transactions creates a transfer with source and destination amounts', async () => {
    const context = await createAuthenticatedContext();

    const fromAccount = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: 'USD Checking',
        type: 'depository',
        currencyCode: 'USD',
      }),
    );
    const toAccount = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: 'BRL Checking',
        type: 'depository',
        currencyCode: 'BRL',
      }),
    );

    const response = await request(app)
      .post('/api/v1/transactions')
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        type: 'transfer',
        description: 'International transfer',
        fromAmount: 10_000,
        toAmount: 55_000,
        fromAccountId: fromAccount.id,
        toAccountId: toAccount.id,
        purchaseDate: '2026-03-24',
        postedDate: '2026-03-24',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      amount: 10_000,
      currencyCode: 'USD',
      toAmount: 55_000,
      toCurrencyCode: 'BRL',
      accountId: fromAccount.id,
      toAccountId: toAccount.id,
    });
  });

  it('POST /api/v1/transactions rejects legacy transfer amount fields', async () => {
    const context = await createAuthenticatedContext();

    const fromAccount = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: 'Checking',
        type: 'depository',
        currencyCode: 'BRL',
      }),
    );
    const toAccount = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: 'Savings',
        type: 'depository',
        currencyCode: 'BRL',
      }),
    );

    const response = await request(app)
      .post('/api/v1/transactions')
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        type: 'transfer',
        description: 'Move money',
        amount: 10_000,
        currencyCode: 'BRL',
        fromAccountId: fromAccount.id,
        toAccountId: toAccount.id,
        purchaseDate: '2026-03-24',
        postedDate: '2026-03-24',
      });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
  });

  it('GET /api/v1/transactions returns tags on listed transactions', async () => {
    const context = await createAuthenticatedContext();

    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: 'Checking',
        type: 'depository',
        currencyCode: 'BRL',
      }),
    );

    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({
        name: 'Travel',
        type: 'expense',
      }),
    );

    const tripTag = await tagsService.createTag(
      context.householdContext,
      buildTagInput({ name: 'Gramado Trip', color: '#16A34A', icon: 'Ticket01Icon' }),
    );
    const familyTag = await tagsService.createTag(
      context.householdContext,
      buildTagInput({ name: 'Family', color: '#F97316', icon: 'UserGroupIcon' }),
    );

    await request(app)
      .post('/api/v1/transactions')
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        type: 'expense',
        description: 'Bus ticket to Gramado',
        amount: 25_000,
        currencyCode: 'BRL',
        paymentMethodCode: 'pix',
        accountId: account.id,
        categoryId: category.id,
        tagIds: [tripTag.id, familyTag.id],
        purchaseDate: '2026-03-24',
        postedDate: '2026-03-24',
      });

    const response = await request(app)
      .get('/api/v1/transactions')
      .set(createAuthHeaders(context.token, context.household.id));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data[0].tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Gramado Trip', color: '#16A34A', icon: 'Ticket01Icon' }),
        expect.objectContaining({ name: 'Family', color: '#F97316', icon: 'UserGroupIcon' }),
      ]),
    );
  });

  it('GET /api/v1/transactions returns only transactions from the active household', async () => {
    const context = await createAuthenticatedContext();
    const secondHousehold = await createHousehold(context.user.id, {
      name: 'Second Household',
      createdByUserId: context.user.id,
    });
    await createHouseholdMembership(secondHousehold.id, context.user.id, 'owner');

    const primaryAccount = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: 'Primary Checking',
        type: 'depository',
        currencyCode: 'BRL',
      }),
    );
    const primaryCategory = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({
        name: 'Primary Food',
        type: 'expense',
      }),
    );

    const secondHouseholdContext = {
      ...context.householdContext,
      householdId: secondHousehold.id,
    };
    const secondaryAccount = await accountsService.createAccount(
      secondHouseholdContext,
      buildAccountInput({
        name: 'Secondary Checking',
        type: 'depository',
        currencyCode: 'BRL',
      }),
    );
    const secondaryCategory = await categoriesService.createCategory(
      secondHouseholdContext,
      buildCategoryInput({
        name: 'Secondary Food',
        type: 'expense',
      }),
    );

    await request(app)
      .post('/api/v1/transactions')
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        type: 'expense',
        description: 'Primary lunch',
        amount: 2_500,
        currencyCode: 'BRL',
        paymentMethodCode: 'pix',
        accountId: primaryAccount.id,
        categoryId: primaryCategory.id,
        purchaseDate: '2026-03-24',
        postedDate: '2026-03-24',
      });

    await request(app)
      .post('/api/v1/transactions')
      .set(createAuthHeaders(context.token, secondHousehold.id))
      .send({
        type: 'expense',
        description: 'Secondary lunch',
        amount: 4_500,
        currencyCode: 'BRL',
        paymentMethodCode: 'pix',
        accountId: secondaryAccount.id,
        categoryId: secondaryCategory.id,
        purchaseDate: '2026-03-24',
        postedDate: '2026-03-24',
      });

    const primaryResponse = await request(app)
      .get('/api/v1/transactions')
      .set(createAuthHeaders(context.token, context.household.id));

    expect(primaryResponse.status).toBe(200);
    expect(primaryResponse.body.data).toHaveLength(1);
    expect(primaryResponse.body.data[0].description).toBe('Primary lunch');

    const secondaryResponse = await request(app)
      .get('/api/v1/transactions')
      .set(createAuthHeaders(context.token, secondHousehold.id));

    expect(secondaryResponse.status).toBe(200);
    expect(secondaryResponse.body.data).toHaveLength(1);
    expect(secondaryResponse.body.data[0].description).toBe('Secondary lunch');
  });

  it('PATCH /api/v1/transactions/:id updates metadata', async () => {
    const context = await createAuthenticatedContext();

    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: 'Checking',
        type: 'depository',
        currencyCode: 'BRL',
      }),
    );

    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({
        name: 'Travel',
        type: 'expense',
      }),
    );

    const initialTag = await tagsService.createTag(
      context.householdContext,
      buildTagInput({ name: 'Initial Tag', color: '#16A34A', icon: 'Tag01Icon' }),
    );
    const updatedTag = await tagsService.createTag(
      context.householdContext,
      buildTagInput({ name: 'Updated Tag', color: '#2563EB', icon: 'Tag01Icon' }),
    );

    const created = await request(app)
      .post('/api/v1/transactions')
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        type: 'expense',
        description: 'Bus ticket',
        amount: 25_000,
        currencyCode: 'BRL',
        paymentMethodCode: 'pix',
        accountId: account.id,
        categoryId: category.id,
        tagIds: [initialTag.id],
        purchaseDate: '2026-03-24',
        postedDate: '2026-03-24',
      });

    const response = await request(app)
      .patch(`/api/v1/transactions/${created.body.data.id}`)
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        description: 'Updated bus ticket',
        tagIds: [updatedTag.id],
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.description).toBe('Updated bus ticket');
    expect(response.body.data.tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Updated Tag', color: '#2563EB', icon: 'Tag01Icon' }),
      ]),
    );
  });

  it('PATCH /api/v1/transactions/:id does not leak cross-household access', async () => {
    const owner = await createAuthenticatedContext();
    const outsider = await createAuthenticatedContext();

    const account = await accountsService.createAccount(
      owner.householdContext,
      buildAccountInput({
        name: 'Protected Checking',
        type: 'depository',
        currencyCode: 'BRL',
      }),
    );
    const category = await categoriesService.createCategory(
      owner.householdContext,
      buildCategoryInput({
        name: 'Protected Food',
        type: 'expense',
      }),
    );

    const created = await request(app)
      .post('/api/v1/transactions')
      .set(createAuthHeaders(owner.token, owner.household.id))
      .send({
        type: 'expense',
        description: 'Protected lunch',
        amount: 2_500,
        currencyCode: 'BRL',
        paymentMethodCode: 'pix',
        accountId: account.id,
        categoryId: category.id,
        purchaseDate: '2026-03-24',
        postedDate: '2026-03-24',
      });

    const response = await request(app)
      .patch(`/api/v1/transactions/${created.body.data.id}`)
      .set(createAuthHeaders(outsider.token, outsider.household.id))
      .send({ description: 'Leaked lunch' });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('DELETE /api/v1/transactions/:id removes the transaction', async () => {
    const context = await createAuthenticatedContext();

    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: 'Checking',
        type: 'depository',
        currencyCode: 'BRL',
      }),
    );

    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({
        name: 'Travel',
        type: 'expense',
      }),
    );

    const created = await request(app)
      .post('/api/v1/transactions')
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        type: 'expense',
        description: 'Bus ticket',
        amount: 25_000,
        currencyCode: 'BRL',
        paymentMethodCode: 'pix',
        accountId: account.id,
        categoryId: category.id,
        purchaseDate: '2026-03-24',
        postedDate: '2026-03-24',
      });

    const deleteResponse = await request(app)
      .delete(`/api/v1/transactions/${created.body.data.id}`)
      .set(createAuthHeaders(context.token, context.household.id));

    expect(deleteResponse.status).toBe(204);

    const listResponse = await request(app)
      .get('/api/v1/transactions')
      .set(createAuthHeaders(context.token, context.household.id));

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(0);
  });

  it('DELETE /api/v1/transactions/:id does not leak cross-household access', async () => {
    const owner = await createAuthenticatedContext();
    const outsider = await createAuthenticatedContext();

    const account = await accountsService.createAccount(
      owner.householdContext,
      buildAccountInput({
        name: 'Delete Protected Checking',
        type: 'depository',
        currencyCode: 'BRL',
      }),
    );
    const category = await categoriesService.createCategory(
      owner.householdContext,
      buildCategoryInput({
        name: 'Delete Protected Food',
        type: 'expense',
      }),
    );

    const created = await request(app)
      .post('/api/v1/transactions')
      .set(createAuthHeaders(owner.token, owner.household.id))
      .send({
        type: 'expense',
        description: 'Protected delete',
        amount: 2_500,
        currencyCode: 'BRL',
        paymentMethodCode: 'pix',
        accountId: account.id,
        categoryId: category.id,
        purchaseDate: '2026-03-24',
        postedDate: '2026-03-24',
      });

    const response = await request(app)
      .delete(`/api/v1/transactions/${created.body.data.id}`)
      .set(createAuthHeaders(outsider.token, outsider.household.id));

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
