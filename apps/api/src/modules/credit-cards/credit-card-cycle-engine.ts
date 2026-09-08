import type { CreditCardCycleDisplayStatus } from "@luraba/contracts/credit-cards";
import {
  addDays,
  dateWithClampedDay,
  getUTCFullYear,
  getUTCMonth,
  isAfter,
  isBefore,
  isEqual,
} from "@luraba/domain";

export type BillingCycleLike = {
  periodStart: Date;
  periodEnd: Date;
  closingDate: Date;
  dueDate: Date;
  statementAmount: number;
  paidAmount: number;
  remainingAmount: number;
};

export function isDateWithinCycle(date: Date, cycle: { periodStart: Date; periodEnd: Date }) {
  return !isBefore(date, cycle.periodStart) && !isAfter(date, cycle.periodEnd);
}

export function getNextClosingDateOnOrAfter(startDate: Date, closingDay: number): Date {
  const sameMonthClosing = dateWithClampedDay(
    getUTCFullYear(startDate),
    getUTCMonth(startDate),
    closingDay,
  );

  if (!isBefore(sameMonthClosing, startDate)) {
    return sameMonthClosing;
  }

  return dateWithClampedDay(getUTCFullYear(startDate), getUTCMonth(startDate) + 1, closingDay);
}

export function getNextCycleShapeFromPeriodStart(
  periodStart: Date,
  closingDay: number,
  dueDay: number,
) {
  const closingDate = getNextClosingDateOnOrAfter(periodStart, closingDay);
  let dueDate = dateWithClampedDay(getUTCFullYear(closingDate), getUTCMonth(closingDate), dueDay);

  if (!isAfter(dueDate, closingDate)) {
    dueDate = dateWithClampedDay(getUTCFullYear(closingDate), getUTCMonth(closingDate) + 1, dueDay);
  }

  return {
    periodStart,
    periodEnd: closingDate,
    closingDate,
    dueDate,
  };
}

export function getNextPeriodStart(closingDate: Date) {
  return addDays(closingDate, 1);
}

export function deriveCycleDisplayStatus(
  cycle: BillingCycleLike,
  referenceDate: Date,
): CreditCardCycleDisplayStatus {
  if (isBefore(referenceDate, cycle.periodStart)) {
    return "upcoming";
  }

  if (cycle.remainingAmount <= 0 && !isBefore(referenceDate, cycle.closingDate)) {
    return "paid";
  }

  if (
    isDateWithinCycle(referenceDate, cycle) ||
    isEqual(referenceDate, cycle.closingDate) ||
    isEqual(referenceDate, cycle.periodStart)
  ) {
    return "current";
  }

  if (cycle.remainingAmount <= 0) {
    return "paid";
  }

  if (isAfter(referenceDate, cycle.dueDate)) {
    return "overdue";
  }

  if (isAfter(referenceDate, cycle.closingDate)) {
    return "due";
  }

  return "upcoming";
}

export function hasCycleActivity(cycle: BillingCycleLike) {
  return cycle.statementAmount > 0 || cycle.paidAmount > 0 || cycle.remainingAmount > 0;
}
