import type { ImportMapping, ImportRowKind } from "@luraba/contracts/imports";
import type { HouseholdContext } from "@/config/permissions";
import type { ImportTarget } from "../imports.ledger";
import type { ImportBatchRecord, ImportRowRecord } from "../imports.types";

/** What an importer needs to turn one staged row into Luraba records. */
export type ImportRowInput = {
  context: HouseholdContext;
  batch: ImportBatchRecord;
  target: ImportTarget;
  row: ImportRowRecord;
  kind: ImportRowKind;
  mapping: ImportMapping;
  /** Absolute amount in minor units. */
  amount: number;
  /** `YYYY-MM-DD` of the movement. */
  date: string;
  description: string;
};

export type ImportRowResult =
  | { status: "created"; transactionId: string | null; pairKey?: string | null }
  | { status: "duplicate"; message: string };

/**
 * One importer per kind of Luraba record. The processor picks the importer whose `kinds` include
 * the row's resolved kind; adding a new target (for example investment positions) means adding an
 * importer to `importers/index.ts`.
 */
export interface RowImporter {
  id: string;
  kinds: readonly ImportRowKind[];
  importRow(input: ImportRowInput): Promise<ImportRowResult>;
}
