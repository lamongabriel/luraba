import { paymentMethodsRepository } from "@/modules/payment-methods/payment-methods.repository";
import { createTransaction } from "@/modules/transactions/transactions.service";
import { ValidationError } from "@/shared/errors";
import type { RowImporter } from "./types";

/** Income, expense and transfers on a bank, cash or investment account. */
export const bankTransactionsImporter: RowImporter = {
  id: "bank-transactions",
  kinds: ["expense", "income", "transfer"],
  async importRow({ context, target, row, kind, mapping, amount, date, description }) {
    const common = {
      description,
      purchaseDate: new Date(`${date}T00:00:00Z`),
      postedDate: new Date(`${date}T00:00:00Z`),
    };

    if (kind === "transfer") {
      if (!mapping.accountId) throw new ValidationError("The transfer has no counterpart account");
      const outgoing = (row.amount ?? 0) < 0;
      const transfer = await createTransaction(context, {
        type: "transfer",
        ...common,
        fromAccountId: outgoing ? target.id : mapping.accountId,
        toAccountId: outgoing ? mapping.accountId : target.id,
        fromAmount: amount,
      });
      return { status: "created", transactionId: transfer.id };
    }

    const hinted = typeof row.hints.paymentMethod === "string" ? row.hints.paymentMethod : null;
    const hintedMethod = hinted
      ? await paymentMethodsRepository.findAvailableByCode(context, hinted, target.currencyCode)
      : undefined;
    const transaction = await createTransaction(context, {
      type: kind === "income" ? "income" : "expense",
      ...common,
      amount,
      currencyCode: target.currencyCode,
      accountId: target.id,
      paymentMethodCode: hintedMethod ? (hinted ?? "debit_card") : "debit_card",
      categoryId: mapping.categoryId,
      merchantId: mapping.merchantId ?? undefined,
      tagIds: mapping.tagIds.length > 0 ? mapping.tagIds : undefined,
    });
    return { status: "created", transactionId: transaction.id };
  },
};
