import { findProfileByOfx } from "../profiles/index.js";
import { collapseSpaces, minMaxDates, parseAmount, parseDate } from "../text.js";
import type { InterpretedRow, ParsedRow, ParsedStatement, ParserAdapter } from "../types.js";

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
};

function decodeEntities(value: string): string {
  return value.replace(/&(amp|lt|gt|quot|apos|#39);/gu, (entity) => ENTITIES[entity] ?? entity);
}

/** Reads leaf tags from an OFX fragment. Works for SGML (no closing tags) and XML alike. */
function leafValues(fragment: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const match of fragment.matchAll(/<([A-Z0-9.]+)>([^<\r\n]*)/gu)) {
    const [, tag, value] = match;
    if (tag && value !== undefined && value.trim() !== "" && !(tag in values))
      values[tag] = decodeEntities(value.trim());
  }
  return values;
}

function block(text: string, tag: string): string | null {
  const start = text.search(new RegExp(`<${tag}>`, "u"));
  if (start < 0) return null;
  const end = text.indexOf(`</${tag}>`, start);
  return end < 0 ? text.slice(start) : text.slice(start, end);
}

export const ofxAdapter: ParserAdapter = {
  id: "ofx",
  label: "OFX statement",
  description: "Open Financial Exchange export (bank account or credit card), any bank.",
  sourceKind: null,
  extensions: [".ofx", ".qfx"],
  detect({ name, text }) {
    if (/<OFX>/iu.test(text)) return 0.9;
    return /\.(ofx|qfx)$/iu.test(name) ? 0.4 : 0;
  },
  parse({ text }): ParsedStatement {
    const warnings: string[] = [];
    const isCard = /<CCSTMTRS>/iu.test(text);
    const sourceKind = isCard ? "credit_card" : "bank_account";
    const statementCount = (text.match(/<(CC)?STMTRS>/giu) ?? []).length;
    if (statementCount > 1)
      warnings.push("The file holds more than one statement; only the first one is read.");

    const signon = leafValues(block(text, "SONRS") ?? "");
    const statement = block(text, isCard ? "CCSTMTRS" : "STMTRS") ?? text;
    const header = leafValues(statement.split("<BANKTRANLIST>")[0] ?? statement);
    const org = signon.ORG;
    const fid = signon.FID;
    const profile = findProfileByOfx({ org, fid, bankId: header.BANKID });

    const list = block(statement, "BANKTRANLIST") ?? "";
    const rows: ParsedRow[] = [];
    for (const match of list.matchAll(/<STMTTRN>([\s\S]*?)(?=<STMTTRN>|<\/BANKTRANLIST>|$)/gu)) {
      const fields = leafValues(match[1] ?? "");
      const problems: string[] = [];
      const date = parseDate(fields.DTPOSTED);
      if (!date) problems.push(`Could not read the date "${fields.DTPOSTED ?? ""}".`);
      const amount = parseAmount(fields.TRNAMT, ".");
      if (amount === null) problems.push(`Could not read the amount "${fields.TRNAMT ?? ""}".`);

      const memo = collapseSpaces(fields.MEMO ?? fields.NAME ?? "");
      const name = fields.NAME ? collapseSpaces(fields.NAME) : null;
      const interpreted: InterpretedRow = profile
        ? profile.interpret({ sourceKind, text: memo, secondary: name, amount })
        : {
            description: memo || name || "(no description)",
            counterparty: name ?? memo,
            hints: {},
          };

      rows.push({
        date,
        amount,
        description: interpreted.description || "(no description)",
        counterparty: interpreted.counterparty,
        externalId: fields.FITID ?? null,
        installment: interpreted.installment ?? null,
        seriesBase: interpreted.seriesBase ?? null,
        hints: interpreted.hints,
        raw: fields,
        problems,
      });
    }
    if (rows.length === 0) warnings.push("No transactions were found in the file.");

    const ledger = leafValues(block(statement, "LEDGERBAL") ?? "");
    const ledgerAmount = parseAmount(ledger.BALAMT, ".");
    const { min, max } = minMaxDates(rows.map((row) => row.date));
    const range = leafValues(list.split("<STMTTRN>")[0] ?? "");

    return {
      sourceKind,
      institution: profile?.label ?? org ?? null,
      accountRef: header.ACCTID ?? null,
      currency: header.CURDEF ?? null,
      periodStart: parseDate(range.DTSTART) ?? min,
      periodEnd: parseDate(range.DTEND) ?? max,
      balance:
        ledgerAmount === null
          ? null
          : {
              // A card's LEDGERBAL is negative when money is owed; Luraba compares the amount owed.
              amount: isCard ? -ledgerAmount : ledgerAmount,
              date: parseDate(ledger.DTASOF),
            },
      rows,
      warnings,
    };
  },
};
