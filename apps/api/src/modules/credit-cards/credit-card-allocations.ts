import type { TxClient } from "@/db/types";
import { rebuildAllPaymentAllocations } from "./credit-card-payments.service";
import type { CreditCardRow } from "./credit-cards.helpers";

/**
 * THE SEAM for payment allocations. Every code path that changes what an invoice costs (an installment edit, a
 * statement import) calls this one function so the card's payments are laid over its invoices again and
 * `paid == min(statement, payments)` holds with no phantom cents.
 *
 * Today it delegates to `rebuildAllPaymentAllocations` (delete every allocation of the card, then replay its payments
 * oldest first). When the derived-allocations work (`card-allocations-fix`) lands, change the body of this function to
 * call its single "recompute allocations for this card" function and nothing else needs to move.
 */
export async function recomputeCardAllocations(
  tx: TxClient,
  card: CreditCardRow,
  timezone: string,
): Promise<void> {
  await rebuildAllPaymentAllocations(tx, card, timezone);
}
