import { collapseSpaces, normalizeKey } from "../text.js";
import type { BankProfile, InterpretedRow } from "../types.js";

const INSTALLMENT = /\s*-?\s*Parcela\s+(\d+)\/(\d+)\s*$/iu;

/** Second segment of "Transferência enviada pelo Pix - NAME - •••.123.456-•• - BANK ...". */
function counterpartyFromSegments(text: string): string | null {
  const parts = text.split(" - ").map((part) => part.trim());
  return parts.length >= 2 && parts[1] ? parts[1] : null;
}

export const nubankProfile: BankProfile = {
  id: "nubank",
  label: "Nubank",
  matchesOfx: ({ org, fid }) => /nu\s*pagamentos/iu.test(org ?? "") || fid === "260",
  interpret({ sourceKind, text, amount }): InterpretedRow {
    const description = collapseSpaces(text);
    const key = normalizeKey(description);

    if (sourceKind === "credit_card") {
      const match = INSTALLMENT.exec(description);
      const base = collapseSpaces(description.replace(INSTALLMENT, ""));
      const hints: InterpretedRow["hints"] = {};
      if (/^pagamento recebido/u.test(key)) hints.movement = "card_payment";
      else if (amount !== null && amount > 0) hints.movement = "card_refund";
      return {
        description,
        counterparty: base,
        hints,
        installment: match ? { number: Number(match[1]), total: Number(match[2]) } : null,
        seriesBase: match ? base : null,
      };
    }

    if (/^(aplicacao|resgate)\b/u.test(key)) {
      return { description, counterparty: description, hints: { movement: "investment" } };
    }
    if (/pagamento de fatura/u.test(key)) {
      return { description, counterparty: "Credit card bill", hints: { movement: "card_payment" } };
    }
    if (/\bpix\b/u.test(key)) {
      return {
        description,
        counterparty: counterpartyFromSegments(description) ?? description,
        hints: { paymentMethod: "pix" },
      };
    }
    if (/^pagamento de boleto/u.test(key)) {
      return {
        description,
        counterparty: counterpartyFromSegments(description) ?? description,
        hints: { paymentMethod: "boleto" },
      };
    }
    return { description, counterparty: description, hints: {} };
  },
};
