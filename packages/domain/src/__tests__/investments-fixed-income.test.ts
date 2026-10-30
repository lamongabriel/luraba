import { describe, expect, it } from "vitest";
import { BusinessCalendar, easterSunday } from "../investments/calendar.js";
import { Dec, d } from "../investments/decimal.js";
import { accrualFactor, type FixedIncomeTerms } from "../investments/fixed-income.js";

const calendar = BusinessCalendar.anbima(2023, 2026);
const data = {
  cdiAnnualProjection: "0.1065",
  ipcaMonthly: (m: string) => (m === "2024-03" ? d("0.0016") : undefined),
  ipcaProjectionMonthly: "0.004",
};
const base = { dayCount: "BUS_252", issueDate: "2024-01-02", maturityDate: "2030-01-01" } as const;

describe("calendar", () => {
  it("computes Easter and skips holidays when counting business days", () => {
    expect(easterSunday(2024)).toBe("2024-03-31");
    // Mon 23, Tue 24, (Wed 25 Christmas), Thu 26 accrue; Fri 27 is the end day.
    expect(calendar.countBusinessDays("2024-12-23", "2024-12-27")).toBe(3);
    // Carnival Mon/Tue 2024 (Feb 12-13) and Good Friday (Mar 29) are not business days.
    expect(calendar.isBusinessDay("2024-02-12")).toBe(false);
    expect(calendar.isBusinessDay("2024-03-29")).toBe(false);
    expect(calendar.isBusinessDay("2024-11-20")).toBe(false);
    expect(calendar.isBusinessDay("2023-11-20")).toBe(true);
  });

  it("finds the DARF due date", () => {
    // Last business day of April 2024 is Tue Apr 30.
    expect(calendar.lastBusinessDayOfMonth(2024, 4)).toBe("2024-04-30");
    // Nov 2024 ends on Saturday the 30th => Friday the 29th.
    expect(calendar.lastBusinessDayOfMonth(2024, 11)).toBe("2024-11-29");
  });
});

describe("accrual", () => {
  it("CDB 110% of CDI", () => {
    const terms: FixedIncomeTerms = {
      ...base,
      indexer: "CDI",
      rateForm: "PCT_OF_INDEXER",
      rate: "1.10",
    };
    const { factor, businessDays } = accrualFactor(
      terms,
      "2024-01-02",
      "2024-02-01",
      data,
      calendar,
    );
    expect(businessDays).toBe(22);
    expect(factor.toNumber()).toBeCloseTo(1.0097657751547704, 10);
  });

  it("uses published daily CDI over the projection", () => {
    const terms: FixedIncomeTerms = {
      ...base,
      indexer: "CDI",
      rateForm: "PCT_OF_INDEXER",
      rate: "1",
    };
    const published = { ...data, cdiDaily: () => new Dec("0.0005") };
    const { factor, estimated } = accrualFactor(
      terms,
      "2024-01-02",
      "2024-01-05",
      published,
      calendar,
    );
    expect(estimated).toBe(false);
    expect(factor.toNumber()).toBeCloseTo(1.0005 ** 3, 12);
  });

  it("CDI + 2% spread", () => {
    const terms: FixedIncomeTerms = {
      ...base,
      indexer: "CDI",
      rateForm: "INDEXER_PLUS_SPREAD",
      rate: "0.02",
    };
    const { factor } = accrualFactor(terms, "2024-01-02", "2024-02-01", data, calendar);
    expect(factor.toNumber()).toBeCloseTo(1.0106198804422066, 10);
  });

  it("IPCA + 6% over a full month and half a month", () => {
    const terms: FixedIncomeTerms = {
      ...base,
      indexer: "IPCA",
      rateForm: "INDEXER_PLUS_SPREAD",
      rate: "0.06",
    };
    const full = accrualFactor(terms, "2024-03-01", "2024-04-01", data, calendar);
    expect(full.factor.toNumber()).toBeCloseTo(1.0062426424585533, 10);
    expect(full.estimated).toBe(false);
    const half = accrualFactor(terms, "2024-03-01", "2024-03-15", data, calendar);
    expect(half.factor.toNumber()).toBeCloseTo(1.0031164650520665, 10);
    const projected = accrualFactor(terms, "2024-05-01", "2024-06-03", data, calendar);
    expect(projected.estimated).toBe(true);
  });

  it("prefixado 12% over exactly 252 business days is 1.12", () => {
    const terms: FixedIncomeTerms = {
      ...base,
      indexer: "PREFIXADO",
      rateForm: "FIXED_ANNUAL",
      rate: "0.12",
    };
    const end = calendar.addBusinessDays("2024-01-02", 252);
    const { factor, businessDays } = accrualFactor(terms, "2024-01-02", end, data, calendar);
    expect(businessDays).toBe(252);
    expect(factor.toNumber()).toBeCloseTo(1.12, 12);
  });

  it("US fixed ACT/365 for a year", () => {
    const terms: FixedIncomeTerms = {
      indexer: "US_FIXED",
      rateForm: "FIXED_ANNUAL",
      rate: "0.05",
      dayCount: "ACT_365",
      issueDate: "2023-01-01",
      maturityDate: "2030-01-01",
    };
    expect(
      accrualFactor(terms, "2023-01-01", "2024-01-01", data, calendar).factor.toNumber(),
    ).toBeCloseTo(1.05, 12);
  });
});
