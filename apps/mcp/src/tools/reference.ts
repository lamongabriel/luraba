import { categoriesEndpoints, merchantsEndpoints, tagsEndpoints } from "@luraba/contracts";
import { z } from "zod";
import { toMoney } from "../format/money.js";
import { clarificationOutput, Problems } from "../resolve/problems.js";
import { ICON_HINT, resolveIcon } from "./icons.js";
import { defineTool, IDEMPOTENT_WRITE, READ_ONLY, WRITE } from "./types.js";

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/u);

export const whoami = defineTool({
  name: "whoami",
  title: "Who am I and which household",
  description:
    "The user behind the API key, the active household, the role there and the permissions the key therefore has, the default currency and time zone. Call this first when unsure what you may do.",
  input: z.object({}),
  annotations: READ_ONLY,
  async handler({ refs }) {
    const session = await refs.session();
    return {
      data: {
        user: { id: session.user.id, name: session.user.name, email: session.user.email },
        household: session.household && {
          id: session.household.id,
          name: session.household.name,
          role: session.household.role,
          permissions: session.household.permissions,
          defaultCurrency: session.household.settings.defaultCurrencyId,
          timezone: session.household.settings.timezone,
        },
        today: await refs.today(),
      },
    };
  },
});

export const listHouseholds = defineTool({
  name: "list_households",
  title: "List households",
  description:
    "Households the API key can access, with the role in each. Other tools act in the default household unless LURABA_HOUSEHOLD_ID is set.",
  input: z.object({}),
  annotations: READ_ONLY,
  async handler({ refs }) {
    const result = await refs.households();
    return {
      data: {
        households: result.data.map((household) => ({
          id: household.id,
          name: household.name,
          role: household.role,
          currency: household.defaultCurrencyId,
        })),
      },
    };
  },
});

export const listAccounts = defineTool({
  name: "list_accounts",
  title: "List accounts with balances",
  description:
    "Accounts (bank, cash, investment, loan, property...) with balance and currency. Liabilities have negative or owed balances as stored. Filter by text (matches name or institution) or type. Archived accounts are hidden unless includeArchived=true.",
  input: z.object({
    search: z.string().optional().describe("Part of the account or bank name."),
    type: z.string().optional().describe("Account type, e.g. cash, investment, loan."),
    includeArchived: z
      .boolean()
      .default(false)
      .describe("Also list archived accounts (hidden by default)."),
  }),
  annotations: READ_ONLY,
  async handler({ refs }, { search, type, includeArchived }) {
    const needle = search?.trim().toLowerCase();
    const accounts = (await refs.accounts(includeArchived)).filter(
      (account) =>
        (!type || account.type === type) &&
        (!needle ||
          account.name.toLowerCase().includes(needle) ||
          (account.institutionName ?? "").toLowerCase().includes(needle)),
    );
    return {
      summary: `${accounts.length} account(s).`,
      data: {
        accounts: accounts.map((account) => ({
          id: account.id,
          name: account.name,
          institution: account.institutionName,
          type: account.type,
          subtype: account.subtype,
          classification: account.classification,
          balance: toMoney(account.balance, account.currencyCode),
          ...(includeArchived ? { archived: account.archivedAt !== null } : {}),
        })),
      },
    };
  },
});

export const listCreditCards = defineTool({
  name: "list_credit_cards",
  title: "List credit cards",
  description:
    "Credit cards with limit, remaining credit, closing and due days. For invoice amounts and due dates use report_credit_cards. Archived cards are hidden unless includeArchived=true.",
  input: z.object({
    includeArchived: z.boolean().default(false).describe("Also list archived cards."),
  }),
  annotations: READ_ONLY,
  async handler({ refs }, { includeArchived }) {
    const cards = await refs.creditCards(includeArchived);
    return {
      summary: `${cards.length} credit card(s).`,
      data: {
        count: cards.length,
        creditCards: cards.map((card) => ({
          id: card.id,
          name: card.name,
          institution: card.institutionName,
          brand: card.brand,
          last4: card.last4,
          limit: toMoney(card.creditLimitAmount, card.currencyCode),
          remainingCredit:
            card.remainingCreditAmount === null
              ? null
              : toMoney(card.remainingCreditAmount, card.currencyCode),
          closingDay: card.closingDay,
          dueDay: card.dueDay,
          ...(includeArchived ? { archived: card.archivedAt !== null } : {}),
        })),
      },
    };
  },
});

export const listCategories = defineTool({
  name: "list_categories",
  title: "List categories",
  description:
    "Expense and income categories (with parent categories, icon and color). A subcategory with no icon is shown with its parent's icon in the app.",
  input: z.object({ type: z.enum(["expense", "income"]).optional() }),
  annotations: READ_ONLY,
  async handler({ refs }, { type }) {
    const all = await refs.categories();
    const byId = new Map(all.map((category) => [category.id, category.name]));
    return {
      data: {
        categories: all
          .filter((category) => !type || category.type === type)
          .map((category) => ({
            id: category.id,
            name: category.name,
            type: category.type,
            parent: category.parentId ? (byId.get(category.parentId) ?? null) : null,
            icon: category.icon,
            color: category.color,
          })),
      },
    };
  },
});

export const createCategory = defineTool({
  name: "create_category",
  title: "Create a category",
  description: `Create an expense or income category, optionally under a parent category (name or id) and with an icon. ${ICON_HINT}`,
  input: z.object({
    name: z.string().min(1).max(255),
    type: z.enum(["expense", "income"]),
    parent: z.string().optional(),
    color: hexColor.optional(),
    icon: z.string().optional().describe("A supported icon name; see list_icons."),
  }),
  annotations: WRITE,
  async handler({ client, refs }, args) {
    const problems = new Problems();
    const icon = args.icon ? resolveIcon(problems, args.icon) : undefined;
    if (problems.any) return clarificationOutput(problems);
    let parentId: string | undefined;
    if (args.parent) {
      const resolution = await refs.resolveCategory(args.parent);
      if (resolution.status !== "resolved")
        return {
          isError: true,
          summary: `Parent category "${args.parent}" is not unique or does not exist.`,
          data: { status: "needs_clarification", resolution },
        };
      parentId = resolution.id;
    }
    const category = await client.request(categoriesEndpoints.create, {
      body: {
        name: args.name,
        type: args.type,
        ...(parentId ? { parentId } : {}),
        ...(args.color ? { color: args.color } : {}),
        ...(icon ? { icon } : {}),
      },
    });
    refs.invalidate("categories");
    return {
      summary: `Created category "${category.name}".`,
      data: { status: "created", category },
    };
  },
});

export const updateCategory = defineTool({
  name: "update_category",
  title: "Update a category",
  description: `Rename a category or change its color, icon or parent. ${ICON_HINT}`,
  input: z.object({
    category: z.string().describe("Name or id."),
    name: z.string().min(1).max(255).optional(),
    color: hexColor.optional(),
    parent: z.string().optional().describe("New parent category name or id."),
    clearParent: z.boolean().optional(),
    icon: z.string().optional().describe("A supported icon name; see list_icons."),
    clearIcon: z.boolean().optional().describe("Remove the icon (the parent's or default shows)."),
  }),
  annotations: IDEMPOTENT_WRITE,
  async handler({ client, refs }, args) {
    const problems = new Problems();
    const icon = args.icon ? resolveIcon(problems, args.icon) : undefined;
    if (problems.any) return clarificationOutput(problems);
    if (args.icon && args.clearIcon)
      return {
        isError: true,
        summary: "Give either icon or clearIcon, not both.",
        data: { status: "invalid_input" },
      };
    const target = await refs.resolveCategory(args.category);
    if (target.status !== "resolved")
      return {
        isError: true,
        summary: "Category not found or ambiguous.",
        data: { resolution: target },
      };
    let parentId: string | null | undefined = args.clearParent ? null : undefined;
    if (args.parent) {
      const parent = await refs.resolveCategory(args.parent);
      if (parent.status !== "resolved")
        return {
          isError: true,
          summary: "Parent not found or ambiguous.",
          data: { resolution: parent },
        };
      parentId = parent.id;
    }
    const body = {
      ...(args.name ? { name: args.name } : {}),
      ...(args.color ? { color: args.color } : {}),
      ...(icon ? { icon } : {}),
      ...(args.clearIcon ? { icon: null } : {}),
      ...(parentId === undefined ? {} : { parentId }),
    };
    if (Object.keys(body).length === 0)
      return { isError: true, summary: "Nothing to update.", data: { status: "invalid_input" } };
    const category = await client.request(categoriesEndpoints.update, {
      params: { id: target.id },
      body,
    });
    refs.invalidate("categories");
    return {
      summary: `Updated category "${category.name}".`,
      data: { status: "updated", category },
    };
  },
});

export const listMerchants = defineTool({
  name: "list_merchants",
  title: "List merchants",
  description: "Merchants (shops, companies). Filter by part of the name.",
  input: z.object({ search: z.string().optional() }),
  annotations: READ_ONLY,
  async handler({ refs }, { search }) {
    const needle = search?.trim().toLowerCase();
    const merchants = (await refs.merchants()).filter(
      (merchant) => !needle || merchant.name.toLowerCase().includes(needle),
    );
    return {
      summary: `${merchants.length} merchant(s).`,
      data: { merchants: merchants.map((m) => ({ id: m.id, name: m.name, domain: m.domain })) },
    };
  },
});

export const createMerchant = defineTool({
  name: "create_merchant",
  title: "Create a merchant",
  description:
    "Create a merchant. Returns the existing one instead when the exact name already exists.",
  input: z.object({ name: z.string().min(1).max(255), domain: z.string().optional() }),
  annotations: WRITE,
  async handler({ client, refs }, args) {
    const existing = await refs.resolveMerchant(args.name);
    if (existing.status === "resolved" && existing.match === "exact")
      return {
        summary: `Merchant "${existing.name}" already exists.`,
        data: { status: "already_exists", id: existing.id, name: existing.name },
      };
    const merchant = await client.request(merchantsEndpoints.create, {
      body: { name: args.name, ...(args.domain ? { domain: args.domain } : {}) },
    });
    refs.invalidate("merchants");
    return {
      summary: `Created merchant "${merchant.name}".`,
      data: { status: "created", merchant },
    };
  },
});

export const updateMerchant = defineTool({
  name: "update_merchant",
  title: "Update a merchant",
  description: "Rename a merchant or change its website domain.",
  input: z.object({
    merchant: z.string().describe("Name or id."),
    name: z.string().min(1).max(255).optional(),
    domain: z.string().optional(),
  }),
  annotations: IDEMPOTENT_WRITE,
  async handler({ client, refs }, args) {
    const target = await refs.resolveMerchant(args.merchant);
    if (target.status !== "resolved")
      return {
        isError: true,
        summary: "Merchant not found or ambiguous.",
        data: { resolution: target },
      };
    const body = {
      ...(args.name ? { name: args.name } : {}),
      ...(args.domain ? { domain: args.domain } : {}),
    };
    if (Object.keys(body).length === 0)
      return { isError: true, summary: "Nothing to update.", data: { status: "invalid_input" } };
    const merchant = await client.request(merchantsEndpoints.update, {
      params: { id: target.id },
      body,
    });
    refs.invalidate("merchants");
    return {
      summary: `Updated merchant "${merchant.name}".`,
      data: { status: "updated", merchant },
    };
  },
});

export const listTags = defineTool({
  name: "list_tags",
  title: "List tags",
  description: "Tags available for transactions.",
  input: z.object({}),
  annotations: READ_ONLY,
  async handler({ refs }) {
    const tags = await refs.tags();
    return {
      data: { tags: tags.map((tag) => ({ id: tag.id, name: tag.name, color: tag.color })) },
    };
  },
});

export const createTag = defineTool({
  name: "create_tag",
  title: "Create a tag",
  description: "Create a tag. Returns the existing one when the exact name already exists.",
  input: z.object({ name: z.string().min(1).max(64), color: hexColor.optional() }),
  annotations: WRITE,
  async handler({ client, refs }, args) {
    const existing = await refs.resolveTag(args.name);
    if (existing.status === "resolved" && existing.match === "exact")
      return {
        summary: `Tag "${existing.name}" already exists.`,
        data: { status: "already_exists", id: existing.id, name: existing.name },
      };
    const tag = await client.request(tagsEndpoints.create, {
      body: { name: args.name, ...(args.color ? { color: args.color } : {}) },
    });
    refs.invalidate("tags");
    return { summary: `Created tag "${tag.name}".`, data: { status: "created", tag } };
  },
});

export const updateTag = defineTool({
  name: "update_tag",
  title: "Update a tag",
  description: "Rename a tag or change its color.",
  input: z.object({
    tag: z.string().describe("Name or id."),
    name: z.string().min(1).max(64).optional(),
    color: hexColor.optional(),
  }),
  annotations: IDEMPOTENT_WRITE,
  async handler({ client, refs }, args) {
    const target = await refs.resolveTag(args.tag);
    if (target.status !== "resolved")
      return {
        isError: true,
        summary: "Tag not found or ambiguous.",
        data: { resolution: target },
      };
    const body = {
      ...(args.name ? { name: args.name } : {}),
      ...(args.color ? { color: args.color } : {}),
    };
    if (Object.keys(body).length === 0)
      return { isError: true, summary: "Nothing to update.", data: { status: "invalid_input" } };
    const tag = await client.request(tagsEndpoints.update, { params: { id: target.id }, body });
    refs.invalidate("tags");
    return { summary: `Updated tag "${tag.name}".`, data: { status: "updated", tag } };
  },
});
