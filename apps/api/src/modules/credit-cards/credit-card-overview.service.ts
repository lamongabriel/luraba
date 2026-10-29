import {
  buildLimitBreakdown,
  formatISODate,
  formatMonthKey,
  getTodayInTimezone,
  parseMonthKey,
  pickDefaultInvoiceMonth,
  startOfMonth,
  sumLimitBreakdowns,
} from "@luraba/domain";
import type { HouseholdContext } from "@/config/permissions";
import { listCyclesThroughMonth } from "./credit-card-cycles.service";
import * as creditCardsRepository from "./credit-cards.repository";
import type {
  CreditCardCycleSummary,
  CreditCardOverviewQuery,
  CreditCardOverviewResponse,
} from "./credit-cards.types";

type OverviewCard = CreditCardOverviewResponse["cards"][number];

/** The invoice named after the month it is due in, like the banks' "November invoice". */
function pickInvoiceForMonth(cycles: CreditCardCycleSummary[], monthKey: string) {
  const invoice = cycles
    .filter((cycle) => cycle.dueDate.slice(0, 7) === monthKey)
    .sort((left, right) => (left.dueDate < right.dueDate ? -1 : 1))[0];
  if (!invoice) return null;

  return {
    cycleId: invoice.id,
    displayStatus: invoice.displayStatus,
    closingDate: invoice.closingDate,
    dueDate: invoice.dueDate,
    statementAmount: invoice.statementAmount,
    paidAmount: invoice.paidAmount,
    remainingAmount: invoice.remainingAmount,
  };
}

/**
 * Month view across every card of the household: the invoice due in the month and the limit each
 * card has used (closed invoice, open invoice, future installments). Totals are per currency.
 */
export async function getOverview(
  context: HouseholdContext,
  query: CreditCardOverviewQuery,
): Promise<CreditCardOverviewResponse> {
  const todayDate = getTodayInTimezone(context.timezone);
  const today = formatISODate(todayDate);
  const currentMonth = startOfMonth(todayDate);
  const cards = await creditCardsRepository.listByHouseholdId(context.householdId);

  // Without a month, open on the invoice that still needs attention, not the calendar month.
  let monthStart = query.month ? parseMonthKey(query.month) : currentMonth;
  if (!query.month) {
    const current = await Promise.all(
      cards.map((card) => listCyclesThroughMonth(context, card, currentMonth)),
    );
    monthStart = parseMonthKey(
      pickDefaultInvoiceMonth(current.flat(), formatMonthKey(currentMonth)),
    );
  }
  const monthKey = formatMonthKey(monthStart);

  const overviewCards: OverviewCard[] = await Promise.all(
    cards.map(async (card) => {
      const cycles = await listCyclesThroughMonth(context, card, monthStart);

      return {
        creditCardId: card.id,
        name: card.name,
        institutionName: card.institutionName,
        brand: card.brand,
        last4: card.last4,
        color: card.color,
        currencyCode: card.currencyCode,
        closingDay: card.closingDay,
        dueDay: card.dueDay,
        invoice: pickInvoiceForMonth(cycles, monthKey),
        limit: buildLimitBreakdown(card.creditLimitAmount, cycles, today),
      };
    }),
  );

  const currencies = [...new Set(overviewCards.map((card) => card.currencyCode))].sort();
  const totals = currencies.map((currencyCode) => {
    const group = overviewCards.filter((card) => card.currencyCode === currencyCode);
    const invoices = group.flatMap((card) => (card.invoice ? [card.invoice] : []));
    const sum = (pick: (invoice: (typeof invoices)[number]) => number) =>
      invoices.reduce((total, invoice) => total + pick(invoice), 0);

    return {
      currencyCode,
      invoiceAmount: sum((invoice) => invoice.statementAmount),
      invoicePaidAmount: sum((invoice) => invoice.paidAmount),
      invoiceRemainingAmount: sum((invoice) => invoice.remainingAmount),
      limit: sumLimitBreakdowns(group.map((card) => card.limit)),
    };
  });

  return { month: monthKey, cards: overviewCards, totals };
}
