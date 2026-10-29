import { createPayment } from "@/modules/credit-cards/credit-card-payments.service";
import { ValidationError } from "@/shared/errors";
import type { RowImporter } from "./types";

/** Invoice payments, from a bank statement (maps to the card) or a card statement (maps to the payer). */
export const cardPaymentsImporter: RowImporter = {
  id: "card-payments",
  kinds: ["card_payment"],
  async importRow({ context, batch, target, mapping, amount, date, description }) {
    const fromBank = batch.sourceKind === "bank_account";
    const cardId = fromBank ? mapping.creditCardId : target.id;
    const fromAccountId = fromBank ? target.id : mapping.accountId;
    if (!cardId || !fromAccountId)
      throw new ValidationError("The payment is missing its card or paying account");

    const payment = await createPayment(context, cardId, {
      amount,
      fromAccountId,
      paymentDate: new Date(`${date}T00:00:00Z`),
      description,
    });
    return { status: "created", transactionId: payment.transactionId ?? null };
  },
};
