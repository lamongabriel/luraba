import {
  MONTHLY_PLAN_SALARY_CATEGORY,
  MONTHLY_PLAN_TAXES_CATEGORY,
  type MonthlyPlanLineKind,
  type MonthlyPlanMonth,
  type MonthlyPlanReport,
  type MonthlyPlanReportLine,
  SALARY_NEXT_MONTH_FROM_DAY,
  type setMonthlyPlanBodySchema,
} from "@luraba/contracts/monthly-plans";
import { transactionAnalyticsQuerySchema } from "@luraba/contracts/transactions";
import { formatISODate, parseISODate } from "@luraba/domain";
import type { z } from "zod";
import type { HouseholdContext } from "@/config/permissions";
import { fxService } from "@/modules/fx/fx.service";
import { goalsRepository } from "@/modules/goals/goals.repository";
import { aggregateTransactionFeed } from "@/modules/transactions/transactions.analytics.repository";
import { ValidationError } from "@/shared/errors";
import { type CompetencyRow, monthlyPlansRepository } from "./monthly-plans.repository";

type SetPlanInput = z.output<typeof setMonthlyPlanBodySchema>;

const MAX_MONTHS = 60;

const monthStart = (key: string) => parseISODate(`${key}-01`);
const monthKey = (date: Date) => formatISODate(date).slice(0, 7);

/** The `YYYY-MM` keys from `from` to `to`, inclusive. */
function expandMonths(from: string, to: string): string[] {
  const keys: string[] = [];
  const cursor = monthStart(from);
  while (monthKey(cursor) <= to) {
    keys.push(monthKey(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    if (keys.length > MAX_MONTHS)
      throw new ValidationError(`A plan covers at most ${MAX_MONTHS} months`);
  }
  return keys;
}

function lastDayOf(key: string): string {
  const end = monthStart(key);
  end.setUTCMonth(end.getUTCMonth() + 1);
  end.setUTCDate(0);
  return formatISODate(end);
}

export async function setMonthlyPlan(
  context: HouseholdContext,
  body: SetPlanInput,
): Promise<MonthlyPlanReport> {
  const to = body.to ?? body.from;
  const keys = expandMonths(body.from, to);
  for (const line of body.lines) {
    if (line.goalId && !(await goalsRepository.get(line.goalId, context))) {
      throw new ValidationError("A goal in the plan was not found");
    }
  }
  await monthlyPlansRepository.replaceMonths(
    context,
    keys.map(monthStart),
    keys.flatMap((key) =>
      body.lines.map((line) => ({
        month: monthStart(key),
        kind: line.kind,
        goalId: line.goalId ?? null,
        amount: line.amount,
        currencyCode: body.currencyCode,
      })),
    ),
  );
  return getMonthlyPlanReport(context, { from: body.from, to, currencyCode: body.currencyCode });
}

export async function getMonthlyPlanReport(
  context: HouseholdContext,
  query: { from: string; to?: string; currencyCode?: string },
): Promise<MonthlyPlanReport> {
  const to = query.to ?? query.from;
  const keys = expandMonths(query.from, to);
  const planLines = await monthlyPlansRepository.listBetween(
    context,
    monthStart(query.from),
    monthStart(to),
  );
  const householdCurrency = await monthlyPlansRepository.defaultCurrency(context);
  const currencyCode = query.currencyCode ?? planLines[0]?.currencyCode ?? householdCurrency;

  const convert = async (amount: number, from: string, date: string) =>
    from === currencyCode
      ? amount
      : fxService.convertAmount({
          amount,
          fromCurrencyCode: from,
          toCurrencyCode: currencyCode,
          date: parseISODate(date),
        });

  const [salaryId, taxesId, goals] = await Promise.all([
    monthlyPlansRepository.findCategoryId(context, MONTHLY_PLAN_SALARY_CATEGORY.name),
    monthlyPlansRepository.findCategoryId(context, MONTHLY_PLAN_TAXES_CATEGORY.name),
    goalsRepository.listAll(context),
  ]);
  const goalById = new Map(goals.map((goal) => [goal.id, goal]));
  const contributions = await goalsRepository.listContributions(goals.map((goal) => goal.id));

  const salaryRows: CompetencyRow[] = salaryId
    ? await monthlyPlansRepository.listCategoryByCompetency(
        context,
        salaryId,
        "income",
        SALARY_NEXT_MONTH_FROM_DAY,
      )
    : [];
  const taxRows: CompetencyRow[] = taxesId
    ? await monthlyPlansRepository.listCategoryByCompetency(context, taxesId, "expense", 32)
    : [];

  const months: MonthlyPlanMonth[] = [];
  for (const key of keys) {
    const lines = planLines.filter((line) => monthKey(line.month) === key);
    const sumRows = async (rows: CompetencyRow[]) => {
      let total = 0;
      for (const row of rows.filter((item) => item.month === key)) {
        total += await convert(row.amount, row.currencyCode, row.postedDate);
      }
      return total;
    };
    const salaryActual = await sumRows(salaryRows);
    const taxesActual = await sumRows(taxRows);

    const goalLines: MonthlyPlanReportLine[] = [];
    const investments = { projected: 0, actual: 0 };
    const saved = { projected: 0, actual: 0 };
    for (const line of lines.filter((item) => item.kind === "goal")) {
      const goal = line.goalId ? goalById.get(line.goalId) : undefined;
      if (!goal) continue;
      let actual = 0;
      for (const row of contributions) {
        if (row.goalId !== goal.id || row.kind === "move" || monthKey(row.contributedOn) !== key)
          continue;
        actual += await convert(row.amount, goal.currencyCode, formatISODate(row.contributedOn));
      }
      goalLines.push({
        kind: "goal",
        goalId: goal.id,
        label: goal.name,
        projected: line.amount,
        actual,
        difference: actual - line.amount,
      });
      const bucket = goal.kind === "investment" ? investments : saved;
      bucket.projected += line.amount;
      bucket.actual += actual;
    }

    const amountOf = (kind: MonthlyPlanLineKind) =>
      lines.find((line) => line.kind === kind)?.amount ?? 0;
    const salaryProjected = amountOf("salary");
    const taxesProjected = amountOf("taxes");
    const toSpendLine = lines.find((line) => line.kind === "to_spend");
    const toSpendProjected =
      toSpendLine?.amount ??
      salaryProjected - taxesProjected - investments.projected - saved.projected;

    // Spending as the spending report counts it (net of refunds), without the plan's tax line.
    const feed = await aggregateTransactionFeed(
      context.householdId,
      transactionAnalyticsQuerySchema.parse({
        dateFrom: `${key}-01`,
        dateTo: lastDayOf(key),
      }),
      lastDayOf(key),
    );
    let toSpendActual = 0;
    for (const row of feed) {
      if (row.originType === "income" || row.categoryId === taxesId) continue;
      const value = await convert(row.amount, row.currencyCode, row.date);
      toSpendActual += row.originType === "refund" ? -value : value;
    }

    const line = (
      kind: MonthlyPlanLineKind,
      label: string,
      projected: number,
      actual: number,
    ): MonthlyPlanReportLine => ({
      kind,
      goalId: null,
      label,
      projected,
      actual,
      difference: actual - projected,
    });
    months.push({
      month: key,
      currencyCode,
      hasPlan: lines.length > 0,
      lines: [
        line("salary", "Salary", salaryProjected, salaryActual),
        line("taxes", "Taxes", taxesProjected, taxesActual),
        ...goalLines,
        line("to_spend", "To spend", toSpendProjected, toSpendActual),
      ],
      investments,
      saved,
      salaryReceivedOn: salaryRows.filter((row) => row.month === key).map((row) => row.postedDate),
    });
  }

  let fx: MonthlyPlanReport["fx"] = null;
  if (householdCurrency !== currencyCode) {
    try {
      const date = new Date();
      const resolved = await fxService.getRate({
        fromCurrencyCode: currencyCode,
        toCurrencyCode: householdCurrency,
        date,
      });
      fx = {
        from: currencyCode,
        to: householdCurrency,
        rate: resolved.rateNumerator / resolved.rateDenominator,
        rateDate: formatISODate(resolved.rateDate),
      };
    } catch {
      fx = null;
    }
  }
  return { currencyCode, months, fx };
}
