import type { replaceTransactionItemsBodySchema, TransactionItem } from "@luraba/contracts";
import { productsTable } from "@luraba/db/schemas/products.schema";
import { now } from "@luraba/domain";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import { productsRepository } from "@/modules/products/products.repository";
import { NotFoundError, ValidationError } from "@/shared/errors";
import * as itemsRepository from "./transaction-items.repository";

type ReplaceItemsBody = z.output<typeof replaceTransactionItemsBodySchema>;

async function requireCurrency(context: HouseholdContext, transactionId: string): Promise<string> {
  const currency = await itemsRepository.findHouseholdTransactionCurrency(
    context.householdId,
    transactionId,
  );
  if (!currency) throw new NotFoundError("Transaction");
  return currency;
}

export async function listTransactionItems(
  context: HouseholdContext,
  transactionId: string,
): Promise<TransactionItem[]> {
  await requireCurrency(context, transactionId);
  return itemsRepository.listItems(transactionId);
}

export async function replaceTransactionItems(
  context: HouseholdContext,
  transactionId: string,
  body: ReplaceItemsBody,
): Promise<TransactionItem[]> {
  const currency = await requireCurrency(context, transactionId);

  const productIds = [
    ...new Set(body.items.flatMap((item) => (item.productId ? [item.productId] : []))),
  ];
  const known = new Set((await productsRepository.findByIds(context, productIds)).map((p) => p.id));
  if (productIds.some((id) => !known.has(id))) {
    throw new ValidationError("One of the products does not exist");
  }

  return db.transaction(async (tx) => {
    const resolved: Array<{ productId: string | null; item: (typeof body.items)[number] }> = [];
    for (const item of body.items) {
      let productId = item.productId ?? null;
      if (item.saveAsProductPrice) {
        const existing = productId
          ? await productsRepository.get(productId, context, tx)
          : await productsRepository.findByName(context, item.name, tx);
        if (existing) {
          await tx
            .update(productsTable)
            .set({ price: item.unitPrice, currencyId: currency, updatedAt: now() })
            .where(eq(productsTable.id, existing.id));
          productId = existing.id;
        } else {
          const created = await productsRepository.create(
            context,
            { name: item.name, price: item.unitPrice, currencyId: currency },
            tx,
          );
          productId = created.id;
        }
      }
      resolved.push({ productId, item });
    }

    await itemsRepository.replaceItems(
      tx,
      transactionId,
      resolved.map(({ productId, item }, position) => ({
        transactionId,
        productId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        position,
      })),
    );
    return itemsRepository.listItems(transactionId, tx);
  });
}
