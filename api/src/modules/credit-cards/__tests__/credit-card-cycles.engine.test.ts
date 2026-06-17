import { describe, expect, it } from 'vitest';
import {
  deriveCycleDisplayStatus,
  getNextCycleShapeFromPeriodStart,
  hasCycleActivity,
} from '../credit-card-cycle-engine';

describe('credit card cycle engine', () => {
  it('builds a contiguous cycle from a period start', () => {
    const cycle = getNextCycleShapeFromPeriodStart(new Date('2026-03-26T00:00:00.000Z'), 25, 5);

    expect(cycle.periodStart).toEqual(new Date('2026-03-26T00:00:00.000Z'));
    expect(cycle.periodEnd).toEqual(new Date('2026-04-25T00:00:00.000Z'));
    expect(cycle.closingDate).toEqual(new Date('2026-04-25T00:00:00.000Z'));
    expect(cycle.dueDate).toEqual(new Date('2026-05-05T00:00:00.000Z'));
  });

  it('derives current, due, overdue, and paid display states', () => {
    const baseCycle = {
      periodStart: new Date('2026-03-26T00:00:00.000Z'),
      periodEnd: new Date('2026-04-25T00:00:00.000Z'),
      closingDate: new Date('2026-04-25T00:00:00.000Z'),
      dueDate: new Date('2026-05-05T00:00:00.000Z'),
      statementAmount: 12_000,
      paidAmount: 0,
      remainingAmount: 12_000,
    };

    expect(deriveCycleDisplayStatus(baseCycle, new Date('2026-04-10T00:00:00.000Z'))).toBe(
      'current',
    );
    expect(deriveCycleDisplayStatus(baseCycle, new Date('2026-04-30T00:00:00.000Z'))).toBe('due');
    expect(deriveCycleDisplayStatus(baseCycle, new Date('2026-05-10T00:00:00.000Z'))).toBe(
      'overdue',
    );
    expect(
      deriveCycleDisplayStatus(
        {
          ...baseCycle,
          paidAmount: 12_000,
          remainingAmount: 0,
        },
        new Date('2026-05-10T00:00:00.000Z'),
      ),
    ).toBe('paid');
  });

  it('marks activity when there is statement, payment, or remaining balance', () => {
    expect(
      hasCycleActivity({
        periodStart: new Date('2026-03-26T00:00:00.000Z'),
        periodEnd: new Date('2026-04-25T00:00:00.000Z'),
        closingDate: new Date('2026-04-25T00:00:00.000Z'),
        dueDate: new Date('2026-05-05T00:00:00.000Z'),
        statementAmount: 0,
        paidAmount: 0,
        remainingAmount: 0,
      }),
    ).toBe(false);

    expect(
      hasCycleActivity({
        periodStart: new Date('2026-03-26T00:00:00.000Z'),
        periodEnd: new Date('2026-04-25T00:00:00.000Z'),
        closingDate: new Date('2026-04-25T00:00:00.000Z'),
        dueDate: new Date('2026-05-05T00:00:00.000Z'),
        statementAmount: 5_000,
        paidAmount: 0,
        remainingAmount: 5_000,
      }),
    ).toBe(true);
  });
});
