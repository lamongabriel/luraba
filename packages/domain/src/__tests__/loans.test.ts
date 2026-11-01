import { describe, expect, it } from "vitest";

import {
  buildLoanSchedule,
  loanDueDate,
  loanPaymentsPerYear,
  loanScheduledPayment,
  summarizeLoan,
} from "../loans.js";

describe("loans", () => {
  it("maps frequencies to payments per year", () => {
    expect(loanPaymentsPerYear("biweekly")).toBe(26);
    expect(loanPaymentsPerYear("other")).toBeNull();
    expect(loanPaymentsPerYear(null)).toBeNull();
  });

  it("computes the due dates, clamping month ends", () => {
    expect(loanDueDate("2026-01-31", "monthly", 1)).toBe("2026-02-28");
    expect(loanDueDate("2026-01-31", "monthly", 2)).toBe("2026-03-31");
    expect(loanDueDate("2026-01-01", "biweekly", 2)).toBe("2026-01-29");
    expect(loanDueDate("2026-11-15", "quarterly", 1)).toBe("2027-02-15");
  });

  it("computes the standard installment", () => {
    // 10,000.00 over 12 months at 12% a year.
    expect(loanScheduledPayment(1_000_000, 12, 12, 12)).toBe(88_849);
    expect(loanScheduledPayment(120_000, 0, 12, 12)).toBe(10_000);
  });

  it("pays a loan off with a trimmed last payment", () => {
    const rows = buildLoanSchedule({
      balance: 100_000,
      annualRatePercent: 0,
      payment: 30_000,
      frequency: "monthly",
      startDate: "2026-01-01",
    });
    expect(rows.map((row) => row.payment)).toEqual([30_000, 30_000, 30_000, 10_000]);
    expect(rows.at(-1)).toMatchObject({ balance: 0, dueDate: "2026-05-01" });
  });

  it("never pays off when the payment does not cover the interest", () => {
    const rows = buildLoanSchedule({
      balance: 100_000,
      annualRatePercent: 120,
      payment: 100,
      frequency: "monthly",
      startDate: "2026-01-01",
      maxPayments: 5,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.balance).toBeGreaterThan(100_000 - 1);
  });

  it("summarizes the outlook for a day", () => {
    const outlook = summarizeLoan(
      {
        principal: 120_000,
        annualRatePercent: 0,
        paymentAmount: 10_000,
        termMonths: 12,
        frequency: "monthly",
        startDate: "2026-01-01",
      },
      "2026-04-15",
    );
    expect(outlook).toMatchObject({
      paymentsMade: 3,
      paymentsTotal: 12,
      interestPaid: 0,
      payoffDate: "2027-01-01",
      scheduledBalance: 90_000,
      nextPayment: { number: 4, dueDate: "2026-05-01" },
    });
    expect(
      summarizeLoan(
        {
          ...{ principal: null },
          annualRatePercent: null,
          paymentAmount: null,
          termMonths: null,
          frequency: null,
          startDate: null,
        },
        "2026-01-01",
      ),
    ).toBeNull();
  });
});
