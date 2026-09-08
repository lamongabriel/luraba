import { listAccountsQuerySchema } from "@luraba/contracts/accounts";
import { listAccountTransactionsQuerySchema } from "@luraba/contracts/transactions";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { cashAccountProfilesTable } from "@/db/schemas/account-profiles.schema";
import { accountsTable } from "@/db/schemas/accounts.schema";
import { entriesTable } from "@/db/schemas/entries.schema";
import { transactionsTable } from "@/db/schemas/transactions.schema";
import * as categoriesService from "@/modules/categories/categories.service";
import * as creditCardsService from "@/modules/credit-cards/credit-cards.service";
import * as brandfetchService from "@/modules/integrations/brandfetch/brandfetch.service";
import { ledgerAccountsRepository } from "@/modules/ledger-accounts/ledger-accounts.repository";
import * as transactionsService from "@/modules/transactions/transactions.service";
import { ConflictError, NotFoundError } from "@/shared/errors";
import { createAuthenticatedContext } from "@/test/auth";
import {
  buildAccountInput,
  buildCategoryInput,
  buildCreditCardInput,
  createBalanceEntryForAccount,
} from "@/test/factories";
import * as accountsService from "../accounts.service";

describe("accounts service", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates an account, derives classification, and creates a backing ledger account", async () => {
    const context = await createAuthenticatedContext();

    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: "Main Checking",
        type: "cash",
        currencyCode: "BRL",
      }),
    );

    expect(account.name).toBe("Main Checking");
    expect(account.classification).toBe("asset");
    expect(account.type).toBe("cash");
    expect(account.currencyCode).toBe("BRL");
    expect(account.institutionLogoUrl).toBeNull();

    const ledger = await ledgerAccountsRepository.findByOwner("account", account.id);
    expect(ledger).toBeDefined();
    expect(ledger?.classification).toBe("asset");
    expect(ledger?.currencyId).toBe("BRL");
  });

  it("creates an account with a Brandfetch institution logo when the integration is configured", async () => {
    const context = await createAuthenticatedContext();
    vi.spyOn(global, "fetch").mockResolvedValue(new Response("ok", { status: 200 }));

    await brandfetchService.updateBrandfetchIntegration(context.householdContext, {
      clientId: "brandfetch-client-id",
    });

    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: "Nu Checking",
        institutionName: "Nubank",
        institutionDomain: "https://www.nubank.com.br/conta",
      }),
    );

    expect(account.institutionDomain).toBe("nubank.com.br");
    expect(account.institutionLogoUrl).toBe(
      "https://cdn.brandfetch.io/nubank.com.br/icon.png?c=brandfetch-client-id",
    );
  });

  it("rejects unknown currencies", async () => {
    const context = await createAuthenticatedContext();

    await expect(
      accountsService.createAccount(
        context.householdContext,
        buildAccountInput({
          currencyCode: "ZZZ",
        }),
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("rejects duplicate account names in the same household", async () => {
    const context = await createAuthenticatedContext();
    const input = buildAccountInput({ name: "Emergency Fund" });

    await accountsService.createAccount(context.householdContext, input);

    await expect(accountsService.createAccount(context.householdContext, input)).rejects.toThrow(
      ConflictError,
    );
  });

  it("allows the same account name in different households", async () => {
    const left = await createAuthenticatedContext();
    const right = await createAuthenticatedContext();
    const input = buildAccountInput({ name: "Shared Name" });

    const leftAccount = await accountsService.createAccount(left.householdContext, input);
    const rightAccount = await accountsService.createAccount(right.householdContext, input);

    expect(leftAccount.id).not.toBe(rightAccount.id);
    expect(leftAccount.name).toBe(rightAccount.name);
  });

  it("lists only accounts from the active household with computed balances", async () => {
    const context = await createAuthenticatedContext();
    const otherContext = await createAuthenticatedContext();

    const asset = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: "Cash",
        type: "cash",
      }),
    );

    const liability = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: "Loan",
        type: "loan",
      }),
    );

    await accountsService.createAccount(
      otherContext.householdContext,
      buildAccountInput({
        name: "Foreign Household Account",
      }),
    );

    await createBalanceEntryForAccount({
      householdId: context.household.id,
      accountId: asset.id,
      amount: 12_500,
      currencyCode: "BRL",
    });

    await createBalanceEntryForAccount({
      householdId: context.household.id,
      accountId: liability.id,
      amount: 4_000,
      currencyCode: "BRL",
    });

    const accounts = await accountsService.listAccounts(
      context.householdContext,
      listAccountsQuerySchema.parse({}),
    );

    expect(accounts.data).toHaveLength(2);
    expect(accounts.data.map((account) => account.name).sort()).toEqual(["Cash", "Loan"]);
    expect(accounts.data.find((account) => account.id === asset.id)?.balance).toBe(12_500);
    expect(accounts.data.find((account) => account.id === liability.id)?.balance).toBe(-4_000);
  });

  it("returns account details with the displayed balance", async () => {
    const context = await createAuthenticatedContext();
    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: "Car Loan",
        type: "loan",
      }),
    );

    await createBalanceEntryForAccount({
      householdId: context.household.id,
      accountId: account.id,
      amount: 9_999,
      currencyCode: "BRL",
    });

    const details = await accountsService.getAccountDetails(context.householdContext, account.id);

    expect(details.id).toBe(account.id);
    expect(details.balance).toBe(-9_999);
    expect(details.classification).toBe("liability");
  });

  it("lists transactions for a single non-credit-card account only", async () => {
    const context = await createAuthenticatedContext();

    const checking = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({ name: "Checking", type: "cash", currencyCode: "BRL" }),
    );
    const savings = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({ name: "Savings", type: "cash", currencyCode: "BRL" }),
    );
    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: "Food", type: "expense" }),
    );

    const expense = await transactionsService.createTransaction(context.householdContext, {
      type: "expense",
      description: "Lunch",
      amount: 4_500,
      currencyCode: "BRL",
      paymentMethodCode: "pix",
      accountId: checking.id,
      categoryId: category.id,
      purchaseDate: new Date("2026-03-24T00:00:00.000Z"),
      postedDate: new Date("2026-03-24T00:00:00.000Z"),
    });

    const transfer = await transactionsService.createTransaction(context.householdContext, {
      type: "transfer",
      description: "Move money",
      fromAmount: 10_000,
      fromAccountId: checking.id,
      toAccountId: savings.id,
      purchaseDate: new Date("2026-03-25T00:00:00.000Z"),
      postedDate: new Date("2026-03-25T00:00:00.000Z"),
    });

    const transactions = await accountsService.listAccountTransactions(
      context.householdContext,
      checking.id,
      listAccountTransactionsQuerySchema.parse({}),
    );

    expect(transactions.data).toEqual([
      expect.objectContaining({
        id: transfer.id,
        type: "transfer",
        accountId: checking.id,
        toAccountId: savings.id,
      }),
      expect.objectContaining({
        id: expense.id,
        description: "Lunch",
        accountId: checking.id,
      }),
    ]);
  });

  it("rejects listing transactions for a credit card account", async () => {
    const context = await createAuthenticatedContext();
    const ownerAccount = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({ name: "Credit Card Owner", type: "cash", currencyCode: "BRL" }),
    );
    const creditCard = await creditCardsService.createCreditCard(
      context.householdContext,
      buildCreditCardInput({
        name: "Nubank",
        closingDay: 25,
        dueDay: 5,
        ownerAccountId: ownerAccount.id,
      }),
    );

    await expect(
      accountsService.listAccountTransactions(
        context.householdContext,
        creditCard.ledgerAccountId,
        listAccountTransactionsQuerySchema.parse({}),
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("updates account details and clears institution branding", async () => {
    const context = await createAuthenticatedContext();
    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: "Old Account",
        institutionName: "Old Bank",
        institutionDomain: "old.example.com",
      }),
    );

    const updated = await accountsService.updateAccount(context.householdContext, account.id, {
      name: "New Account",
      institutionName: null,
      institutionDomain: null,
      notes: "Kept simple",
    });

    expect(updated.name).toBe("New Account");
    expect(updated.institutionName).toBeNull();
    expect(updated.institutionDomain).toBeNull();
    expect(updated.institutionLogoUrl).toBeNull();
    expect(updated.notes).toBe("Kept simple");
  });

  it("deletes an account and its backing ledger when it has no entries", async () => {
    const context = await createAuthenticatedContext();
    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({ name: "Delete Me" }),
    );

    await accountsService.deleteAccount(context.householdContext, account.id);

    await expect(
      accountsService.getAccountDetails(context.householdContext, account.id),
    ).rejects.toThrow(NotFoundError);
    await expect(
      ledgerAccountsRepository.findByOwner("account", account.id),
    ).resolves.toBeUndefined();
  });

  it("deletes account transactions, entries, and the backing ledger when deleting an account with history", async () => {
    const context = await createAuthenticatedContext();
    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({ name: "Has History" }),
    );

    const entry = await createBalanceEntryForAccount({
      householdId: context.household.id,
      accountId: account.id,
      amount: 2_500,
    });

    await accountsService.deleteAccount(context.householdContext, account.id);

    const transactions = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, entry.transactionId));
    const entries = await db
      .select()
      .from(entriesTable)
      .where(eq(entriesTable.transactionId, entry.transactionId));

    expect(transactions).toHaveLength(0);
    expect(entries).toHaveLength(0);
    await expect(
      ledgerAccountsRepository.findByOwner("account", account.id),
    ).resolves.toBeUndefined();
    await expect(
      accountsService.getAccountDetails(context.householdContext, account.id),
    ).rejects.toThrow(NotFoundError);
  });

  it("rejects access to account details across households", async () => {
    const owner = await createAuthenticatedContext();
    const outsider = await createAuthenticatedContext();

    const account = await accountsService.createAccount(
      owner.householdContext,
      buildAccountInput({
        name: "Private Account",
      }),
    );

    await expect(
      accountsService.getAccountDetails(
        {
          householdId: outsider.household.id,
          userId: outsider.user.id,
          role: "owner",
          permissions: outsider.householdContext.permissions,
        },
        account.id,
      ),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("accounts DB list filters", () => {
  it("combines search, column filters, sorting, and pagination in the database", async () => {
    const context = await createAuthenticatedContext();
    const target = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: "Filter Target Checking",
        institutionName: "Filter Bank",
        type: "cash",
        currencyCode: "BRL",
      }),
    );
    await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({ name: "Filter Decoy Loan", type: "loan", currencyCode: "USD" }),
    );
    await createBalanceEntryForAccount({
      householdId: context.household.id,
      accountId: target.id,
      amount: 12_345,
    });

    const result = await accountsService.listAccounts(
      context.householdContext,
      listAccountsQuerySchema.parse({
        search: "Target",
        types: "cash,loan",
        classifications: "asset",
        currencyCodes: "BRL",
        balanceMin: 12_345,
        balanceMax: 12_345,
        hasInstitution: true,
        createdAtFrom: "2020-01-01",
        createdAtTo: "2030-01-01",
        updatedAtFrom: "2020-01-01",
        updatedAtTo: "2030-01-01",
        sort: "balance",
        sortDirection: "desc",
        page: 1,
        perPage: 1,
      }),
    );

    expect(result.data).toEqual([expect.objectContaining({ id: target.id, balance: 12_345 })]);
    expect(result.meta.pagination).toEqual({
      page: 1,
      perPage: 1,
      totalCount: 1,
      totalPages: 1,
    });
  });

  it("filters and searches normalized profile fields in PostgreSQL", async () => {
    const context = await createAuthenticatedContext();
    const vehicle = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: "Daily Driver",
        type: "vehicle",
        details: {
          kind: "vehicle",
          subtype: "car",
          make: "Toyota",
          model: "Corolla",
          year: 2024,
        },
      }),
    );
    await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: "Weekend Boat",
        type: "vehicle",
        details: { kind: "vehicle", subtype: "boat", make: "Yamaha" },
      }),
    );

    const result = await accountsService.listAccounts(
      context.householdContext,
      listAccountsQuerySchema.parse({
        search: "Corolla",
        subtypes: "car",
        sort: "subtype",
        sortDirection: "asc",
      }),
    );

    expect(result.data).toEqual([
      expect.objectContaining({ id: vehicle.id, subtype: "car", type: "vehicle" }),
    ]);
  });
});

describe("typed account profiles", () => {
  it.each([
    ["cash", { kind: "cash", subtype: "checking" }],
    ["investment", { kind: "investment", subtype: "brokerage" }],
    ["crypto", { kind: "crypto", subtype: "wallet", network: "Ethereum" }],
    [
      "property",
      { kind: "property", subtype: "house", city: "Sao Paulo", area: 120, areaUnit: "sqm" },
    ],
    ["vehicle", { kind: "vehicle", subtype: "car", make: "Toyota", model: "Corolla", year: 2024 }],
    [
      "loan",
      {
        kind: "loan",
        subtype: "personal",
        originalPrincipal: 100_000,
        annualInterestRate: 9.25,
      },
    ],
    ["other_asset", { kind: "other_asset", subtype: "collectible" }],
    ["other_liability", { kind: "other_liability", subtype: "medical" }],
  ] as const)("creates and retrieves a %s profile", async (type, details) => {
    const context = await createAuthenticatedContext();
    const created = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({ type, details }),
    );

    expect(created.type).toBe(type);
    expect(created.details).toEqual(expect.objectContaining(details));
    expect(created.classification).toBe(
      type === "loan" || type === "other_liability" ? "liability" : "asset",
    );
  });

  it("creates opening balances atomically with positive public liability debt", async () => {
    const context = await createAuthenticatedContext();
    const asset = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({ name: "Opening Cash", openingBalance: 25_000 }),
    );
    const liability = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: "Opening Loan",
        type: "loan",
        details: { kind: "loan", subtype: "personal" },
        openingBalance: 80_000,
        balanceAsOfDate: "2025-01-15",
      }),
    );

    expect(asset.balance).toBe(25_000);
    expect(liability.balance).toBe(80_000);

    const rows = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.householdId, context.household.id));
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          description: "Opening balance",
          includeInBudget: false,
        }),
      ]),
    );
  });

  it("updates profile fields and clears optional values without changing type or currency", async () => {
    const context = await createAuthenticatedContext();
    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        type: "vehicle",
        details: { kind: "vehicle", subtype: "car", make: "Toyota", model: "Corolla" },
      }),
    );

    const updated = await accountsService.updateAccount(context.householdContext, account.id, {
      details: { kind: "vehicle", subtype: "truck", make: null, model: "Tacoma" },
    });

    expect(updated.type).toBe("vehicle");
    expect(updated.currencyCode).toBe(account.currencyCode);
    expect(updated.details).toEqual(
      expect.objectContaining({
        kind: "vehicle",
        subtype: "truck",
        make: null,
        model: "Tacoma",
      }),
    );
  });

  it("rejects secured loan links to inaccessible or liability accounts", async () => {
    const context = await createAuthenticatedContext();
    const liability = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        type: "other_liability",
        details: { kind: "other_liability", subtype: "payable" },
      }),
    );

    await expect(
      accountsService.createAccount(
        context.householdContext,
        buildAccountInput({
          type: "loan",
          details: {
            kind: "loan",
            subtype: "mortgage",
            securedAssetAccountId: liability.id,
          },
        }),
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("enforces type classification combinations in PostgreSQL", async () => {
    const context = await createAuthenticatedContext();

    await expect(
      db.insert(accountsTable).values({
        householdId: context.household.id,
        name: "Invalid asset loan",
        classification: "asset",
        type: "loan",
        currencyId: "BRL",
      }),
    ).rejects.toThrow();
  });

  it("cascades profile deletion with the account", async () => {
    const context = await createAuthenticatedContext();
    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({ details: { kind: "cash", subtype: "checking" } }),
    );

    await accountsService.deleteAccount(context.householdContext, account.id);

    const rows = await db
      .select()
      .from(cashAccountProfilesTable)
      .where(eq(cashAccountProfilesTable.accountId, account.id));
    expect(rows).toHaveLength(0);
  });
});
