import { interProfile } from "../profiles/inter.js";
import {
  collapseSpaces,
  minMaxDates,
  normalizeKey,
  parseAmount,
  parseDate,
  parseDelimited,
} from "../text.js";
import type { ParsedRow, ParsedStatement, ParserAdapter } from "../types.js";

const HEADER = "data lancamento historico descricao valor saldo";

function findHeaderIndex(lines: string[]): number {
  return lines.findIndex((line) => normalizeKey(line) === HEADER);
}

export const interCheckingCsvAdapter: ParserAdapter = {
  id: "inter-checking-csv",
  label: "Banco Inter checking account (CSV)",
  description: "Semicolon separated, with a short header block; decimal comma, dot thousands.",
  sourceKind: "bank_account",
  extensions: [".csv"],
  detect({ text }) {
    return findHeaderIndex(text.split(/\r?\n/u)) >= 0 ? 0.95 : 0;
  },
  parse({ text }): ParsedStatement {
    const lines = text.split(/\r?\n/u);
    const headerIndex = findHeaderIndex(lines);
    const meta = new Map<string, string>();
    for (const line of lines.slice(0, Math.max(headerIndex, 0))) {
      const [label, ...rest] = line.split(";");
      if (label && rest.length > 0) meta.set(normalizeKey(label), rest.join(";").trim());
    }
    const records = parseDelimited(lines.slice(headerIndex + 1).join("\n"), ";");
    const rows: ParsedRow[] = records.map((cells) => {
      const [dateText, history, description, amountText, balanceText] = cells;
      const problems: string[] = [];
      const date = parseDate(dateText);
      if (!date) problems.push(`Could not read the date "${dateText ?? ""}".`);
      const amount = parseAmount(amountText, ",");
      if (amount === null) problems.push(`Could not read the amount "${amountText ?? ""}".`);
      const detail = collapseSpaces(description ?? "");
      const interpreted = interProfile.interpret({
        sourceKind: "bank_account",
        text: `${collapseSpaces(history ?? "")}: ${detail}`,
        secondary: detail,
        amount,
      });
      return {
        date,
        amount,
        description: interpreted.description,
        counterparty: interpreted.counterparty,
        balanceAfter: parseAmount(balanceText, ","),
        hints: interpreted.hints,
        raw: {
          "Data Lançamento": dateText ?? "",
          Histórico: history ?? "",
          Descrição: description ?? "",
          Valor: amountText ?? "",
          Saldo: balanceText ?? "",
        },
        problems,
      };
    });

    const period = /(\d{2}\/\d{2}\/\d{4})\s*a\s*(\d{2}\/\d{2}\/\d{4})/u.exec(
      meta.get("periodo") ?? "",
    );
    const { min, max } = minMaxDates(rows.map((row) => row.date));
    const closing = parseAmount(meta.get("saldo"), ",");
    const periodEnd = parseDate(period?.[2]) ?? max;
    return {
      sourceKind: "bank_account",
      institution: interProfile.label,
      accountRef: meta.get("conta") ?? null,
      currency: "BRL",
      periodStart: parseDate(period?.[1]) ?? min,
      periodEnd,
      balance: closing === null ? null : { amount: closing, date: periodEnd },
      rows,
      warnings: [
        "This CSV has no bank ids, so re-imports are matched by date, amount and description.",
      ],
    };
  },
};
