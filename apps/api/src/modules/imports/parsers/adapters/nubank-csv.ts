import { nubankProfile } from "../profiles/nubank.js";
import {
  collapseSpaces,
  minMaxDates,
  normalizeKey,
  parseAmount,
  parseDate,
  parseDelimited,
} from "../text.js";
import type { ParsedRow, ParsedStatement, ParserAdapter } from "../types.js";

function headerOf(text: string): string[] {
  const first = text.split(/\r?\n/u).find((line) => line.trim() !== "") ?? "";
  return parseDelimited(first, ",")[0]?.map((cell) => normalizeKey(cell)) ?? [];
}

export const nubankCheckingCsvAdapter: ParserAdapter = {
  id: "nubank-checking-csv",
  label: "Nubank checking account (CSV)",
  description: "Columns Data, Valor, Identificador, Descrição; dates dd/mm/yyyy, dot decimals.",
  sourceKind: "bank_account",
  extensions: [".csv"],
  detect({ text }) {
    const header = headerOf(text).join(",");
    return header === "data,valor,identificador,descricao" ? 0.95 : 0;
  },
  parse({ text }): ParsedStatement {
    const [, ...records] = parseDelimited(text, ",");
    const rows: ParsedRow[] = records.map((cells) => {
      const [dateText, amountText, id, description] = cells;
      const problems: string[] = [];
      const date = parseDate(dateText);
      if (!date) problems.push(`Could not read the date "${dateText ?? ""}".`);
      const amount = parseAmount(amountText, ".");
      if (amount === null) problems.push(`Could not read the amount "${amountText ?? ""}".`);
      const interpreted = nubankProfile.interpret({
        sourceKind: "bank_account",
        text: collapseSpaces(description ?? ""),
        amount,
      });
      return {
        date,
        amount,
        description: interpreted.description || "(no description)",
        counterparty: interpreted.counterparty,
        externalId: id?.trim() || null,
        hints: interpreted.hints,
        raw: {
          Data: dateText ?? "",
          Valor: amountText ?? "",
          Identificador: id ?? "",
          Descrição: description ?? "",
        },
        problems,
      };
    });
    const { min, max } = minMaxDates(rows.map((row) => row.date));
    return {
      sourceKind: "bank_account",
      institution: nubankProfile.label,
      accountRef: null,
      currency: "BRL",
      periodStart: min,
      periodEnd: max,
      balance: null,
      rows,
      warnings: [
        "This CSV has no account number or closing balance. Pick the account yourself; the OFX export includes the balance for reconciliation.",
      ],
    };
  },
};

export const nubankCardCsvAdapter: ParserAdapter = {
  id: "nubank-card-csv",
  label: "Nubank credit card invoice (CSV)",
  description: "Columns date, title, amount; ISO dates, decimal comma, charges are positive.",
  sourceKind: "credit_card",
  extensions: [".csv"],
  detect({ text }) {
    return headerOf(text).join(",") === "date,title,amount" ? 0.95 : 0;
  },
  parse({ text }): ParsedStatement {
    const [, ...records] = parseDelimited(text, ",");
    const rows: ParsedRow[] = records.map((cells) => {
      const [dateText, title, amountText] = cells;
      const problems: string[] = [];
      const date = parseDate(dateText);
      if (!date) problems.push(`Could not read the date "${dateText ?? ""}".`);
      const parsed = parseAmount(amountText, ",");
      if (parsed === null) problems.push(`Could not read the amount "${amountText ?? ""}".`);
      // The CSV lists charges as positive; the normalized shape has charges negative.
      const amount = parsed === null ? null : -parsed;
      const interpreted = nubankProfile.interpret({
        sourceKind: "credit_card",
        text: collapseSpaces(title ?? ""),
        amount,
      });
      return {
        date,
        amount,
        description: interpreted.description || "(no description)",
        counterparty: interpreted.counterparty,
        installment: interpreted.installment ?? null,
        seriesBase: interpreted.seriesBase ?? null,
        hints: interpreted.hints,
        raw: { date: dateText ?? "", title: title ?? "", amount: amountText ?? "" },
        problems,
      };
    });
    const { min, max } = minMaxDates(rows.map((row) => row.date));
    return {
      sourceKind: "credit_card",
      institution: nubankProfile.label,
      accountRef: null,
      currency: "BRL",
      periodStart: min,
      periodEnd: max,
      balance: null,
      rows,
      warnings: [
        "This CSV has no bank ids, card number or balance, so re-imports are matched by date, amount and description. The OFX export carries ids.",
      ],
    };
  },
};
