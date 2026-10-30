import type { ImportPreview } from "@luraba/contracts/investments";
import { d } from "@luraba/domain";
import { readSheet } from "read-excel-file/node";
import type { HouseholdContext } from "@/config/permissions";
import { decodeFileBytes } from "@/modules/imports/parsers/text";
import { NotFoundError, ValidationError } from "@/shared/errors";
import {
  type ParsedEvent,
  type ParsedRow,
  parseAppCsv,
  parseB3Movimentacao,
  parseB3Negociacao,
  parseCsvTable,
  parseGenericCsv,
  parseJsonBackup,
  type Table,
} from "./imports/parsers";
import { requireInvestmentAccount } from "./investments.accounts.service";
import { buildEventValues, dedupHashOf, insertEventsBulk } from "./investments.events.service";
import { loadTaxRules } from "./investments.macro";
import * as repo from "./investments.repository";

type StagedRow = ParsedRow & { assetId: string | null; duplicate: boolean };

type PreviewInput = {
  accountId: string;
  format: string;
  fileName?: string;
  content: string;
  encoding: "text" | "base64";
  mapping?: Record<string, string>;
  saveMapping?: boolean;
};

async function xlsxToTable(bytes: Buffer): Promise<Table> {
  const sheet = await readSheet(bytes);
  const cell = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return String(v);
  };
  const [headers = [], ...rows] = sheet.map((row) => row.map(cell));
  return {
    headers: headers.map((h) => h.trim()),
    rows: rows.filter((r) => r.some((c) => c.trim() !== "")),
  };
}

async function readTable(input: PreviewInput): Promise<Table> {
  if (input.encoding === "base64") {
    const bytes = Buffer.from(input.content, "base64");
    const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
    if (isZip) return xlsxToTable(bytes);
    return parseCsvTable(decodeFileBytes(bytes));
  }
  return parseCsvTable(input.content);
}

export async function previewImport(
  context: HouseholdContext,
  input: PreviewInput,
): Promise<ImportPreview> {
  const account = await requireInvestmentAccount(context, input.accountId);
  let parsed: ParsedRow[];
  switch (input.format) {
    case "json_backup":
      parsed = parseJsonBackup(
        input.encoding === "base64"
          ? decodeFileBytes(Buffer.from(input.content, "base64"))
          : input.content,
      );
      break;
    case "app_csv":
      parsed = parseAppCsv(await readTable(input), account.currencyId);
      break;
    case "b3_negociacao":
      parsed = parseB3Negociacao(await readTable(input));
      break;
    case "b3_movimentacao":
      parsed = parseB3Movimentacao(await readTable(input));
      break;
    case "generic_csv": {
      const mapping = input.mapping ?? {};
      if (!mapping.date || !mapping.type)
        throw new ValidationError("Map at least the date and type columns");
      parsed = parseGenericCsv(await readTable(input), mapping, account.currencyId);
      if (input.saveMapping)
        await repo.saveImportMapping(context, input.fileName ?? "default", mapping);
      break;
    }
    default:
      throw new ValidationError(`Unsupported format ${input.format}`);
  }

  const symbols = [...new Set(parsed.map((p) => p.event?.symbol).filter((s): s is string => !!s))];
  const assets = await repo.findAssetsBySymbols(context, symbols, account.settings.country);

  // Duplicates: same external id, or the same trade already stored (identical trades on one day count).
  const externalIds = parsed.map((p) => p.event?.externalId).filter((s): s is string => !!s);
  const knownExternal = await repo.eventsRepository.findByExternalIds(
    context,
    account.id,
    externalIds,
  );
  const staged: StagedRow[] = parsed.map((p) => ({ ...p, assetId: null, duplicate: false }));
  const hashes: string[] = [];
  const keyOf = new Map<number, string>();
  for (const row of staged) {
    if (row.status !== "ok" || !row.event) continue;
    const asset = row.event.symbol ? assets.get(row.event.symbol) : undefined;
    if (row.event.symbol && !asset) {
      row.status = "error";
      row.message = `Asset ${row.event.symbol} is not in the catalog: add it first, then preview again`;
      continue;
    }
    row.assetId = asset?.id ?? null;
    const gross =
      row.event.grossAmount === "0" && row.event.quantity && row.event.unitPrice
        ? String(d(row.event.quantity).mul(row.event.unitPrice))
        : row.event.grossAmount;
    const hash = dedupHashOf({
      tradeDate: row.event.tradeDate,
      assetId: row.assetId,
      type: row.event.type,
      quantity: row.event.quantity,
      unitPrice: row.event.unitPrice,
      grossAmount: gross,
    });
    keyOf.set(row.row, hash);
    hashes.push(hash);
  }
  const stored = await repo.dedupHashCounts(context, account.id, hashes);
  const seen = new Map<string, number>();
  for (const row of staged) {
    if (row.status !== "ok" || !row.event) continue;
    const hash = keyOf.get(row.row) as string;
    const ordinal = (seen.get(hash) ?? 0) + 1;
    seen.set(hash, ordinal);
    if (
      (row.event.externalId && knownExternal.has(row.event.externalId)) ||
      (stored.get(hash) ?? 0) >= ordinal
    ) {
      row.duplicate = true;
    }
  }

  const batch = await repo.insertImportBatch({
    householdId: context.householdId,
    accountId: account.id,
    format: input.format,
    fileName: input.fileName ?? null,
    rows: staged,
    summary: {},
    createdByUserId: context.userId,
  });

  const unsupportedTypes = [
    ...new Set(
      staged.filter((r) => r.status === "unsupported").map((r) => r.unsupportedType ?? "other"),
    ),
  ];
  return {
    batchId: batch.id,
    format: input.format,
    total: staged.length,
    ok: staged.filter((r) => r.status === "ok" && !r.duplicate).length,
    duplicates: staged.filter((r) => r.duplicate).length,
    errors: staged.filter((r) => r.status === "error").length,
    unsupported: staged.filter((r) => r.status === "unsupported").length,
    unsupportedTypes,
    rows: staged.slice(0, 2000).map((r) => ({
      row: r.row,
      status: r.duplicate ? "duplicate" : r.status,
      message: r.duplicate ? "Already imported" : r.message,
      event: r.event
        ? {
            type: r.event.type as never,
            tradeDate: r.event.tradeDate,
            symbol: r.event.symbol,
            quantity: r.event.quantity,
            unitPrice: r.event.unitPrice,
            grossAmount: r.event.grossAmount,
            fees: r.event.fees,
            taxesWithheld: r.event.taxesWithheld,
            currencyCode: r.event.currencyCode,
          }
        : null,
      raw: r.raw,
    })),
  };
}

export async function commitImport(
  context: HouseholdContext,
  batchId: string,
  options: { skipRows: number[]; includeDuplicates: boolean },
) {
  const batch = await repo.getImportBatch(context, batchId);
  if (!batch) throw new NotFoundError("Import batch");
  if (batch.status === "committed") throw new ValidationError("This import was already committed");
  const account = await requireInvestmentAccount(context, batch.accountId);
  const rows = batch.rows as StagedRow[];
  const skip = new Set(options.skipRows);
  const take = rows.filter(
    (r) =>
      r.status === "ok" &&
      r.event &&
      !skip.has(r.row) &&
      (!r.duplicate || options.includeDuplicates),
  );
  const rules = await loadTaxRules();

  const values = [];
  for (const row of take) {
    const e = row.event as ParsedEvent;
    let gross = e.grossAmount;
    let taxes: string | undefined = e.taxesWithheld === "0" ? undefined : e.taxesWithheld;
    // B3 reports the credited (net) JCP: gross it up with the rule's withholding so the tax report is right.
    if (batch.format === "b3_movimentacao" && e.type === "JCP") {
      const rate = rules.rate("BR_JCP_IRRF", e.tradeDate, { eventType: "JCP" });
      const grossed = d(gross).div(d(1).minus(rate));
      taxes = grossed.minus(gross).toFixed();
      gross = grossed.toFixed();
    } else if (e.type === "DIVIDEND" || e.type === "FII_INCOME" || e.type === "JCP") {
      taxes ??= batch.format === "b3_movimentacao" ? "0" : undefined;
    }
    values.push(
      await buildEventValues(
        context,
        account,
        {
          accountId: account.id,
          assetId: row.assetId,
          type: e.type as never,
          tradeDate: e.tradeDate,
          quantity: e.quantity,
          unitPrice: e.unitPrice,
          grossAmount: gross === "0" ? undefined : gross,
          fees: e.fees,
          taxesWithheld: taxes,
          currencyCode: e.currencyCode,
          notes: e.notes,
          meta: e.meta as never,
        },
        { source: `import:${batch.format}`, externalId: e.externalId },
      ),
    );
  }
  const created = await insertEventsBulk(context, account, values);
  await repo.markImportBatchCommitted(batch.id);
  return { batchId: batch.id, created, skipped: rows.length - created };
}
