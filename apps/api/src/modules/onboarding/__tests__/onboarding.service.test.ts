import {
  COUNTRY_CODE_VALUES,
  CREDIT_EXPENSE_TIMING_VALUES,
  CREDIT_INSTALLMENT_BUDGET_MODE_VALUES,
  DATE_FORMAT_VALUES,
  LANGUAGE_VALUES,
  PREFERRED_PERIOD_VALUES,
  PREFERRED_THEME_VALUES,
  TIMEZONE_VALUES,
} from "@/shared/validation/preferences";
import * as onboardingService from "../onboarding.service";

describe("onboarding service", () => {
  it("getOptions returns the seeded currencies and shared option lists", async () => {
    const result = await onboardingService.getOptions();

    expect(result.languages).toEqual([...LANGUAGE_VALUES]);
    expect(result.timezones).toEqual([...TIMEZONE_VALUES]);
    expect(result.dateFormats).toEqual([...DATE_FORMAT_VALUES]);
    expect(result.preferredPeriods).toEqual([...PREFERRED_PERIOD_VALUES]);
    expect(result.preferredThemes).toEqual([...PREFERRED_THEME_VALUES]);
    expect(result.countryCodes).toEqual([...COUNTRY_CODE_VALUES]);
    expect(result.creditExpenseTimings).toEqual([...CREDIT_EXPENSE_TIMING_VALUES]);
    expect(result.creditInstallmentBudgetModes).toEqual([...CREDIT_INSTALLMENT_BUDGET_MODE_VALUES]);
    expect(result.budgetMonthStartDays).toEqual(
      Array.from({ length: 31 }, (_, index) => index + 1),
    );

    expect(result.currencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "BRL", symbol: "R$", precision: 2 }),
        expect.objectContaining({ code: "USD", symbol: "$", precision: 2 }),
      ]),
    );
  });
});
