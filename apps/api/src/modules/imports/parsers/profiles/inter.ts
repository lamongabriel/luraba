import { collapseSpaces, normalizeKey } from "../text.js";
import type { BankProfile, InterpretedRow } from "../types.js";

/**
 * Inter writes `History: "detail"` in the OFX MEMO and puts the detail in NAME. The CSV adapter
 * builds the same `History: detail` text, so one interpretation serves both formats.
 */
export const interProfile: BankProfile = {
  id: "inter",
  label: "Banco Inter",
  matchesOfx: ({ org, fid, bankId }) =>
    /intermedium|banco inter/iu.test(org ?? "") || fid === "077" || bankId === "077",
  interpret({ text, secondary }): InterpretedRow {
    const description = collapseSpaces(text);
    const colon = description.indexOf(":");
    const history = colon >= 0 ? description.slice(0, colon) : description;
    const detail = collapseSpaces(
      secondary ??
        (colon >= 0 ? description.slice(colon + 1).replace(/^[\s"]+|[\s"]+$/gu, "") : description),
    );
    const historyKey = normalizeKey(history);
    const detailKey = normalizeKey(detail);

    if (/^pagamento fatura/u.test(detailKey)) {
      return { description, counterparty: "Credit card bill", hints: { movement: "card_payment" } };
    }
    if (/^(aplicacao|resgate)\b/u.test(historyKey)) {
      return { description, counterparty: detail, hints: { movement: "investment" } };
    }
    if (/^pix\b/u.test(historyKey)) {
      return { description, counterparty: detail, hints: { paymentMethod: "pix" } };
    }
    if (/evento b3/u.test(historyKey)) {
      // "* Prov * Rendimento 20     Xpml11": drop the changing number so one fund is one group.
      return {
        description,
        counterparty: collapseSpaces(detail.replace(/\b\d+\b/gu, "")),
        hints: {},
      };
    }
    return { description, counterparty: detail, hints: {} };
  },
};
