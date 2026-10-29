import { createPurchase } from "@/modules/credit-cards/credit-card-purchases.service";
import type { RowImporter } from "./types";

function addMonths(date: string, months: number): string {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

/**
 * Card charges. A statement line "Parcela 4/12" is the 4th installment of a purchase, so it becomes
 * one purchase of 12 installments, dated so that installment 4 falls on this statement's date.
 * The total is the installment amount times the count (an estimate, flagged on the row).
 */
export const cardPurchasesImporter: RowImporter = {
  id: "card-purchases",
  kinds: ["card_purchase"],
  async importRow({ context, target, row, mapping, amount, date, description }) {
    const number = row.installmentNumber ?? 1;
    const total = row.installmentTotal ?? 1;
    const isInstallment = total > 1;
    const purchaseDate = new Date(
      `${isInstallment ? addMonths(date, -(number - 1)) : date}T00:00:00Z`,
    );

    const purchase = await createPurchase(context, target.id, {
      description,
      amount: isInstallment ? amount * total : amount,
      purchaseDate,
      postedDate: purchaseDate,
      installmentCount: total,
      categoryId: mapping.categoryId,
      merchantId: mapping.merchantId ?? undefined,
      tagIds: mapping.tagIds.length > 0 ? mapping.tagIds : undefined,
      includeInBudget: true,
    });
    return { status: "created", transactionId: purchase.transactionId };
  },
};
