import {
  accountsEndpoints,
  authEndpoints,
  categoriesEndpoints,
  creditCardsEndpoints,
  householdsEndpoints,
  merchantsEndpoints,
  paymentMethodsEndpoints,
  tagsEndpoints,
} from "@luraba/contracts";
import { formatISODate, getTodayInTimezone } from "@luraba/domain";
import { fetchAllPages, PAGE_SIZE } from "../client/fetch-all.js";
import type { LurabaClient } from "../client/luraba-client.js";
import type { Resolution } from "./match.js";
import { resolveByName } from "./match.js";

/**
 * Reference data an agent names instead of giving ids. Each list is read once per tool call and
 * shared by every resolution in it.
 */
export class References {
  readonly #client: LurabaClient;
  readonly #householdId: string | undefined;
  #cache = new Map<string, Promise<unknown>>();

  constructor(client: LurabaClient, householdId?: string) {
    this.#client = client;
    this.#householdId = householdId;
  }

  #memo<T>(key: string, load: () => Promise<T>): Promise<T> {
    let value = this.#cache.get(key) as Promise<T> | undefined;
    if (!value) {
      value = load();
      this.#cache.set(key, value);
    }
    return value;
  }

  /** Forget cached lists after a mutation created or renamed something. */
  invalidate(...keys: string[]) {
    for (const key of keys.length > 0 ? keys : [...this.#cache.keys()]) {
      this.#cache.delete(key);
      this.#cache.delete(`${key}:withArchived`);
    }
  }

  session() {
    return this.#memo("session", () => this.#client.request(authEndpoints.me, this.#scope()));
  }

  /** Active accounts; archived ones are hidden unless `includeArchived` (used to find them to unarchive). */
  accounts(includeArchived = false) {
    return this.#memo(includeArchived ? "accounts:withArchived" : "accounts", () =>
      fetchAllPages((page) =>
        this.#client.request(accountsEndpoints.list, {
          ...this.#scope(),
          query: {
            page,
            perPage: PAGE_SIZE,
            ...(includeArchived ? { includeArchived: true } : {}),
          },
        }),
      ),
    );
  }

  /** Active credit cards; archived ones are hidden unless `includeArchived`. */
  creditCards(includeArchived = false) {
    return this.#memo(includeArchived ? "creditCards:withArchived" : "creditCards", () =>
      fetchAllPages((page) =>
        this.#client.request(creditCardsEndpoints.list, {
          ...this.#scope(),
          query: {
            page,
            perPage: PAGE_SIZE,
            ...(includeArchived ? { includeArchived: true } : {}),
          },
        }),
      ),
    );
  }

  categories() {
    return this.#memo("categories", () =>
      fetchAllPages((page) =>
        this.#client.request(categoriesEndpoints.list, {
          ...this.#scope(),
          query: { page, perPage: PAGE_SIZE },
        }),
      ),
    );
  }

  merchants() {
    return this.#memo("merchants", () =>
      fetchAllPages((page) =>
        this.#client.request(merchantsEndpoints.list, {
          ...this.#scope(),
          query: { page, perPage: PAGE_SIZE },
        }),
      ),
    );
  }

  tags() {
    return this.#memo("tags", () =>
      fetchAllPages((page) =>
        this.#client.request(tagsEndpoints.list, {
          ...this.#scope(),
          query: { page, perPage: PAGE_SIZE },
        }),
      ),
    );
  }

  paymentMethods() {
    return this.#memo("paymentMethods", () =>
      fetchAllPages((page) =>
        this.#client.request(paymentMethodsEndpoints.list, {
          ...this.#scope(),
          query: { page, perPage: PAGE_SIZE },
        }),
      ),
    );
  }

  households() {
    return this.#memo("households", () =>
      this.#client.request(householdsEndpoints.list, { query: {} }),
    );
  }

  /** Today's date in the household's time zone, `YYYY-MM-DD`. */
  async today(): Promise<string> {
    const session = await this.session();
    const timezone = session.household?.settings.timezone ?? session.user.preferences.timezone;
    return formatISODate(getTodayInTimezone(timezone));
  }

  /** The household's default currency (what an amount without a currency means). */
  async defaultCurrency(): Promise<string> {
    const session = await this.session();
    return session.household?.settings.defaultCurrencyId ?? session.user.preferences.currency;
  }

  async resolveAccount(query: string, includeArchived = false): Promise<Resolution> {
    return resolveByName(query, await this.accounts(includeArchived), (account) =>
      account.institutionName
        ? [account.institutionName, `${account.institutionName} ${account.name}`]
        : [],
    );
  }

  async resolveCreditCard(query: string, includeArchived = false): Promise<Resolution> {
    return resolveByName(query, await this.creditCards(includeArchived), (card) => [
      ...(card.institutionName
        ? [card.institutionName, `${card.institutionName} ${card.name}`]
        : []),
      `${card.name} ${card.last4}`,
      card.last4,
    ]);
  }

  async resolveCategory(query: string): Promise<Resolution> {
    return resolveByName(query, await this.categories());
  }

  async resolveMerchant(query: string): Promise<Resolution> {
    return resolveByName(query, await this.merchants());
  }

  async resolveTag(query: string): Promise<Resolution> {
    return resolveByName(query, await this.tags());
  }

  #scope() {
    return this.#householdId ? { householdId: this.#householdId } : {};
  }
}
