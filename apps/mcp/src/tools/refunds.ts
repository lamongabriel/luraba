import {
  type CreateTransactionInput,
  creditCardsEndpoints,
  REFUND_REASONS,
  transactionsEndpoints,
} from "@luraba/contracts";
import { z } from "zod";
import { majorToMinor, majorToMoney, toMoney } from "../format/money.js";
import { loadNameMaps, summarizeRow } from "../format/transactions.js";
import { clarificationOutput, Problems } from "../resolve/problems.js";
import { resolveClassification } from "./transactions.js";
import { defineTool, type ToolContext, type ToolOutput, WRITE } from "./types.js";

/** The invoice a credit landed on and what the card has left, for the agent to relay. */
async function invoiceSummary(context: ToolContext, cardId: string, cycleId: string | null) {
  const card = await context.client.request(creditCardsEndpoints.get, { params: { id: cardId } });
  const currency = card.currencyCode;
  const details = cycleId
    ? await context.client.request(creditCardsEndpoints.getCycle, {
        params: { id: cardId, cycleId },
      })
    : null;
  return {
    creditCard: card.name,
    invoice: details
      ? {
          closingDate: details.cycle.closingDate,
          dueDate: details.cycle.dueDate,
          total: toMoney(details.cycle.statementAmount, currency),
          paid: toMoney(details.cycle.paidAmount, currency),
          remaining: toMoney(details.cycle.remainingAmount, currency),
          status: details.cycle.status,
        }
      : null,
    owed: toMoney(card.balance, currency),
    remainingCredit:
      card.remainingCreditAmount === null ? null : toMoney(card.remainingCreditAmount, currency),
  };
}

const DEFAULT_DESCRIPTIONS = {
  refund: "Refund",
  cancellation: "Cancellation",
  chargeback: "Chargeback",
  cashback: "Cashback",
} as const;

export const createRefund = defineTool({
  name: "create_refund",
  title: "Record a refund, cancellation, chargeback or cashback",
  description:
    'Record money that comes back with no source account. It is a CREDIT, never income: on a credit card it lowers the invoice it lands on and restores the available limit; on a bank account it raises the balance. In spending, budget and category reports it counts as negative spending in the category of the original purchase (or the category you give; use an expense category like "Cashback & Rewards" for general cashback). Pass originalTransactionId (the id from search_transactions) to link it: the card/account and category default from the original, and the amount cannot exceed what is left to refund (partial refunds are fine). Without a link give creditCard or account. Do NOT use this to pay a card bill: use create_credit_card_payment. For an installment purchase use cancel_purchase to cancel it. Amount is positive, in major units. If a name is ambiguous nothing is created and the candidates come back as status "needs_clarification". Use dryRun=true to preview.',
  input: z.object({
    reason: z.enum(REFUND_REASONS),
    amount: z.number().positive().describe("Positive amount in major units."),
    description: z.string().min(1).max(512).optional(),
    date: z.iso.date().optional().describe("Date the money came back. Defaults to today."),
    creditCard: z.string().optional().describe("The card name, last 4 or id that gets the credit."),
    account: z.string().optional().describe("The bank account that gets the money."),
    originalTransactionId: z
      .uuid()
      .optional()
      .describe("The purchase or expense being refunded (id from search_transactions)."),
    category: z.string().optional().describe("Defaults to the original's category."),
    merchant: z.string().optional(),
    tags: z.array(z.string().min(1)).max(50).optional(),
    includeInBudget: z.boolean().optional(),
    createMissing: z.boolean().default(false),
    dryRun: z.boolean().default(false),
  }),
  annotations: WRITE,
  async handler(context, args): Promise<ToolOutput> {
    const problems = new Problems();
    const { refs } = context;
    const date = args.date ?? (await refs.today());
    const original = args.originalTransactionId
      ? await context.client.request(transactionsEndpoints.get, {
          params: { id: args.originalTransactionId },
        })
      : null;

    let cardId: string | undefined;
    let accountId: string | undefined;
    if (args.creditCard)
      cardId = problems.take("creditCard", await refs.resolveCreditCard(args.creditCard));
    else if (args.account)
      accountId = problems.take("account", await refs.resolveAccount(args.account));
    else if (original?.accountId) {
      const card = (await refs.creditCards()).find(
        (item) => item.ledgerAccountId === original.accountId,
      );
      if (card) cardId = card.id;
      else accountId = original.accountId;
    }
    const classification =
      args.category || args.merchant || args.tags
        ? await resolveClassification(
            context,
            problems,
            { ...args, categoryType: "expense" },
            { dryRun: true },
          )
        : { created: [] as { kind: string; name: string }[] };
    if (problems.any) return clarificationOutput(problems);
    if (!cardId && !accountId) {
      return {
        isError: true,
        summary: "Give creditCard or account, or originalTransactionId so it can be inferred.",
        data: { status: "invalid_input", missing: "creditCard or account" },
      };
    }
    const currency = cardId
      ? (await refs.creditCards()).find((item) => item.id === cardId)?.currencyCode
      : (await refs.accounts()).find((item) => item.id === accountId)?.currencyCode;
    if (!currency) {
      return {
        isError: true,
        summary: "Could not resolve the currency.",
        data: { status: "invalid_input" },
      };
    }

    const body = {
      type: "refund",
      reason: args.reason,
      description:
        args.description ??
        (original
          ? `${DEFAULT_DESCRIPTIONS[args.reason]}: ${original.description}`
          : DEFAULT_DESCRIPTIONS[args.reason]),
      amount: majorToMinor(args.amount, currency),
      purchaseDate: date,
      postedDate: date,
      ...(cardId ? { creditCardId: cardId } : {}),
      ...(accountId ? { accountId } : {}),
      ...(args.originalTransactionId ? { originalTransactionId: args.originalTransactionId } : {}),
      ...("categoryId" in classification && classification.categoryId
        ? { categoryId: classification.categoryId }
        : {}),
      ...("merchantId" in classification && classification.merchantId
        ? { merchantId: classification.merchantId }
        : {}),
      ...("tagIds" in classification && classification.tagIds
        ? { tagIds: classification.tagIds }
        : {}),
      ...(args.includeInBudget === undefined ? {} : { includeInBudget: args.includeInBudget }),
    } as CreateTransactionInput;

    if (args.dryRun) {
      return {
        summary: "Dry run: nothing was created.",
        data: {
          status: "dry_run",
          wouldCreate: { ...body, amountDisplay: majorToMoney(args.amount, currency) },
        },
      };
    }
    const created = await context.client.request(transactionsEndpoints.create, { body });
    context.refs.invalidate();
    const names = await loadNameMaps(context.refs);
    return {
      summary: `Recorded ${args.reason} "${created.description}" for ${majorToMoney(args.amount, currency).formatted}.`,
      data: {
        status: "created",
        refund: {
          ...summarizeRow(created, names),
          reason: created.refund?.reason ?? args.reason,
          originalTransactionId: created.refund?.originalTransactionId ?? null,
        },
        ...(cardId
          ? await invoiceSummary(context, cardId, created.refund?.billingCycleId ?? null)
          : {}),
      },
    };
  },
});

export const cancelPurchase = defineTool({
  name: "cancel_purchase",
  title: "Cancel a credit card purchase",
  description:
    'Cancel a credit card purchase by crediting the card. mode "single_credit" (default) credits everything that is left in one credit, like most issuers do. mode "cancel_future" removes the installments that are not billed yet (so the card limit is restored too) and credits only the ones already billed. Use the purchaseId and creditCard of a credit_card_installment row from search_transactions. The credit is dated today unless you pass date. Use dryRun=true to see what would be credited. Returns the credit and the invoice it landed on.',
  input: z.object({
    purchaseId: z.uuid(),
    creditCard: z.string().describe("The card name, last 4 or id."),
    mode: z.enum(["single_credit", "cancel_future"]).default("single_credit"),
    reason: z.enum(["cancellation", "chargeback", "refund"]).default("cancellation"),
    date: z.iso.date().optional(),
    dryRun: z.boolean().default(false),
  }),
  annotations: WRITE,
  async handler(context, args): Promise<ToolOutput> {
    const problems = new Problems();
    const cardId = problems.take(
      "creditCard",
      await context.refs.resolveCreditCard(args.creditCard),
    );
    if (problems.any || !cardId) return clarificationOutput(problems);
    const card = (await context.refs.creditCards()).find((item) => item.id === cardId);
    const currency = card?.currencyCode ?? "USD";
    const purchase = await context.client.request(creditCardsEndpoints.getPurchase, {
      params: { id: cardId, purchaseId: args.purchaseId },
    });
    if (args.dryRun) {
      const today = args.date ?? (await context.refs.today());
      const billed = purchase.installments.filter((item) => item.closingDate <= today);
      const billedTotal = billed.reduce((sum, item) => sum + item.amount, 0);
      return {
        summary: "Dry run: nothing was changed.",
        data: {
          status: "dry_run",
          mode: args.mode,
          purchaseTotal: toMoney(purchase.amount, currency),
          wouldCredit: toMoney(
            args.mode === "cancel_future" ? billedTotal : purchase.amount,
            currency,
          ),
          installmentsKept:
            args.mode === "cancel_future" ? billed.length : purchase.installments.length,
          installmentsRemoved:
            args.mode === "cancel_future" ? purchase.installments.length - billed.length : 0,
          note: "Amounts already refunded are subtracted when you run it for real.",
        },
      };
    }
    const result = await context.client.request(creditCardsEndpoints.cancelPurchase, {
      params: { id: cardId, purchaseId: args.purchaseId },
      body: {
        mode: args.mode,
        reason: args.reason,
        ...(args.date ? { date: args.date } : {}),
      },
    });
    context.refs.invalidate();
    return {
      summary: `Cancelled "${result.purchase.description}": credited ${toMoney(result.refund.amount, currency).formatted}${args.mode === "cancel_future" ? ` and removed the unbilled installments (${result.purchase.installmentCount} left)` : ""}.`,
      data: {
        status: "cancelled",
        mode: args.mode,
        credit: toMoney(result.refund.amount, currency),
        creditId: result.refund.id,
        installmentsLeft: result.purchase.installmentCount,
        ...(await invoiceSummary(context, cardId, result.refund.refund?.billingCycleId ?? null)),
      },
    };
  },
});

export const createCreditCardPayment = defineTool({
  name: "create_credit_card_payment",
  title: "Pay a credit card bill",
  description:
    "Pay (part of) a credit card bill from a bank account. It moves money from the account to the card: the card's owed balance and the account balance both go down, and it is neutral in spending and income reports. fromAccount defaults to the card's own account (the one it was created under). The payment is applied to the oldest unpaid invoices first. NOT for refunds: use create_refund. Amount is positive, in major units. Use dryRun=true to preview.",
  input: z.object({
    creditCard: z.string().describe("The card name, last 4 or id."),
    amount: z.number().positive(),
    fromAccount: z.string().optional().describe("Defaults to the card's owner account."),
    date: z.iso.date().optional().describe("Defaults to today."),
    description: z.string().min(1).max(512).optional(),
    dryRun: z.boolean().default(false),
  }),
  annotations: WRITE,
  async handler(context, args): Promise<ToolOutput> {
    const problems = new Problems();
    const cardId = problems.take(
      "creditCard",
      await context.refs.resolveCreditCard(args.creditCard),
    );
    const fromAccountId = args.fromAccount
      ? problems.take("fromAccount", await context.refs.resolveAccount(args.fromAccount))
      : undefined;
    if (problems.any || !cardId) return clarificationOutput(problems);
    const card = await context.client.request(creditCardsEndpoints.get, { params: { id: cardId } });
    const currency = card.currencyCode;
    const date = args.date ?? (await context.refs.today());
    const body = {
      amount: majorToMinor(args.amount, currency),
      fromAccountId: fromAccountId ?? card.ownerAccountId,
      paymentDate: date,
      postedDate: date,
      ...(args.description ? { description: args.description } : {}),
    };
    if (args.dryRun) {
      return {
        summary: "Dry run: nothing was paid.",
        data: {
          status: "dry_run",
          wouldPay: { ...body, amountDisplay: majorToMoney(args.amount, currency) },
        },
      };
    }
    const payment = await context.client.request(creditCardsEndpoints.createPayment, {
      params: { id: cardId },
      body,
    });
    context.refs.invalidate();
    const cycleId = payment.allocations[0]?.billingCycleId ?? null;
    return {
      summary: `Paid ${majorToMoney(args.amount, currency).formatted} on ${card.name}.`,
      data: {
        status: "created",
        paymentId: payment.paymentId,
        allocations: payment.allocations.length,
        ...(await invoiceSummary(context, cardId, cycleId)),
      },
    };
  },
});
