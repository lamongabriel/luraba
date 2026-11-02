import { billsEndpoints } from "@luraba/contracts";
import { fetchAllPages, PAGE_SIZE } from "../client/fetch-all.js";
import { toMoney } from "../format/money.js";
import type { ToolContext } from "./types.js";

const WINDOW_DAYS = 10;
const AMOUNT_TOLERANCE = 0.25;

function shift(date: string, days: number): string {
  return new Date(Date.parse(date) + days * 86_400_000).toISOString().slice(0, 10);
}

export type BillMatch = {
  billId: string;
  bill: string;
  occurrenceId: string;
  dueDate: string;
  estimated: ReturnType<typeof toMoney>;
};

/**
 * Finds the unpaid bill occurrence a new expense most likely pays: same category or merchant, an
 * amount within 25% of the estimate and a due date within 10 days. When exactly one matches and
 * `link` is set, links it; otherwise the candidates are returned for the agent to confirm.
 */
export async function matchBill(
  context: ToolContext,
  expense: {
    transactionId: string;
    amount: number;
    currencyCode: string;
    date: string;
    categoryId?: string | undefined;
    merchantId?: string | undefined;
  },
  link: boolean,
): Promise<{ linked: BillMatch | null; candidates: BillMatch[] }> {
  if (!expense.categoryId && !expense.merchantId) return { linked: null, candidates: [] };
  try {
    const bills = await fetchAllPages((page) =>
      context.client.request(billsEndpoints.list, {
        query: { page, perPage: PAGE_SIZE, status: "active" },
      }),
    );
    const candidates: BillMatch[] = [];
    for (const bill of bills) {
      if (bill.currencyCode !== expense.currencyCode) continue;
      const sameKind =
        (expense.categoryId && bill.categoryId === expense.categoryId) ||
        (expense.merchantId && bill.merchantId === expense.merchantId);
      if (!sameKind) continue;
      const { data: occurrences } = await context.client.request(billsEndpoints.listOccurrences, {
        params: { id: bill.id },
        query: {
          page: 1,
          perPage: 20,
          from: shift(expense.date, -WINDOW_DAYS),
          to: shift(expense.date, WINDOW_DAYS),
        },
      });
      for (const occurrence of occurrences) {
        const open = occurrence.state === "scheduled" || occurrence.state === "overdue";
        const close =
          Math.abs(expense.amount - occurrence.expectedAmount) <=
          occurrence.expectedAmount * AMOUNT_TOLERANCE;
        if (open && close) {
          candidates.push({
            billId: bill.id,
            bill: bill.name,
            occurrenceId: occurrence.id,
            dueDate: occurrence.dueDate,
            estimated: toMoney(occurrence.expectedAmount, bill.currencyCode),
          });
        }
      }
    }
    const [only] = candidates;
    if (link && only && candidates.length === 1) {
      await context.client.request(billsEndpoints.linkOccurrence, {
        params: { id: only.billId, occurrenceId: only.occurrenceId },
        body: { transactionId: expense.transactionId },
      });
      return { linked: only, candidates: [] };
    }
    return { linked: null, candidates };
  } catch (error) {
    context.logger.warn({ err: error }, "bill matching failed; the transaction itself was created");
    return { linked: null, candidates: [] };
  }
}
