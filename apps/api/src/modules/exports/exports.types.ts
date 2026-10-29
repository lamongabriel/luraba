import type { ExportFormat } from "@luraba/contracts/exports";
import type { HouseholdContext } from "@/config/permissions";

export type ExportTable = {
  columns: string[];
  records: Array<Record<string, string | number | boolean | null>>;
};

export type ExportRange = { dateFrom?: string; dateTo?: string };

/**
 * One exporter per kind of data. Add a file to `exporters/` and list it in `exporters/index.ts`; the
 * CSV/JSON serialization, the route and the web list pick it up. Exporters read through the module
 * repositories (household scoped) and return plain tables.
 */
export interface Exporter {
  id: string;
  label: string;
  description: string;
  formats: ExportFormat[];
  supportsDateRange: boolean;
  /** Tables to export. A single-table exporter returns one entry named after itself. */
  load(context: HouseholdContext, range: ExportRange): Promise<Record<string, ExportTable>>;
}
