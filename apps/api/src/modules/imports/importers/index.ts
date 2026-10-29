import type { ImportRowKind } from "@luraba/contracts/imports";
import { bankTransactionsImporter } from "./bank-transactions";
import { cardPaymentsImporter } from "./card-payments";
import { cardPurchasesImporter } from "./card-purchases";
import type { RowImporter } from "./types";

export const rowImporters: readonly RowImporter[] = [
  bankTransactionsImporter,
  cardPurchasesImporter,
  cardPaymentsImporter,
];

export function importerFor(kind: ImportRowKind): RowImporter | undefined {
  return rowImporters.find((importer) => importer.kinds.includes(kind));
}
