import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { clampDay, deriveBillingCycleStatus, splitInstallments } from './finance.helpers';

describe('finance.helpers', () => {
  it('splits uneven installment amounts deterministically', () => {
    assert.deepEqual(splitInstallments(100n, 3), [34n, 33n, 33n]);
    assert.deepEqual(splitInstallments(1001n, 4), [251n, 250n, 250n, 250n]);
  });

  it('clamps billing days to the target month length', () => {
    assert.equal(clampDay(2024, 1, 31).toISOString(), '2024-02-29T00:00:00.000Z');
    assert.equal(clampDay(2025, 1, 31).toISOString(), '2025-02-28T00:00:00.000Z');
  });

  it('derives live billing cycle status from dates and outstanding balance', () => {
    const cycle = {
      startDate: new Date('2026-03-16T00:00:00.000Z'),
      closingDate: new Date('2026-04-15T00:00:00.000Z'),
      dueDate: new Date('2026-04-22T00:00:00.000Z'),
    };

    assert.equal(deriveBillingCycleStatus(cycle, 10n, new Date('2026-03-20T00:00:00.000Z')), 'open');
    assert.equal(deriveBillingCycleStatus(cycle, 10n, new Date('2026-04-18T00:00:00.000Z')), 'closed');
    assert.equal(deriveBillingCycleStatus(cycle, 10n, new Date('2026-04-25T00:00:00.000Z')), 'due');
    assert.equal(deriveBillingCycleStatus(cycle, 0n, new Date('2026-04-25T00:00:00.000Z')), 'paid');
  });
});
