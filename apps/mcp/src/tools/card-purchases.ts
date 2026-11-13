import { type CreditCardPurchase, creditCardsEndpoints } from "@luraba/contracts";
import { resolveInstallmentPlan } from "@luraba/domain";
import { z } from "zod";
import { majorToMinor, toMoney } from "../format/money.js";
import { clarificationOutput, Problems } from "../resolve/problems.js";
import {
  descriptionField,
  notesField,
  originalDescriptionField,
  resolveClassification,
} from "./transactions.js";
import { defineTool, type ToolContext, type ToolOutput, WRITE } from "./types.js";

function describePurchase(purchase: CreditCardPurchase, currency: string) {
  return {
    purchaseId: purchase.purchaseId,
    description: purchase.description,
    originalDescription: purchase.originalDescription,
    notes: purchase.notes,
    total: toMoney(purchase.amount, currency),
    installmentCount: purchase.installmentCount,
    installments: purchase.installments.map((installment) => ({
      number: installment.installmentNumber,
      installmentId: installment.installmentId,
      amount: toMoney(installment.amount, currency),
      invoiceId: installment.billingCycleId,
      closingDate: installment.closingDate,
      dueDate: installment.dueDate,
    })),
  };
}

type ResolvedCard = { ok: true; id: string; currency: string } | { ok: false; output: ToolOutput };

async function resolveCard(context: ToolContext, name: string): Promise<ResolvedCard> {
  const problems = new Problems();
  const id = problems.take("creditCard", await context.refs.resolveCreditCard(name));
  if (problems.any || !id) return { ok: false, output: clarificationOutput(problems) };
  const card = (await context.refs.creditCards()).find((item) => item.id === id);
  return { ok: true, id, currency: card?.currencyCode ?? "USD" };
}

export const updateCardPurchase = defineTool({
  name: "update_card_purchase",
  title: "Update a credit card purchase",
  description:
    "Change a credit card purchase (use the purchaseId and creditCard of a credit_card_installment row from search_transactions; update_transaction cannot edit card purchases). Text: description, originalDescription (null clears it), notes (null clears them), date, postedDate, category, merchant, tags, includeInBudget. Installments: installmentAmounts replaces every installment with the exact invoice amounts (their count is the new count, their sum the new total), installmentAmount makes them all equal (with installments), roundingMode / amount / installments re-split the total (installments already on a closed invoice keep their amounts and only the rest is re-split). To change a single installment use update_installment. Money is in major units. Recomputes invoices, the card's limit and reports. Use dryRun=true to preview the new installments.",
  input: z.object({
    purchaseId: z.uuid(),
    creditCard: z.string().describe("The card name, last 4 or id."),
    description: descriptionField.optional(),
    originalDescription: originalDescriptionField.nullable(),
    notes: notesField.nullable(),
    date: z.iso.date().optional().describe("New purchase date."),
    postedDate: z.iso.date().optional(),
    category: z.string().optional(),
    merchant: z.string().optional(),
    tags: z.array(z.string().min(1)).max(50).optional().describe("Replaces all tags."),
    includeInBudget: z.boolean().optional(),
    amount: z.number().positive().optional().describe("New purchase total."),
    installments: z.number().int().min(1).max(60).optional().describe("New installment count."),
    installmentAmounts: z
      .array(z.number().positive())
      .min(1)
      .max(60)
      .optional()
      .describe("The exact amount of every installment, as the invoice shows them."),
    installmentAmount: z
      .number()
      .positive()
      .optional()
      .describe("Every installment costs this much (with installments)."),
    roundingMode: z.enum(["remainder_last", "remainder_first", "round_up_all"]).optional(),
    createMissing: z.boolean().default(false),
    dryRun: z.boolean().default(false),
  }),
  annotations: WRITE,
  async handler(context, args): Promise<ToolOutput> {
    const card = await resolveCard(context, args.creditCard);
    if (!card.ok) return card.output;
    const problems = new Problems();
    const classification = await resolveClassification(
      context,
      problems,
      {
        category: args.category,
        merchant: args.merchant,
        tags: args.tags,
        createMissing: args.createMissing,
        categoryType: "expense",
      },
      { dryRun: args.dryRun },
    );
    if (problems.any) return clarificationOutput(problems);

    const minor = (value: number) => majorToMinor(value, card.currency);
    const body = {
      ...(args.description === undefined ? {} : { description: args.description }),
      ...(args.originalDescription === undefined
        ? {}
        : { originalDescription: args.originalDescription }),
      ...(args.notes === undefined ? {} : { notes: args.notes }),
      ...(args.date === undefined ? {} : { purchaseDate: args.date }),
      ...(args.postedDate === undefined ? {} : { postedDate: args.postedDate }),
      ...(args.includeInBudget === undefined ? {} : { includeInBudget: args.includeInBudget }),
      ...(classification.categoryId ? { categoryId: classification.categoryId } : {}),
      ...(classification.merchantId ? { merchantId: classification.merchantId } : {}),
      ...(classification.tagIds ? { tagIds: classification.tagIds } : {}),
      ...(args.amount === undefined ? {} : { amount: minor(args.amount) }),
      ...(args.installments === undefined ? {} : { installmentCount: args.installments }),
      ...(args.installmentAmounts
        ? { installmentAmounts: args.installmentAmounts.map(minor) }
        : {}),
      ...(args.installmentAmount === undefined
        ? {}
        : { installmentAmount: minor(args.installmentAmount) }),
      ...(args.roundingMode ? { roundingMode: args.roundingMode } : {}),
    };
    if (Object.keys(body).length === 0) {
      return {
        isError: true,
        summary: "Nothing to update: pass at least one field to change.",
        data: { status: "invalid_input" },
      };
    }

    const before = await context.client.request(creditCardsEndpoints.getPurchase, {
      params: { id: card.id, purchaseId: args.purchaseId },
    });
    if (args.dryRun) {
      const touchesPlan =
        body.amount !== undefined ||
        body.installmentCount !== undefined ||
        body.installmentAmounts !== undefined ||
        body.installmentAmount !== undefined ||
        body.roundingMode !== undefined;
      const exact = body.installmentAmounts !== undefined || body.installmentAmount !== undefined;
      const plan = touchesPlan
        ? resolveInstallmentPlan(
            {
              amount: exact ? body.amount : (body.amount ?? before.amount),
              installmentCount: body.installmentCount,
              installmentAmounts: body.installmentAmounts,
              installmentAmount: body.installmentAmount,
              roundingMode: body.roundingMode,
            },
            before.installmentCount,
          )
        : null;
      if (plan && !plan.ok) {
        return {
          isError: true,
          summary: plan.error,
          data: { status: "invalid_input", error: plan.error },
        };
      }
      return {
        summary: "Dry run: nothing was changed.",
        data: {
          status: "dry_run",
          current: describePurchase(before, card.currency),
          wouldChange: body,
          ...(plan?.ok
            ? {
                newTotal: toMoney(plan.total, card.currency),
                newInstallments: plan.amounts.map((value, index) => ({
                  number: index + 1,
                  amount: toMoney(value, card.currency),
                })),
                note: "Installments already on a closed invoice keep their amounts unless you sent the exact list.",
              }
            : {}),
        },
      };
    }

    const after = await context.client.request(creditCardsEndpoints.updatePurchase, {
      params: { id: card.id, purchaseId: args.purchaseId },
      body,
    });
    return {
      summary: `Updated card purchase "${after.description}": ${toMoney(after.amount, card.currency).formatted} in ${after.installmentCount} installment(s).`,
      data: { status: "updated", purchase: describePurchase(after, card.currency) },
    };
  },
});

export const updateInstallment = defineTool({
  name: "update_installment",
  title: "Update one card installment",
  description:
    "Change one installment of a credit card purchase: its amount (major units; the purchase total, the invoice, the card's available limit and reports follow) and/or the invoice it lands on (invoiceId, from the installments of get/update_card_purchase output). Use this to match the exact amount on the issuer's invoice, e.g. an installment of 34.08 that is really 34.06. Identify it by purchaseId, creditCard and installmentNumber. Use dryRun=true to preview.",
  input: z.object({
    purchaseId: z.uuid(),
    creditCard: z.string().describe("The card name, last 4 or id."),
    installmentNumber: z.number().int().min(1).max(60),
    amount: z.number().positive().optional().describe("The installment's new amount."),
    invoiceId: z.uuid().optional().describe("Move the installment to this invoice."),
    dryRun: z.boolean().default(false),
  }),
  annotations: WRITE,
  async handler(context, args): Promise<ToolOutput> {
    if (args.amount === undefined && !args.invoiceId) {
      return {
        isError: true,
        summary: "Nothing to update: pass the new amount and/or invoiceId.",
        data: { status: "invalid_input" },
      };
    }
    const card = await resolveCard(context, args.creditCard);
    if (!card.ok) return card.output;
    const purchase = await context.client.request(creditCardsEndpoints.getPurchase, {
      params: { id: card.id, purchaseId: args.purchaseId },
    });
    const installment = purchase.installments.find(
      (item) => item.installmentNumber === args.installmentNumber,
    );
    if (!installment) {
      return {
        isError: true,
        summary: `The purchase has no installment ${args.installmentNumber} (it has ${purchase.installmentCount}).`,
        data: { status: "not_found" },
      };
    }
    const nextAmount =
      args.amount === undefined ? installment.amount : majorToMinor(args.amount, card.currency);
    if (args.dryRun) {
      return {
        summary: "Dry run: nothing was changed.",
        data: {
          status: "dry_run",
          installment: args.installmentNumber,
          from: toMoney(installment.amount, card.currency),
          to: toMoney(nextAmount, card.currency),
          newTotal: toMoney(purchase.amount - installment.amount + nextAmount, card.currency),
          ...(args.invoiceId ? { movesToInvoice: args.invoiceId } : {}),
        },
      };
    }
    const after = await context.client.request(creditCardsEndpoints.updateInstallment, {
      params: {
        id: card.id,
        purchaseId: args.purchaseId,
        installmentId: installment.installmentId,
      },
      body: {
        ...(args.amount === undefined ? {} : { amount: nextAmount }),
        ...(args.invoiceId ? { billingCycleId: args.invoiceId } : {}),
      },
    });
    return {
      summary: `Installment ${args.installmentNumber} of "${after.description}" is now ${toMoney(nextAmount, card.currency).formatted}; the purchase total is ${toMoney(after.amount, card.currency).formatted}.`,
      data: { status: "updated", purchase: describePurchase(after, card.currency) },
    };
  },
});
