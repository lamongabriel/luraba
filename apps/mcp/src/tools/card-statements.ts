import { readFile } from "node:fs/promises";
import { type CardStatementResult, creditCardsEndpoints } from "@luraba/contracts";
import { z } from "zod";
import { majorToMinor, toMoney } from "../format/money.js";
import { clarificationOutput, Problems } from "../resolve/problems.js";
import { defineTool, type ToolContext, type ToolOutput, WRITE } from "./types.js";

const MAX_FILE_BYTES = 5_000_000;

async function resolveCard(context: ToolContext, name: string) {
  const problems = new Problems();
  const id = problems.take("creditCard", await context.refs.resolveCreditCard(name));
  if (problems.any || !id) return { ok: false as const, output: clarificationOutput(problems) };
  const card = (await context.refs.creditCards()).find((item) => item.id === id);
  return { ok: true as const, id, currency: card?.currencyCode ?? "USD" };
}

function describeResult(result: CardStatementResult, currency: string) {
  const money = (amount: number) => toMoney(amount, currency);
  const line = (item: CardStatementResult["lines"][number]) => ({
    description: item.description,
    installment: item.installment ? `${item.installment.number}/${item.installment.total}` : null,
    date: item.date,
    kind: item.kind,
    statement: money(item.amount),
    ...(item.lurabaAmount === null ? {} : { luraba: money(item.lurabaAmount) }),
    ...(item.difference === null ? {} : { difference: money(item.difference) }),
    ...(item.purchaseId ? { purchaseId: item.purchaseId } : {}),
  });
  const byStatus = (status: CardStatementResult["lines"][number]["status"]) =>
    result.lines.filter((item) => item.status === status).map(line);
  return {
    issuer: result.issuer,
    invoice: {
      id: result.billingCycleId,
      dueDate: result.dueDate,
      closingDate: result.closingDate,
    },
    issuerTotal: money(result.issuerTotal),
    lurabaTotalBefore: money(result.lurabaTotalBefore),
    lurabaTotalAfter: money(result.lurabaTotalAfter),
    remainingDifference: money(result.remainingDifference),
    reconciled: result.reconciled,
    summary: result.summary,
    matched: byStatus("matched"),
    corrected: byStatus("corrected"),
    needsReview: byStatus("review"),
    missing: byStatus("missing"),
    extra: result.extra.map((item) => ({
      description: item.description,
      installment: `${item.installmentNumber}/${item.installmentCount}`,
      luraba: money(item.amount),
      purchaseId: item.purchaseId,
    })),
    warnings: result.warnings,
  };
}

export const importCardStatement = defineTool({
  name: "import_card_statement",
  title: "Import a card invoice statement",
  description:
    "Make a card invoice match the issuer to the cent. Reads the issuer's statement for one invoice (CSV or OFX: Nubank date,title,amount; Inter Data;Lancamento;...;Valor; XP; Inter Global; PDF is not supported) and matches each line to the card's installments by merchant text, installment number X/Y and amount. A difference of 0.05 or less is corrected automatically (the installment takes the statement's amount; the purchase total, the invoice, the payment allocations and an audit trail row follow); a bigger difference goes to needsReview and changes nothing; lines Luraba has no purchase for are missing; installments the statement does not show are extra. IOF charges and their refunds are netted; payments are ignored. When the invoice total equals the statement total the invoice is reconciled and locked. Give the file as `content` (the text) or `path` (a file the server can read), `month` as the month the invoice is due (YYYY-MM, as report_credit_cards shows). dryRun=true returns the same breakdown without writing anything.",
  input: z.object({
    creditCard: z.string().describe("The card name, last 4 or id."),
    month: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
      .describe("The month the invoice is due, YYYY-MM."),
    content: z.string().max(5_000_000).optional().describe("The statement file's text."),
    path: z.string().optional().describe("A statement file the MCP server can read (local use)."),
    fileName: z
      .string()
      .optional()
      .describe("The file name, to tell CSV from OFX when sending content."),
    issuer: z.enum(["nubank", "inter", "xp", "inter_global", "ofx"]).optional(),
    issuerTotal: z
      .number()
      .positive()
      .optional()
      .describe("The issuer's closed total in major units, when the file has no reliable total."),
    dryRun: z.boolean().default(false),
  }),
  annotations: WRITE,
  async handler(context, args): Promise<ToolOutput> {
    const card = await resolveCard(context, args.creditCard);
    if (!card.ok) return card.output;
    let content = args.content;
    let fileName = args.fileName ?? "statement.csv";
    if (content === undefined) {
      if (!args.path) {
        return {
          isError: true,
          summary: "Pass the statement as content (its text) or path (a file the server can read).",
          data: { status: "invalid_input" },
        };
      }
      try {
        const bytes = await readFile(args.path);
        if (bytes.byteLength > MAX_FILE_BYTES) {
          return {
            isError: true,
            summary: "The statement file is larger than 5 MB.",
            data: { status: "invalid_input" },
          };
        }
        content = bytes.toString("utf8");
        fileName = args.fileName ?? args.path.split(/[\\/]/u).pop() ?? fileName;
      } catch {
        return {
          isError: true,
          summary: `Could not read ${args.path}. Send the text as content instead.`,
          data: { status: "invalid_input" },
        };
      }
    }
    const body = {
      fileName,
      content,
      month: args.month,
      ...(args.issuer ? { issuer: args.issuer } : {}),
      ...(args.issuerTotal === undefined
        ? {}
        : { issuerTotal: majorToMinor(args.issuerTotal, card.currency) }),
    };
    const endpoint = args.dryRun
      ? creditCardsEndpoints.previewStatement
      : creditCardsEndpoints.applyStatement;
    const result = await context.client.request(endpoint, { params: { id: card.id }, body });
    const summary = result.summary;
    return {
      summary: `${args.dryRun ? "Dry run: nothing was changed. " : ""}${summary.matched} matched, ${summary.corrected} ${args.dryRun ? "would be corrected" : "corrected"}, ${summary.review} to review, ${summary.missing} missing, ${summary.extra} not on the statement. The invoice ${result.reconciled ? (args.dryRun ? "would be reconciled" : "is reconciled") : `is ${toMoney(Math.abs(result.remainingDifference), card.currency).formatted} ${result.remainingDifference > 0 ? "above" : "below"} the issuer's total`}.`,
      data: {
        status: args.dryRun ? "dry_run" : "imported",
        ...describeResult(result, card.currency),
      },
    };
  },
});

export const reconcileInvoice = defineTool({
  name: "reconcile_invoice",
  title: "Reconcile an invoice with the issuer's total",
  description:
    "Mark the card invoice due in `month` (YYYY-MM) as reconciled when its total equals the issuer's closed total (major units). A reconciled invoice is locked: editing its installments, deleting or re-splitting its purchases needs override=true on the edit tools. When the totals differ nothing changes and the difference is returned; import the statement with import_card_statement to find it.",
  input: z.object({
    creditCard: z.string().describe("The card name, last 4 or id."),
    month: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
      .describe("The month the invoice is due, YYYY-MM."),
    issuerTotal: z.number().positive().describe("The issuer's closed invoice total, major units."),
  }),
  annotations: WRITE,
  async handler(context, args): Promise<ToolOutput> {
    const card = await resolveCard(context, args.creditCard);
    if (!card.ok) return card.output;
    const result = await context.client.request(creditCardsEndpoints.reconcileCycle, {
      params: { id: card.id },
      body: { month: args.month, issuerTotal: majorToMinor(args.issuerTotal, card.currency) },
    });
    const money = (amount: number) => toMoney(amount, card.currency);
    return {
      summary: result.reconciled
        ? `The ${args.month} invoice is reconciled at ${money(result.issuerTotal).formatted} and locked.`
        : `The ${args.month} invoice is ${money(Math.abs(result.difference)).formatted} ${result.difference > 0 ? "above" : "below"} the issuer's total; nothing was changed.`,
      data: {
        status: result.reconciled ? "reconciled" : "mismatch",
        invoiceId: result.cycle.id,
        issuerTotal: money(result.issuerTotal),
        lurabaTotal: money(result.statementAmount),
        difference: money(result.difference),
        ...(result.reconciled
          ? {}
          : {
              next: "Run import_card_statement with the issuer's statement to find the difference.",
            }),
      },
    };
  },
});
