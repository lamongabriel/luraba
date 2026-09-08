import { getPermissionsForRole } from "@luraba/contracts";
import { addDays, formatISODate, getTodayInTimezone, parseISODate } from "@luraba/domain";
import { hashPassword } from "better-auth/crypto";
import { eq, inArray } from "drizzle-orm";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import { authAccountsTable } from "@/db/schemas/auth-accounts.schema";
import { budgetsTable } from "@/db/schemas/budgets.schema";
import { creditCardBudgetRecognitionsTable } from "@/db/schemas/credit-card-budget-recognitions.schema";
import { creditCardPurchasesTable } from "@/db/schemas/credit-card-purchases.schema";
import { creditCardsTable } from "@/db/schemas/credit-cards.schema";
import { householdsTable } from "@/db/schemas/households.schema";
import { usersTable } from "@/db/schemas/users.schema";
import * as accountsService from "@/modules/accounts/accounts.service";
import * as categoriesService from "@/modules/categories/categories.service";
import * as creditCardsService from "@/modules/credit-cards/credit-cards.service";
import * as householdsService from "@/modules/households/households.service";
import * as merchantsService from "@/modules/merchants/merchants.service";
import * as tagsService from "@/modules/tags/tags.service";
import * as transactionsService from "@/modules/transactions/transactions.service";
import { logger } from "@/shared/logger";

const DEFAULT_EMAIL = "demo@luraba.local";
const DEFAULT_PASSWORD = "demo1234!";
const DEMO_HOUSEHOLD_NAME = "Luraba Demo Household";

const demoEmail = (process.env.MOCK_SEED_EMAIL ?? DEFAULT_EMAIL).trim().toLowerCase();
const demoPassword = process.env.MOCK_SEED_PASSWORD ?? DEFAULT_PASSWORD;

function dateFromToday(offset: number): Date {
  const today = getTodayInTimezone("UTC");
  return parseISODate(formatISODate(addDays(today, offset)));
}

async function removeExistingDemo(): Promise<void> {
  const existingUser = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, demoEmail))
    .limit(1);

  const user = existingUser[0];
  if (!user) return;

  await db.transaction(async (tx) => {
    const households = await tx
      .select({ id: householdsTable.id })
      .from(householdsTable)
      .where(eq(householdsTable.createdByUserId, user.id));
    const householdIds = households.map((household) => household.id);

    if (householdIds.length > 0) {
      const purchaseIds = tx
        .select({ id: creditCardPurchasesTable.id })
        .from(creditCardPurchasesTable)
        .innerJoin(creditCardsTable, eq(creditCardsTable.id, creditCardPurchasesTable.creditCardId))
        .where(inArray(creditCardsTable.householdId, householdIds));

      await tx
        .delete(creditCardBudgetRecognitionsTable)
        .where(inArray(creditCardBudgetRecognitionsTable.purchaseId, purchaseIds));
      await tx.delete(budgetsTable).where(inArray(budgetsTable.householdId, householdIds));
      await tx.delete(householdsTable).where(inArray(householdsTable.id, householdIds));
    }

    await tx.delete(usersTable).where(eq(usersTable.id, user.id));
  });
}

async function createDemoUser() {
  const password = await hashPassword(demoPassword);
  const [user] = await db
    .insert(usersTable)
    .values({
      name: "Gabriel Demo",
      email: demoEmail,
      emailVerified: true,
      preferredCurrency: "USD",
      preferredLanguage: "en",
      preferredTimezone: "UTC",
      preferredDateFormat: "MM/DD/YYYY",
      preferredPeriod: "current_month",
      preferredTheme: "light",
    })
    .returning();

  await db.insert(authAccountsTable).values({
    accountId: user.id,
    providerId: "credential",
    userId: user.id,
    password,
  });

  return user;
}

function buildContext(householdId: string, userId: string): HouseholdContext {
  return {
    householdId,
    userId,
    role: "owner",
    permissions: getPermissionsForRole("owner"),
    timezone: "UTC",
    creditExpenseTiming: "spend_month",
    creditInstallmentBudgetMode: "per_installment",
  };
}

export async function seedMock(): Promise<void> {
  await removeExistingDemo();

  const user = await createDemoUser();
  const household = await householdsService.createHousehold(user.id, {
    name: DEMO_HOUSEHOLD_NAME,
    description: "A complete local fixture for exploring Luraba.",
    defaultCurrencyId: "USD",
    countryCode: "US",
    timezone: "UTC",
    budgetMonthStartsOn: 1,
    creditExpenseTiming: "spend_month",
    creditInstallmentBudgetMode: "per_installment",
  });
  const context = buildContext(household.id, user.id);

  const checking = await accountsService.createAccount(context, {
    name: "Main Checking",
    type: "cash",
    details: { kind: "cash", subtype: "checking" },
    currencyCode: "USD",
    openingBalance: 485000,
  });
  const savings = await accountsService.createAccount(context, {
    name: "Emergency Savings",
    type: "cash",
    details: { kind: "cash", subtype: "savings" },
    currencyCode: "USD",
    openingBalance: 1820000,
  });
  const travel = await accountsService.createAccount(context, {
    name: "Travel Wallet",
    type: "cash",
    details: { kind: "cash", subtype: "other" },
    currencyCode: "EUR",
    openingBalance: 245000,
  });
  const investment = await accountsService.createAccount(context, {
    name: "Long-term Brokerage",
    type: "investment",
    details: { kind: "investment", subtype: "brokerage" },
    currencyCode: "USD",
    openingBalance: 735000,
  });
  await accountsService.createAccount(context, {
    name: "Cold Storage Wallet",
    type: "crypto",
    details: {
      kind: "crypto",
      subtype: "wallet",
      walletAddress: "0xDemoWalletAddress",
      network: "Ethereum",
    },
    currencyCode: "EUR",
    openingBalance: 420000,
  });
  await accountsService.createAccount(context, {
    name: "Apartment",
    type: "property",
    details: {
      kind: "property",
      subtype: "apartment",
      addressLine1: "100 Market Street",
      city: "Austin",
      region: "TX",
      postalCode: "78701",
      countryCode: "US",
      area: 82,
      areaUnit: "sqm",
      yearBuilt: 2018,
    },
    currencyCode: "USD",
    openingBalance: 62000000,
  });
  await accountsService.createAccount(context, {
    name: "Daily Driver",
    type: "vehicle",
    details: {
      kind: "vehicle",
      subtype: "car",
      make: "Toyota",
      model: "Corolla",
      year: 2022,
      trim: "Limited",
      vin: "DEMO1234567890",
      licensePlate: "LUR-2026",
      mileage: 24500,
      mileageUnit: "mi",
    },
    currencyCode: "USD",
    openingBalance: 11800000,
  });
  await accountsService.createAccount(context, {
    name: "Home Mortgage",
    type: "loan",
    details: {
      kind: "loan",
      subtype: "mortgage",
      originalPrincipal: 32000000,
      annualInterestRate: 9.75,
      interestRateType: "fixed",
      termMonths: 240,
      startDate: "2024-01-01",
      maturityDate: "2044-01-01",
      paymentAmount: 285000,
      paymentFrequency: "monthly",
    },
    currencyCode: "USD",
    openingBalance: 27800000,
  });
  await accountsService.createAccount(context, {
    name: "Tax Reserve",
    type: "other_liability",
    details: { kind: "other_liability", subtype: "tax" },
    currencyCode: "USD",
    openingBalance: 95000,
  });

  const card = await creditCardsService.createCreditCard(context, {
    name: "Northstar Rewards",
    ownerAccountId: checking.id,
    institutionName: "Northstar Bank",
    institutionDomain: "northstar.example.com",
    brand: "Mastercard",
    productType: "credit",
    last4: "4242",
    color: "#111827",
    closingDay: 10,
    dueDay: 17,
    creditLimitAmount: 1500000,
  });

  const [groceries, housing, transport, subscriptions, shopping, salary, freelance] =
    await Promise.all([
      categoriesService.createCategory(context, {
        name: "Groceries",
        type: "expense",
        color: "#16A34A",
        icon: "ShoppingBag02Icon",
      }),
      categoriesService.createCategory(context, {
        name: "Housing",
        type: "expense",
        color: "#2563EB",
        icon: "Home01Icon",
      }),
      categoriesService.createCategory(context, {
        name: "Transport",
        type: "expense",
        color: "#EA580C",
        icon: "Car01Icon",
      }),
      categoriesService.createCategory(context, {
        name: "Subscriptions",
        type: "expense",
        color: "#7C3AED",
        icon: "PlayCircle02Icon",
      }),
      categoriesService.createCategory(context, {
        name: "Shopping",
        type: "expense",
        color: "#DB2777",
        icon: "ShoppingCart01Icon",
      }),
      categoriesService.createCategory(context, {
        name: "Salary",
        type: "income",
        color: "#059669",
        icon: "MoneyReceive01Icon",
      }),
      categoriesService.createCategory(context, {
        name: "Freelance",
        type: "income",
        color: "#0891B2",
        icon: "Laptop01Icon",
      }),
    ]);

  const [monthly, family, travelTag, reimbursable] = await Promise.all([
    tagsService.createTag(context, {
      name: "Monthly",
      color: "#2563EB",
      icon: "Calendar03Icon",
    }),
    tagsService.createTag(context, {
      name: "Family",
      color: "#DB2777",
      icon: "UserGroup03Icon",
    }),
    tagsService.createTag(context, {
      name: "Travel",
      color: "#EA580C",
      icon: "Airplane01Icon",
    }),
    tagsService.createTag(context, {
      name: "Reimbursable",
      color: "#059669",
      icon: "ReceiptMoney01Icon",
    }),
  ]);

  const [supermarket, fuel, streaming, employer] = await Promise.all([
    merchantsService.createMerchant(context, {
      name: "Cedar Market",
      domain: "cedarmarket.example.com",
    }),
    merchantsService.createMerchant(context, {
      name: "Metro Fuel",
      domain: "metrofuel.example.com",
    }),
    merchantsService.createMerchant(context, {
      name: "Streambox",
      domain: "streambox.example.com",
    }),
    merchantsService.createMerchant(context, {
      name: "Luraba Studio",
      domain: "luraba.example.com",
    }),
  ]);

  const expenseTemplates = [
    {
      description: "Weekly groceries",
      amount: 7800,
      categoryId: groceries.id,
      merchantId: supermarket.id,
      paymentMethodCode: "debit_card",
      tagIds: [monthly.id],
    },
    {
      description: "Apartment utilities",
      amount: 14200,
      categoryId: housing.id,
      merchantId: undefined,
      paymentMethodCode: "wire",
      tagIds: [monthly.id],
    },
    {
      description: "Fuel stop",
      amount: 23500,
      categoryId: transport.id,
      merchantId: fuel.id,
      paymentMethodCode: "debit_card",
      tagIds: [],
    },
    {
      description: "Streaming subscription",
      amount: 4990,
      categoryId: subscriptions.id,
      merchantId: streaming.id,
      paymentMethodCode: "debit_card",
      tagIds: [monthly.id],
    },
    {
      description: "Uncategorized purchase",
      amount: 3600,
      categoryId: undefined,
      merchantId: undefined,
      paymentMethodCode: "cash",
      tagIds: [family.id],
    },
  ] as const;

  for (let index = 0; index < 42; index += 1) {
    const template = expenseTemplates[index % expenseTemplates.length];
    const postedDate = dateFromToday(-(index * 2 + 1));

    await transactionsService.createTransaction(context, {
      type: "expense",
      description: `${template.description} ${index + 1}`,
      amount: template.amount + (index % 4) * 425,
      categoryId: template.categoryId,
      merchantId: template.merchantId,
      purchaseDate: postedDate,
      postedDate,
      includeInBudget: index % 11 !== 0,
      tagIds: [...template.tagIds],
      currencyCode: "USD",
      accountId: checking.id,
      paymentMethodCode: template.paymentMethodCode,
    });
  }

  for (let index = 0; index < 8; index += 1) {
    const postedDate = dateFromToday(-(index * 7 + 3));
    await transactionsService.createTransaction(context, {
      type: "income",
      description:
        index % 2 === 0 ? `Salary payment ${index + 1}` : `Freelance payment ${index + 1}`,
      amount: index % 2 === 0 ? 325000 : 87500,
      categoryId: index % 2 === 0 ? salary.id : freelance.id,
      merchantId: index % 2 === 0 ? employer.id : undefined,
      purchaseDate: postedDate,
      postedDate,
      includeInBudget: true,
      tagIds: [index % 2 === 0 ? monthly.id : reimbursable.id],
      currencyCode: "USD",
      accountId: checking.id,
      paymentMethodCode: "wire",
    });
  }

  const transfers: Array<{
    fromAccountId: string;
    toAccountId: string;
    fromAmount: number;
    toAmount: number;
    daysAgo: number;
    description: string;
  }> = [
    {
      fromAccountId: checking.id,
      toAccountId: savings.id,
      fromAmount: 150000,
      toAmount: 150000,
      daysAgo: 4,
      description: "Monthly savings transfer",
    },
    {
      fromAccountId: savings.id,
      toAccountId: investment.id,
      fromAmount: 95000,
      toAmount: 95000,
      daysAgo: 18,
      description: "Investment contribution",
    },
    {
      fromAccountId: travel.id,
      toAccountId: checking.id,
      fromAmount: 50000,
      toAmount: 270000,
      daysAgo: 31,
      description: "Travel funds conversion",
    },
  ];

  for (const transfer of transfers) {
    const postedDate = dateFromToday(-transfer.daysAgo);
    await transactionsService.createTransaction(context, {
      type: "transfer",
      description: transfer.description,
      fromAccountId: transfer.fromAccountId,
      toAccountId: transfer.toAccountId,
      fromAmount: transfer.fromAmount,
      toAmount: transfer.toAmount,
      purchaseDate: postedDate,
      postedDate,
      includeInBudget: false,
      tagIds: [monthly.id],
    });
  }

  await creditCardsService.createPurchase(context, card.id, {
    description: "Laptop - 6 installments",
    amount: 240000,
    categoryId: shopping.id,
    merchantId: supermarket.id,
    purchaseDate: dateFromToday(-12),
    postedDate: dateFromToday(-12),
    installmentCount: 6,
    tagIds: [reimbursable.id],
    includeInBudget: true,
  });
  await creditCardsService.createPurchase(context, card.id, {
    description: "Monthly streaming plan",
    amount: 4990,
    categoryId: subscriptions.id,
    merchantId: streaming.id,
    purchaseDate: dateFromToday(-20),
    postedDate: dateFromToday(-20),
    installmentCount: 1,
    tagIds: [monthly.id],
    includeInBudget: true,
  });
  await creditCardsService.createPurchase(context, card.id, {
    description: "Flight tickets - 3 installments",
    amount: 180000,
    categoryId: transport.id,
    merchantId: undefined,
    purchaseDate: dateFromToday(-46),
    postedDate: dateFromToday(-46),
    installmentCount: 3,
    tagIds: [travelTag.id, reimbursable.id],
    includeInBudget: true,
  });

  await creditCardsService.createPayment(context, card.id, {
    description: "Credit card payment",
    amount: 125000,
    fromAccountId: checking.id,
    paymentDate: dateFromToday(-6),
    postedDate: dateFromToday(-6),
  });
  await creditCardsService.createPayment(context, card.id, {
    description: "Previous card payment",
    amount: 80000,
    fromAccountId: checking.id,
    paymentDate: dateFromToday(-34),
    postedDate: dateFromToday(-34),
  });

  logger.info(
    {
      email: demoEmail,
      household: household.name,
      password: demoPassword,
    },
    "Mock database seeded. Use these credentials to sign in locally.",
  );
}
