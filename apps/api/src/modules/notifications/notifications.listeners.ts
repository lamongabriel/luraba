import type { HouseholdContext } from "@/config/permissions";
import { notify } from "./notifications.emitter";
import * as repository from "./notifications.repository";

function formatAmount(amountMinor: number, currencyCode: string): string {
  try {
    const formatter = new Intl.NumberFormat("en", { style: "currency", currency: currencyCode });
    const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
    return formatter.format(amountMinor / 10 ** digits);
  } catch {
    return `${amountMinor} ${currencyCode}`;
  }
}

/**
 * Tells the other household members that someone recorded a transaction.
 * The author is never notified about their own entry.
 */
export async function notifyTransactionCreated(
  context: HouseholdContext,
  transaction: {
    id: string;
    type: string;
    description: string;
    amount: number;
    currencyCode: string;
  },
): Promise<void> {
  if (transaction.type === "adjustment") return;

  const recipients = await repository.listOtherHouseholdMemberIds(
    context.householdId,
    context.userId,
  );
  if (recipients.length === 0) return;

  const author = (await repository.getUserName(context.userId)) ?? "A household member";
  const amount = formatAmount(Math.abs(transaction.amount), transaction.currencyCode);

  await notify({
    userIds: recipients,
    eventType: "transaction.created",
    title: `${author} added a ${transaction.type}`,
    body: `${transaction.description} · ${amount}`,
    url: "/transactions",
    householdId: context.householdId,
    data: { transactionId: transaction.id },
    dedupeKey: `transaction.created:${transaction.id}`,
  });
}
