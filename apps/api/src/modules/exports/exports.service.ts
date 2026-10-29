import type {
  Exporter as ExporterInfo,
  ExportFormat,
  ExportQuery,
} from "@luraba/contracts/exports";
import type { HouseholdContext } from "@/config/permissions";
import { NotFoundError, ValidationError } from "@/shared/errors";
import { exporters, getExporter } from "./exporters";
import { toCsv, toJson } from "./exports.format";

export function listExporters(): ExporterInfo[] {
  return exporters.map(({ id, label, description, formats, supportsDateRange }) => ({
    id,
    label,
    description,
    formats,
    supportsDateRange,
  }));
}

export type ExportFile = { fileName: string; contentType: string; body: string };

export async function buildExport(
  context: HouseholdContext,
  exporterId: string,
  query: ExportQuery & { format: ExportFormat },
): Promise<ExportFile> {
  const exporter = getExporter(exporterId);
  if (!exporter) throw new NotFoundError("Exporter");
  if (!exporter.formats.includes(query.format))
    throw new ValidationError(
      `"${exporter.label}" can't be exported as ${query.format.toUpperCase()}`,
    );

  const tables = await exporter.load(context, { dateFrom: query.dateFrom, dateTo: query.dateTo });
  const stamp = new Date().toISOString().slice(0, 10);
  const fileName = `luraba-${exporter.id}-${stamp}.${query.format}`;
  if (query.format === "json") {
    return { fileName, contentType: "application/json; charset=utf-8", body: toJson(tables) };
  }
  const [only] = Object.values(tables);
  if (!only) throw new ValidationError("Nothing to export");
  return { fileName, contentType: "text/csv; charset=utf-8", body: toCsv(only) };
}
