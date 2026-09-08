import { formatISODate, getRecurrencyDates, parseISODate } from "@luraba/domain";
import { describe, expect, it } from "vitest";
import type { RecurringBillRecord } from "../recurring-bills.types";

const monthlyBill = {
  id: "00000000-0000-0000-0000-000000000001",
  householdId: "00000000-0000-0000-0000-000000000002",
  ownerUserId: "00000000-0000-0000-0000-000000000003",
  name: "Rent",
  description: null,
  type: "expense",
  status: "active",
  accountId: "00000000-0000-0000-0000-000000000004",
  categoryId: null,
  merchantId: null,
  paymentMethodId: null,
  amount: 150000,
  currencyCode: "USD",
  startDate: parseISODate("2026-01-31"),
  endDate: null,
  frequency: "monthly",
  dayOfMonth: null,
  dayOfWeek: null,
  createdAt: parseISODate("2026-01-01"),
  updatedAt: parseISODate("2026-01-01"),
} satisfies RecurringBillRecord;

function getBillOccurrenceDates(bill: RecurringBillRecord, from: string, to: string) {
  return getRecurrencyDates(
    {
      startDate: bill.startDate,
      endDate: bill.endDate,
      frequency: bill.frequency,
      dayOfMonth: bill.dayOfMonth,
      dayOfWeek: bill.dayOfWeek,
    },
    { from: parseISODate(from), to: parseISODate(to) },
  );
}

describe("recurring bill occurrence dates", () => {
  it("clamps shorter months without losing the original day anchor", () => {
    const dates = getBillOccurrenceDates(monthlyBill, "2026-01-01", "2026-04-30");

    expect(dates.map(formatISODate)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
    ]);
  });

  it("does not return dates outside the requested range", () => {
    const dates = getBillOccurrenceDates(monthlyBill, "2026-02-01", "2026-03-01");

    expect(dates.map(formatISODate)).toEqual(["2026-02-28"]);
  });
});
