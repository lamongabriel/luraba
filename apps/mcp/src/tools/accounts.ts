import {
  type AccountDetails,
  accountsEndpoints,
  cashAccountSubtypeSchema,
  createAccountProfileSchema,
  creditCardsEndpoints,
  cryptoAccountSubtypeSchema,
  investmentAccountSubtypeSchema,
  loanAccountSubtypeSchema,
  otherAssetSubtypeSchema,
  otherLiabilitySubtypeSchema,
  propertyAccountSubtypeSchema,
  transactionsEndpoints,
  updateAccountProfileSchema,
  vehicleAccountSubtypeSchema,
} from "@luraba/contracts";
import { z } from "zod";
import { LurabaApiError } from "../client/errors.js";
import { majorToMinor, toMoney } from "../format/money.js";
import { clarificationOutput, Problems } from "../resolve/problems.js";
import { DESTRUCTIVE, defineTool, IDEMPOTENT_WRITE, type ToolOutput, WRITE } from "./types.js";

/** Account types an agent can create (credit cards have their own tools). */
const ACCOUNT_KINDS = [
  "cash",
  "investment",
  "crypto",
  "loan",
  "property",
  "vehicle",
  "other_asset",
  "other_liability",
] as const;
type AccountKind = (typeof ACCOUNT_KINDS)[number];

const SUBTYPES: Record<AccountKind, { options: readonly string[]; fallback: string }> = {
  cash: { options: cashAccountSubtypeSchema.options, fallback: "checking" },
  investment: { options: investmentAccountSubtypeSchema.options, fallback: "brokerage" },
  crypto: { options: cryptoAccountSubtypeSchema.options, fallback: "wallet" },
  loan: { options: loanAccountSubtypeSchema.options, fallback: "personal" },
  property: { options: propertyAccountSubtypeSchema.options, fallback: "house" },
  vehicle: { options: vehicleAccountSubtypeSchema.options, fallback: "car" },
  other_asset: { options: otherAssetSubtypeSchema.options, fallback: "other" },
  other_liability: { options: otherLiabilitySubtypeSchema.options, fallback: "other" },
};

/** Details that are money in the contract (minor units) but major units for an agent. */
const MONEY_DETAILS = ["originalPrincipal", "paymentAmount"] as const;

const typeDescription = `One of: ${ACCOUNT_KINDS.join(", ")}. A bank account is "cash" (subtype checking, savings, cash, money_market, certificate_of_deposit, prepaid). A cash subtype such as "checking" or "savings" is also accepted here and means type=cash. Credit cards are not accounts: use create_credit_card.`;

/** Accepts `checking` as shorthand for type=cash, subtype=checking. */
function normalizeKind(
  type: string,
  subtype: string | undefined,
): { kind: AccountKind; subtype: string | undefined } | undefined {
  const key = type
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/gu, "_");
  if ((ACCOUNT_KINDS as readonly string[]).includes(key))
    return { kind: key as AccountKind, subtype };
  if (SUBTYPES.cash.options.includes(key)) return { kind: "cash", subtype: subtype ?? key };
  return undefined;
}

function invalid(summary: string, data: Record<string, unknown> = {}): ToolOutput {
  return { isError: true, summary, data: { status: "invalid_input", ...data } };
}

function detailsWithMajorMoney(details: Record<string, unknown>, currency: string) {
  const out = { ...details };
  for (const key of MONEY_DETAILS) {
    const value = out[key];
    if (typeof value === "number") out[key] = majorToMinor(value, currency);
  }
  return out;
}

const detailsField = z
  .record(z.string(), z.unknown())
  .optional()
  .describe(
    "Type-specific fields. vehicle: make, model, year, trim, vin, licensePlate, mileage (with mileageUnit km or mi). property: addressLine1, addressLine2, city, region, postalCode, countryCode, area (with areaUnit sqm or sqft), yearBuilt. loan: originalPrincipal and paymentAmount (major units, paymentAmount needs paymentFrequency weekly|biweekly|monthly|quarterly|annually|other), annualInterestRate (percent), interestRateType fixed|variable, termMonths, startDate, maturityDate, securedAssetAccountId. crypto: walletAddress, network.",
  );

function summarizeAccount(account: AccountDetails) {
  return {
    id: account.id,
    name: account.name,
    institution: account.institutionName,
    institutionDomain: account.institutionDomain,
    type: account.type,
    subtype: account.details.subtype,
    classification: account.classification,
    currency: account.currencyCode,
    balance: toMoney(account.balance, account.currencyCode),
    notes: account.notes,
    details: account.details,
  };
}

export const createAccount = defineTool({
  name: "create_account",
  title: "Create an account",
  description:
    "Create an account: a bank account (type cash, subtype checking/savings/...), investment, crypto, loan, property, vehicle or other asset/liability. Give the starting balance or value as openingBalance in major units (a car worth 38000 -> 38000; for a loan or other liability give the amount owed as a positive number). currency defaults to the household currency. Put vehicle or property specifics in details (e.g. {make, model, year, mileage: 93000, mileageUnit: 'km'}). The API has no business flag, color or icon for accounts: say so instead of faking them (use notes). An account with the same name is not created twice. Use dryRun=true to preview.",
  input: z.object({
    name: z.string().trim().min(1).max(255),
    type: z.string().describe(typeDescription),
    subtype: z.string().optional().describe("Defaults to a common one for the type."),
    currency: z.string().length(3).optional().describe("ISO 4217. Defaults to the household's."),
    institution: z.string().trim().min(1).max(255).optional().describe("Bank or issuer name."),
    institutionDomain: z
      .string()
      .optional()
      .describe("Website of the institution, e.g. chase.com; used for its logo."),
    openingBalance: z.number().optional().describe("Starting balance or value, major units."),
    balanceAsOfDate: z.iso.date().optional().describe("Date of the opening balance."),
    notes: z.string().max(4000).optional(),
    details: detailsField,
    dryRun: z.boolean().default(false),
  }),
  annotations: WRITE,
  async handler({ client, refs }, args) {
    const normalized = normalizeKind(args.type, args.subtype);
    if (!normalized)
      return invalid(`Unknown account type "${args.type}".`, { allowedTypes: ACCOUNT_KINDS });
    const { kind } = normalized;
    const spec = SUBTYPES[kind];
    const subtype = normalized.subtype ?? spec.fallback;
    if (!spec.options.includes(subtype))
      return invalid(`"${subtype}" is not a ${kind} subtype.`, { allowedSubtypes: spec.options });

    const currency = (args.currency ?? (await refs.defaultCurrency())).toUpperCase();
    const existing = (await refs.accounts()).find(
      (account) => account.name.toLowerCase() === args.name.toLowerCase(),
    );
    if (existing)
      return {
        isError: true,
        summary: `An account named "${existing.name}" already exists; nothing was created. Use update_account to change it or pick another name.`,
        data: { status: "already_exists", account: { id: existing.id, name: existing.name } },
      };

    const profile = createAccountProfileSchema.safeParse({
      kind,
      subtype,
      ...detailsWithMajorMoney(args.details ?? {}, currency),
    });
    if (!profile.success)
      return invalid(
        `Invalid details: ${profile.error.issues.map((issue) => `${issue.path.join(".") || "details"}: ${issue.message}`).join("; ")}`,
      );

    const body = {
      name: args.name,
      type: kind,
      currencyCode: currency,
      details: profile.data,
      ...(args.institution ? { institutionName: args.institution } : {}),
      ...(args.institutionDomain ? { institutionDomain: args.institutionDomain } : {}),
      ...(args.notes ? { notes: args.notes } : {}),
      ...(args.openingBalance === undefined
        ? {}
        : { openingBalance: majorToMinor(args.openingBalance, currency) }),
      ...(args.balanceAsOfDate ? { balanceAsOfDate: args.balanceAsOfDate } : {}),
    };
    if (args.dryRun)
      return {
        summary: "Dry run: nothing was created.",
        data: { status: "dry_run", wouldCreate: body },
      };

    const account = await client.request(accountsEndpoints.create, { body });
    refs.invalidate("accounts");
    return {
      summary: `Created ${kind}/${account.details.subtype} account "${account.name}" (${toMoney(account.balance, account.currencyCode).formatted}).`,
      data: { status: "created", account: summarizeAccount(account) },
    };
  },
});

export const updateAccount = defineTool({
  name: "update_account",
  title: "Update an account",
  description:
    "Change an account (name or id): rename it, change institution, notes, subtype or type-specific details (e.g. new mileage), or set its current balance/value with balance (major units; this records a balance adjustment dated today or balanceDate, e.g. to revalue a car). Pass null to clear institution, institutionDomain or notes. The currency, type and opening balance cannot be changed, and the API has no archive or close for accounts: use delete_account. Use dryRun=true to preview.",
  input: z.object({
    account: z.string().describe("Name or id."),
    name: z.string().trim().min(1).max(255).optional(),
    institution: z.string().trim().min(1).max(255).nullable().optional(),
    institutionDomain: z.string().nullable().optional(),
    notes: z.string().max(4000).nullable().optional(),
    subtype: z.string().optional(),
    details: detailsField,
    balance: z
      .number()
      .optional()
      .describe("The balance or value the account should have now, major units."),
    balanceDate: z.iso.date().optional().describe("Date of that balance. Defaults to today."),
    dryRun: z.boolean().default(false),
  }),
  annotations: IDEMPOTENT_WRITE,
  async handler({ client, refs }, args) {
    const problems = new Problems();
    const id = problems.take("account", await refs.resolveAccount(args.account));
    if (problems.any || !id) return clarificationOutput(problems);
    const current = await client.request(accountsEndpoints.get, { params: { id } });
    const currency = current.currencyCode;

    const body: Record<string, unknown> = {};
    if (args.name !== undefined) body.name = args.name;
    if (args.institution !== undefined) body.institutionName = args.institution;
    if (args.institutionDomain !== undefined) body.institutionDomain = args.institutionDomain;
    if (args.notes !== undefined) body.notes = args.notes;
    if (args.subtype !== undefined || args.details) {
      const subtype = args.subtype;
      if (subtype && !SUBTYPES[current.type as AccountKind]?.options.includes(subtype))
        return invalid(`"${subtype}" is not a ${current.type} subtype.`, {
          allowedSubtypes: SUBTYPES[current.type as AccountKind]?.options,
        });
      const profile = updateAccountProfileSchema.safeParse({
        kind: current.type,
        ...(subtype ? { subtype } : {}),
        ...detailsWithMajorMoney(args.details ?? {}, currency),
      });
      if (!profile.success)
        return invalid(
          `Invalid details: ${profile.error.issues.map((issue) => `${issue.path.join(".") || "details"}: ${issue.message}`).join("; ")}`,
        );
      body.details = profile.data;
    }
    if (Object.keys(body).length === 0 && args.balance === undefined)
      return invalid("Nothing to change: give at least one field or a balance.");

    const adjustment =
      args.balance === undefined
        ? undefined
        : {
            type: "adjustment" as const,
            description: `Balance adjustment: ${current.name}`,
            purchaseDate: args.balanceDate ?? (await refs.today()),
            postedDate: args.balanceDate ?? (await refs.today()),
            accountId: id,
            balance: majorToMinor(args.balance ?? 0, currency),
          };
    if (args.dryRun)
      return {
        summary: "Dry run: nothing was changed.",
        data: {
          status: "dry_run",
          account: { id, name: current.name },
          wouldUpdate: body,
          wouldAdjustBalanceTo: adjustment && toMoney(adjustment.balance, currency),
        },
      };

    let account = current;
    if (Object.keys(body).length > 0)
      account = await client.request(accountsEndpoints.update, { params: { id }, body });
    let adjusted = false;
    if (adjustment) {
      try {
        await client.request(transactionsEndpoints.create, { body: adjustment });
        adjusted = true;
        account = await client.request(accountsEndpoints.get, { params: { id } });
      } catch (error) {
        if (!(error instanceof LurabaApiError) || !/already matches/iu.test(error.message))
          throw error;
      }
    }
    refs.invalidate("accounts");
    return {
      summary: `Updated "${account.name}"${adjusted ? `; balance is now ${toMoney(account.balance, currency).formatted}` : ""}.`,
      data: { status: "updated", balanceAdjusted: adjusted, account: summarizeAccount(account) },
    };
  },
});

export const deleteAccount = defineTool({
  name: "delete_account",
  title: "Delete an account",
  description:
    "Permanently delete an account (name or id) together with ALL its transactions and any credit cards it pays. Requires confirm=true; without it nothing is deleted and you get the number of transactions and cards that would go, to show the user first.",
  input: z.object({ account: z.string(), confirm: z.boolean().default(false) }),
  annotations: DESTRUCTIVE,
  async handler({ client, refs }, { account: query, confirm }) {
    const problems = new Problems();
    const id = problems.take("account", await refs.resolveAccount(query));
    if (problems.any || !id) return clarificationOutput(problems);
    const account = await client.request(accountsEndpoints.get, { params: { id } });
    const [transactions, cards] = await Promise.all([
      client.request(accountsEndpoints.transactions, { params: { id }, query: { perPage: 1 } }),
      refs.creditCards(),
    ]);
    const dependents = {
      transactions: transactions.meta.pagination.totalCount,
      creditCards: cards.filter((card) => card.ownerAccountId === id).map((card) => card.name),
    };
    if (!confirm)
      return {
        summary: `Not deleted: confirm=true is required. "${account.name}" has ${dependents.transactions} transaction(s) and ${dependents.creditCards.length} credit card(s) that would be deleted with it.`,
        data: {
          status: "confirmation_required",
          account: {
            id,
            name: account.name,
            balance: toMoney(account.balance, account.currencyCode),
          },
          dependents,
        },
      };
    await client.request(accountsEndpoints.delete, { params: { id } });
    refs.invalidate();
    return {
      summary: `Deleted account "${account.name}" and ${dependents.transactions} transaction(s).`,
      data: { status: "deleted", deleted: { id, name: account.name }, dependents },
    };
  },
});

const day = z.number().int().min(1).max(31);

export const createCreditCard = defineTool({
  name: "create_credit_card",
  title: "Create a credit card",
  description:
    "Create a credit card. ownerAccount is the bank account (type cash) that pays its invoices, by name or id; the card takes its currency. brand is the network (Visa, Mastercard, American Express...). limit is the credit limit in major units, closingDay and dueDay are days of the month (1-31). Optional institution/institutionDomain for the logo, color and notes. Use dryRun=true to preview.",
  input: z.object({
    name: z.string().trim().min(1).max(255),
    ownerAccount: z.string().describe("The paying account, name or id."),
    brand: z.string().trim().min(1).max(64),
    last4: z.string().regex(/^\d{4}$/u, "Exactly four digits"),
    limit: z.number().positive().describe("Credit limit, major units."),
    closingDay: day,
    dueDay: day,
    institution: z.string().trim().min(1).max(255).optional(),
    institutionDomain: z.string().optional(),
    color: z.string().min(1).max(32).optional(),
    notes: z.string().max(4000).optional(),
    dryRun: z.boolean().default(false),
  }),
  annotations: WRITE,
  async handler({ client, refs }, args) {
    const problems = new Problems();
    const ownerId = problems.take("ownerAccount", await refs.resolveAccount(args.ownerAccount));
    if (problems.any || !ownerId) return clarificationOutput(problems);
    const owner = (await refs.accounts()).find((account) => account.id === ownerId);
    if (!owner || owner.type !== "cash")
      return invalid(
        `"${owner?.name ?? args.ownerAccount}" is not a bank account; the paying account must be of type cash (checking, savings...).`,
      );
    const body = {
      name: args.name,
      ownerAccountId: ownerId,
      brand: args.brand,
      last4: args.last4,
      closingDay: args.closingDay,
      dueDay: args.dueDay,
      creditLimitAmount: majorToMinor(args.limit, owner.currencyCode),
      ...(args.institution ? { institutionName: args.institution } : {}),
      ...(args.institutionDomain ? { institutionDomain: args.institutionDomain } : {}),
      ...(args.color ? { color: args.color } : {}),
      ...(args.notes ? { notes: args.notes } : {}),
    };
    if (args.dryRun)
      return {
        summary: "Dry run: nothing was created.",
        data: { status: "dry_run", wouldCreate: body, currency: owner.currencyCode },
      };
    const card = await client.request(creditCardsEndpoints.create, { body });
    refs.invalidate("creditCards", "accounts");
    return {
      summary: `Created ${card.brand} card "${card.name}" ending ${card.last4}, limit ${toMoney(card.creditLimitAmount, card.currencyCode).formatted}, paid from "${owner.name}".`,
      data: { status: "created", creditCard: summarizeCard(card) },
    };
  },
});

function summarizeCard(card: {
  id: string;
  name: string;
  institutionName: string | null;
  brand: string;
  last4: string;
  currencyCode: string;
  creditLimitAmount: number;
  closingDay: number;
  dueDay: number;
  ownerAccount: { id: string; name: string };
}) {
  return {
    id: card.id,
    name: card.name,
    institution: card.institutionName,
    brand: card.brand,
    last4: card.last4,
    currency: card.currencyCode,
    limit: toMoney(card.creditLimitAmount, card.currencyCode),
    closingDay: card.closingDay,
    dueDay: card.dueDay,
    payingAccount: { id: card.ownerAccount.id, name: card.ownerAccount.name },
  };
}

export const updateCreditCard = defineTool({
  name: "update_credit_card",
  title: "Update a credit card",
  description:
    "Change a credit card (name, last 4 or id): name, brand, last4, limit (major units), closingDay, dueDay, institution, color, notes. Pass null to clear institution, institutionDomain, color or notes. The paying account and currency cannot be changed after creation. Use dryRun=true to preview.",
  input: z.object({
    creditCard: z.string().describe("Name, last 4 or id."),
    name: z.string().trim().min(1).max(255).optional(),
    brand: z.string().trim().min(1).max(64).optional(),
    last4: z
      .string()
      .regex(/^\d{4}$/u)
      .optional(),
    limit: z.number().positive().optional(),
    closingDay: day.optional(),
    dueDay: day.optional(),
    institution: z.string().trim().min(1).max(255).nullable().optional(),
    institutionDomain: z.string().nullable().optional(),
    color: z.string().min(1).max(32).nullable().optional(),
    notes: z.string().max(4000).nullable().optional(),
    dryRun: z.boolean().default(false),
  }),
  annotations: IDEMPOTENT_WRITE,
  async handler({ client, refs }, args) {
    const problems = new Problems();
    const id = problems.take("creditCard", await refs.resolveCreditCard(args.creditCard));
    if (problems.any || !id) return clarificationOutput(problems);
    const card = await client.request(creditCardsEndpoints.get, { params: { id } });
    const body: Record<string, unknown> = {};
    if (args.name !== undefined) body.name = args.name;
    if (args.brand !== undefined) body.brand = args.brand;
    if (args.last4 !== undefined) body.last4 = args.last4;
    if (args.limit !== undefined)
      body.creditLimitAmount = majorToMinor(args.limit, card.currencyCode);
    if (args.closingDay !== undefined) body.closingDay = args.closingDay;
    if (args.dueDay !== undefined) body.dueDay = args.dueDay;
    if (args.institution !== undefined) body.institutionName = args.institution;
    if (args.institutionDomain !== undefined) body.institutionDomain = args.institutionDomain;
    if (args.color !== undefined) body.color = args.color;
    if (args.notes !== undefined) body.notes = args.notes;
    if (Object.keys(body).length === 0)
      return invalid("Nothing to change: give at least one field.");
    if (args.dryRun)
      return {
        summary: "Dry run: nothing was changed.",
        data: { status: "dry_run", creditCard: { id, name: card.name }, wouldUpdate: body },
      };
    const updated = await client.request(creditCardsEndpoints.update, { params: { id }, body });
    refs.invalidate("creditCards");
    return {
      summary: `Updated credit card "${updated.name}".`,
      data: { status: "updated", creditCard: summarizeCard(updated) },
    };
  },
});

export const deleteCreditCard = defineTool({
  name: "delete_credit_card",
  title: "Delete a credit card",
  description:
    "Permanently delete a credit card (name, last 4 or id) with its purchases, invoices and payments. Requires confirm=true; without it nothing is deleted and you get the card's current balance to show the user first.",
  input: z.object({ creditCard: z.string(), confirm: z.boolean().default(false) }),
  annotations: DESTRUCTIVE,
  async handler({ client, refs }, { creditCard, confirm }) {
    const problems = new Problems();
    const id = problems.take("creditCard", await refs.resolveCreditCard(creditCard));
    if (problems.any || !id) return clarificationOutput(problems);
    const card = await client.request(creditCardsEndpoints.get, { params: { id } });
    const info = {
      id,
      name: card.name,
      last4: card.last4,
      owed: toMoney(Math.abs(card.balance), card.currencyCode),
    };
    if (!confirm)
      return {
        summary: `Not deleted: confirm=true is required. "${card.name}" owes ${info.owed.formatted}; its purchases, invoices and payments would be deleted too.`,
        data: { status: "confirmation_required", creditCard: info },
      };
    await client.request(creditCardsEndpoints.delete, { params: { id } });
    refs.invalidate();
    return {
      summary: `Deleted credit card "${card.name}".`,
      data: { status: "deleted", deleted: info },
    };
  },
});
