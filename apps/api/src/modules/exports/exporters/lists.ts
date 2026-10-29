import { formatDecimalAmount } from "@luraba/domain";
import { accountsRepository } from "@/modules/accounts/accounts.repository";
import { categoriesRepository } from "@/modules/categories/categories.repository";
import * as creditCardsRepository from "@/modules/credit-cards/credit-cards.repository";
import { merchantsRepository } from "@/modules/merchants/merchants.repository";
import { tagsRepository } from "@/modules/tags/tags.repository";
import type { Exporter, ExportTable } from "../exports.types";

function table(
  columns: string[],
  records: Array<Record<string, string | number | boolean | null>>,
): ExportTable {
  return { columns, records };
}

const iso = (value: Date | null | undefined) => (value ? value.toISOString() : null);

export const accountsExporter: Exporter = {
  id: "accounts",
  label: "Accounts",
  description: "Bank, cash and investment accounts.",
  formats: ["csv", "json"],
  supportsDateRange: false,
  async load(context) {
    const accounts = await accountsRepository.list(context);
    return {
      accounts: table(
        ["id", "name", "type", "classification", "currency", "institution", "created_at"],
        accounts.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          classification: a.classification,
          currency: a.currencyId,
          institution: a.institutionName ?? null,
          created_at: iso(a.createdAt),
        })),
      ),
    };
  },
};

export const creditCardsExporter: Exporter = {
  id: "credit-cards",
  label: "Credit cards",
  description: "Cards with limit, closing and due days.",
  formats: ["csv", "json"],
  supportsDateRange: false,
  async load(context) {
    const cards = await creditCardsRepository.listByHouseholdId(context.householdId);
    return {
      credit_cards: table(
        ["id", "name", "brand", "last4", "currency", "closing_day", "due_day", "credit_limit"],
        cards.map((c) => ({
          id: c.id,
          name: c.name,
          brand: c.brand,
          last4: c.last4,
          currency: c.currencyCode,
          closing_day: c.closingDay,
          due_day: c.dueDay,
          credit_limit: c.creditLimitAmount < 0 ? null : formatDecimalAmount(c.creditLimitAmount),
        })),
      ),
    };
  },
};

export const merchantsExporter: Exporter = {
  id: "merchants",
  label: "Merchants",
  description: "Merchants and their domains.",
  formats: ["csv", "json"],
  supportsDateRange: false,
  async load(context) {
    const merchants = await merchantsRepository.list(context);
    return {
      merchants: table(
        ["id", "name", "domain"],
        merchants.map((m) => ({ id: m.id, name: m.name, domain: m.domain ?? null })),
      ),
    };
  },
};

export const categoriesExporter: Exporter = {
  id: "categories",
  label: "Categories",
  description: "Income and expense categories.",
  formats: ["csv", "json"],
  supportsDateRange: false,
  async load(context) {
    const categories = await categoriesRepository.list(context);
    const names = new Map(categories.map((c) => [c.id, c.name]));
    return {
      categories: table(
        ["id", "name", "type", "parent"],
        categories.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          parent: c.parentId ? (names.get(c.parentId) ?? null) : null,
        })),
      ),
    };
  },
};

export const tagsExporter: Exporter = {
  id: "tags",
  label: "Tags",
  description: "Tags used on transactions.",
  formats: ["csv", "json"],
  supportsDateRange: false,
  async load(context) {
    const tags = await tagsRepository.list(context);
    return {
      tags: table(
        ["id", "name"],
        tags.map((t) => ({ id: t.id, name: t.name })),
      ),
    };
  },
};
