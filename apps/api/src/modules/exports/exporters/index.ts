import type { Exporter } from "../exports.types";
import {
  accountsExporter,
  categoriesExporter,
  creditCardsExporter,
  merchantsExporter,
  tagsExporter,
} from "./lists";
import { transactionsExporter } from "./transactions";

const singleExporters: readonly Exporter[] = [
  transactionsExporter,
  accountsExporter,
  creditCardsExporter,
  merchantsExporter,
  categoriesExporter,
  tagsExporter,
];

/** Everything above in one JSON document, keyed by table. */
const everythingExporter: Exporter = {
  id: "everything",
  label: "Everything",
  description: "All of the above in one JSON file.",
  formats: ["json"],
  supportsDateRange: true,
  async load(context, range) {
    const parts = await Promise.all(
      singleExporters.map((exporter) => exporter.load(context, range)),
    );
    return Object.assign({}, ...parts);
  },
};

/** The exporter registry: add an exporter by writing one and listing it here. */
export const exporters: readonly Exporter[] = [...singleExporters, everythingExporter];

export function getExporter(id: string): Exporter | undefined {
  return exporters.find((exporter) => exporter.id === id);
}
