import { describe, expect, it } from "vitest";
import {
  accountsEndpoints,
  allEndpoints,
  buildEndpointPath,
  contractModules,
  creditCardsEndpoints,
  getPermissionsForRole,
  hasHouseholdPermission,
  householdPermissionSchema,
  householdsEndpoints,
  PERMISSIONS,
  parseEndpointResponse,
  transactionsEndpoints,
} from "../index.js";

const EXPECTED_MODULE_COUNTS = {
  accounts: 6,
  auth: 4,
  bills: 15,
  budgets: 3,
  categories: 4,
  creditCards: 18,
  exports: 1,
  goals: 8,
  currencies: 2,
  health: 1,
  households: 22,
  imports: 11,
  integrations: 3,
  merchants: 5,
  notifications: 12,
  onboarding: 1,
  paymentMethods: 4,
  referenceData: 1,
  splits: 16,
  tags: 4,
  products: 5,
  transactions: 8,
  uploads: 10,
} as const;

const EXPECTED_ENDPOINTS = [
  "GET /accounts",
  "GET /accounts/:id/transactions",
  "GET /accounts/:id",
  "POST /accounts",
  "PATCH /accounts/:id",
  "DELETE /accounts/:id",
  "GET /auth/providers",
  "GET /auth/me",
  "GET /auth/me/preferences",
  "PATCH /auth/me/preferences",
  "GET /bills",
  "GET /bills/forecast",
  "GET /bills/:id",
  "POST /bills",
  "PATCH /bills/:id",
  "POST /bills/:id/pause",
  "POST /bills/:id/resume",
  "POST /bills/:id/cancel",
  "DELETE /bills/:id",
  "GET /bills/:id/occurrences",
  "PATCH /bills/:id/occurrences/:occurrenceId",
  "POST /bills/:id/occurrences/:occurrenceId/link",
  "POST /bills/:id/occurrences/:occurrenceId/paid",
  "POST /bills/:id/occurrences/:occurrenceId/skip",
  "POST /bills/:id/occurrences/:occurrenceId/reset",
  "GET /budgets/:month",
  "PUT /budgets/:month",
  "PUT /budgets/:month/settings",
  "GET /categories",
  "POST /categories",
  "PATCH /categories/:id",
  "DELETE /categories/:id",
  "GET /currencies",
  "GET /currencies/rate",
  "GET /credit-cards",
  "GET /credit-cards/overview",
  "POST /credit-cards",
  "GET /credit-cards/:id",
  "PATCH /credit-cards/:id",
  "DELETE /credit-cards/:id",
  "GET /credit-cards/:id/cycles",
  "GET /credit-cards/:id/cycles/:cycleId",
  "PATCH /credit-cards/:id/cycles/:cycleId",
  "POST /credit-cards/:id/purchases",
  "GET /credit-cards/:id/purchases/:purchaseId",
  "PATCH /credit-cards/:id/purchases/:purchaseId",
  "DELETE /credit-cards/:id/purchases/:purchaseId",
  "POST /credit-cards/:id/payments",
  "GET /credit-cards/:id/payments/:paymentId",
  "PATCH /credit-cards/:id/payments/:paymentId",
  "DELETE /credit-cards/:id/payments/:paymentId",
  "GET /credit-cards/:id/forecast",
  "GET /exports",
  "GET /goals",
  "GET /goals/:id",
  "POST /goals",
  "PATCH /goals/:id",
  "DELETE /goals/:id",
  "POST /goals/:id/contributions",
  "PATCH /goals/:id/contributions/:contributionId",
  "DELETE /goals/:id/contributions/:contributionId",
  "GET /health",
  "GET /households",
  "POST /households",
  "GET /households/roles",
  "GET /households/permissions",
  "GET /households/invite-statuses",
  "GET /households/invites/preview",
  "GET /households/invites",
  "POST /households/invites/accept",
  "POST /households/invites/reject",
  "POST /households/invites/:inviteId/accept",
  "POST /households/invites/:inviteId/reject",
  "GET /households/:id",
  "PATCH /households/:id",
  "DELETE /households/:id",
  "GET /households/:id/members",
  "PATCH /households/:id/members/:userId",
  "DELETE /households/:id/members/:userId",
  "GET /households/:id/invites",
  "POST /households/:id/invites",
  "POST /households/:id/invites/:inviteId/link",
  "POST /households/:id/invites/:inviteId/resend",
  "DELETE /households/:id/invites/:inviteId",
  "GET /imports/parsers",
  "GET /imports",
  "GET /imports/:id",
  "PATCH /imports/:id",
  "DELETE /imports/:id",
  "GET /imports/:id/rows",
  "PATCH /imports/:id/rows",
  "GET /imports/:id/groups",
  "PUT /imports/:id/mappings",
  "POST /imports/:id/start",
  "GET /imports/:id/reconciliation",
  "GET /integrations",
  "PUT /integrations/brandfetch",
  "DELETE /integrations/brandfetch",
  "GET /merchants",
  "GET /merchants/:id",
  "POST /merchants",
  "PATCH /merchants/:id",
  "DELETE /merchants/:id",
  "GET /products",
  "GET /products/:id",
  "POST /products",
  "PATCH /products/:id",
  "DELETE /products/:id",
  "GET /notifications",
  "GET /notifications/unread-count",
  "POST /notifications/:id/read",
  "POST /notifications/read-all",
  "DELETE /notifications/:id",
  "GET /notifications/channels",
  "PATCH /notifications/contact",
  "GET /notifications/preferences",
  "PATCH /notifications/preferences",
  "POST /notifications/push-subscriptions",
  "POST /notifications/push-subscriptions/remove",
  "POST /notifications/test",
  "GET /onboarding/options",
  "GET /payment-methods",
  "POST /payment-methods",
  "PATCH /payment-methods/:id",
  "DELETE /payment-methods/:id",
  "GET /reference-data/locations",
  "GET /splits",
  "GET /splits/:id",
  "POST /splits",
  "PATCH /splits/:id",
  "DELETE /splits/:id",
  "POST /splits/:id/participants",
  "PATCH /splits/:id/participants/:participantId",
  "DELETE /splits/:id/participants/:participantId",
  "POST /splits/:id/participants/:participantId/installments",
  "PATCH /splits/:id/installments/:installmentId",
  "DELETE /splits/:id/installments/:installmentId",
  "POST /splits/:id/installments/:installmentId/link",
  "POST /splits/:id/installments/:installmentId/received",
  "POST /splits/:id/installments/:installmentId/skip",
  "POST /splits/:id/installments/:installmentId/write-off",
  "POST /splits/:id/installments/:installmentId/reset",
  "GET /tags",
  "POST /tags",
  "PATCH /tags/:id",
  "DELETE /tags/:id",
  "GET /transactions/analytics",
  "GET /transactions/upcoming",
  "GET /transactions",
  "POST /transactions",
  "PATCH /transactions/:id",
  "GET /transactions/:id/items",
  "PUT /transactions/:id/items",
  "DELETE /transactions/:id",
  "GET /uploads/config",
  "GET /uploads/usage",
  "GET /uploads",
  "POST /uploads",
  "POST /uploads/cleanup",
  "GET /uploads/:id",
  "DELETE /uploads/:id",
  "GET /attachments",
  "POST /attachments",
  "DELETE /attachments/:id",
] as const;

describe("HTTP contract inventory", () => {
  it("contains the complete 164-route inventory by module", () => {
    expect(
      Object.fromEntries(
        Object.entries(contractModules).map(([module, endpoints]) => [
          module,
          Object.keys(endpoints).length,
        ]),
      ),
    ).toEqual(EXPECTED_MODULE_COUNTS);
    expect(allEndpoints).toHaveLength(164);
    expect(allEndpoints.map(({ method, path }) => `${method.toUpperCase()} ${path}`)).toEqual(
      EXPECTED_ENDPOINTS,
    );
  });

  it("has unique method/path pairs and complete endpoint schemas", () => {
    const identities = allEndpoints.map(({ method, path }) => `${method.toUpperCase()} ${path}`);

    expect(new Set(identities).size).toBe(164);

    for (const endpoint of allEndpoints) {
      expect(endpoint.path).toMatch(/^\/[a-z][a-z0-9/-]*(?::[A-Za-z][A-Za-z0-9_]*)?/);
      expect([200, 201, 204]).toContain(endpoint.status);

      if (endpoint.status === 204) expect(endpoint.response).toBeUndefined();
      else expect(endpoint.response).toBeDefined();

      const placeholders = [...endpoint.path.matchAll(/:([A-Za-z][A-Za-z0-9_]*)/g)].map(
        ([, name]) => name,
      );
      expect(Boolean(endpoint.params)).toBe(placeholders.length > 0);
    }
  });
});

describe("representative module contracts", () => {
  it("derives the permission schema from the canonical permission map", () => {
    expect(householdPermissionSchema.options).toEqual(Object.values(PERMISSIONS));
  });

  it("shares the role policy for API enforcement and client capability checks", () => {
    expect(getPermissionsForRole("owner")).toEqual(Object.values(PERMISSIONS));
    expect(hasHouseholdPermission("viewer", PERMISSIONS.ACCOUNTS_CREATE)).toBe(false);
    expect(hasHouseholdPermission("member", PERMISSIONS.ACCOUNTS_CREATE)).toBe(true);
  });

  it("coerces account list query defaults", () => {
    expect(accountsEndpoints.list.query.parse({ page: "2", perPage: "25" })).toMatchObject({
      page: 2,
      perPage: 25,
    });
  });

  it("validates transaction discriminated inputs", () => {
    expect(
      transactionsEndpoints.create.body.safeParse({
        type: "expense",
        accountId: crypto.randomUUID(),
        amount: 1440,
        currencyCode: "BRL",
        description: "Groceries",
        paymentMethodCode: "pix",
        postedDate: "2026-08-26",
        purchaseDate: "2026-08-26",
      }).success,
    ).toBe(true);
    expect(
      transactionsEndpoints.create.body.safeParse({
        type: "transfer",
        description: "Transfer",
        fromAccountId: crypto.randomUUID(),
        postedDate: "2026-08-26",
        purchaseDate: "2026-08-26",
        toAccountId: crypto.randomUUID(),
      }).success,
    ).toBe(false);
  });

  it("builds validated parameterized paths", () => {
    const id = crypto.randomUUID();
    expect(buildEndpointPath(creditCardsEndpoints.get, { id })).toBe(`/credit-cards/${id}`);
    expect(() => buildEndpointPath(creditCardsEndpoints.get)).toThrow(
      "Missing endpoint path parameter: id",
    );
    expect(buildEndpointPath({ path: "/things/:id" }, { id: "a/b" })).toBe("/things/a%2Fb");
    expect(() => buildEndpointPath(creditCardsEndpoints.get, { id, extra: "value" })).toThrow(
      "Unexpected endpoint path parameter: extra",
    );
  });

  it("keeps stored and computed invitation statuses distinct", () => {
    const storedStatus = householdsEndpoints.invites.response.element.shape.status;
    const previewStatus = householdsEndpoints.previewInvite.response.shape.status;

    expect(storedStatus.safeParse("expired").success).toBe(false);
    expect(previewStatus.safeParse("expired").success).toBe(true);
  });

  it("parses no-content operations as undefined", () => {
    expect(parseEndpointResponse(accountsEndpoints.delete, { ignored: true })).toBeUndefined();
  });
});
