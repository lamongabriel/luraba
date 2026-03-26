export type BudgetMonthStrategy = 'purchase' | 'cycle';
export type BillingCycleStatus = 'future' | 'open' | 'closed' | 'due' | 'paid';

export function monthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function clampDay(year: number, monthIndex: number, day: number): Date {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, monthIndex, Math.min(day, lastDay)));
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function resolveBudgetMonth(
  strategy: BudgetMonthStrategy,
  purchaseDate: Date,
  cycleDate?: Date,
): Date {
  if (strategy === 'cycle' && cycleDate) {
    return monthStart(cycleDate);
  }

  return monthStart(purchaseDate);
}

export function splitInstallments(totalAmount: bigint, count: number): bigint[] {
  if (count <= 0) {
    throw new Error('Installment count must be greater than zero');
  }

  const baseAmount = totalAmount / BigInt(count);
  let remainder = totalAmount % BigInt(count);
  const slices: bigint[] = [];

  for (let index = 0; index < count; index += 1) {
    const extraUnit = remainder > 0n ? 1n : 0n;
    slices.push(baseAmount + extraUnit);
    if (remainder > 0n) {
      remainder -= 1n;
    }
  }

  return slices;
}

export function deriveBillingCycleStatus(
  cycle: {
    startDate: Date;
    closingDate: Date;
    dueDate: Date;
  },
  outstandingAmount: bigint,
  asOfDate: Date = new Date(),
): BillingCycleStatus {
  if (outstandingAmount <= 0n) {
    return 'paid';
  }

  if (asOfDate < cycle.startDate) {
    return 'future';
  }

  if (asOfDate <= cycle.closingDate) {
    return 'open';
  }

  if (asOfDate < cycle.dueDate) {
    return 'closed';
  }

  return 'due';
}
