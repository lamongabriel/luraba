import { describe, expect, it } from 'vitest';
import { getOccurrenceDates } from '../recurring-bills.service';
import type { RecurringBillRecord } from '../recurring-bills.types';

const monthlyBill = {
  id: '00000000-0000-0000-0000-000000000001',
  householdId: '00000000-0000-0000-0000-000000000002',
  ownerUserId: '00000000-0000-0000-0000-000000000003',
  name: 'Rent',
  description: null,
  type: 'expense',
  status: 'active',
  accountId: '00000000-0000-0000-0000-000000000004',
  categoryId: null,
  merchantId: null,
  paymentMethodId: null,
  amount: 150000,
  currencyCode: 'USD',
  startDate: new Date('2026-01-31T00:00:00.000Z'),
  endDate: null,
  frequency: 'monthly',
  dayOfMonth: null,
  dayOfWeek: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
} satisfies RecurringBillRecord;

describe('recurring bill occurrence dates', () => {
  it('clamps shorter months without losing the original day anchor', () => {
    const dates = getOccurrenceDates(
      monthlyBill,
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-04-30T00:00:00.000Z'),
    );

    expect(dates.map((date) => date.toISOString().slice(0, 10))).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
  });

  it('does not return dates outside the requested range', () => {
    const dates = getOccurrenceDates(
      monthlyBill,
      new Date('2026-02-01T00:00:00.000Z'),
      new Date('2026-03-01T00:00:00.000Z'),
    );

    expect(dates.map((date) => date.toISOString().slice(0, 10))).toEqual(['2026-02-28']);
  });
});
