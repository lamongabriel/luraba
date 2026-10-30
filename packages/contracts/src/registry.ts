import { accountsEndpoints } from "./accounts/endpoints.js";
import type { EndpointContract } from "./api.js";
import { authEndpoints } from "./auth/endpoints.js";
import { billsEndpoints } from "./bills/endpoints.js";
import { budgetsEndpoints } from "./budgets/endpoints.js";
import { categoriesEndpoints } from "./categories/endpoints.js";
import { creditCardsEndpoints } from "./credit-cards/endpoints.js";
import { currenciesEndpoints } from "./currencies/endpoints.js";
import { exportsEndpoints } from "./exports/endpoints.js";
import { goalsEndpoints } from "./goals/endpoints.js";
import { healthEndpoints } from "./health/endpoints.js";
import { householdsEndpoints } from "./households/endpoints.js";
import { importsEndpoints } from "./imports/endpoints.js";
import { integrationsEndpoints } from "./integrations/endpoints.js";
import { merchantsEndpoints } from "./merchants/endpoints.js";
import { notificationsEndpoints } from "./notifications/endpoints.js";
import { onboardingEndpoints } from "./onboarding/endpoints.js";
import { paymentMethodsEndpoints } from "./payment-methods/endpoints.js";
import { productsEndpoints } from "./products/endpoints.js";
import { referenceDataEndpoints } from "./reference-data/endpoints.js";
import { splitsEndpoints } from "./splits/endpoints.js";
import { tagsEndpoints } from "./tags/endpoints.js";
import { transactionsEndpoints } from "./transactions/endpoints.js";
import { uploadsEndpoints } from "./uploads/endpoints.js";

type EndpointGroup = Readonly<Record<string, EndpointContract>>;

export const contractModules = {
  accounts: accountsEndpoints,
  auth: authEndpoints,
  bills: billsEndpoints,
  budgets: budgetsEndpoints,
  categories: categoriesEndpoints,
  currencies: currenciesEndpoints,
  creditCards: creditCardsEndpoints,
  exports: exportsEndpoints,
  goals: goalsEndpoints,
  health: healthEndpoints,
  households: householdsEndpoints,
  imports: importsEndpoints,
  integrations: integrationsEndpoints,
  merchants: merchantsEndpoints,
  products: productsEndpoints,
  notifications: notificationsEndpoints,
  onboarding: onboardingEndpoints,
  paymentMethods: paymentMethodsEndpoints,
  referenceData: referenceDataEndpoints,
  splits: splitsEndpoints,
  tags: tagsEndpoints,
  transactions: transactionsEndpoints,
  uploads: uploadsEndpoints,
} as const satisfies Readonly<Record<string, EndpointGroup>>;

export const allEndpoints = Object.values(contractModules).flatMap((endpoints) =>
  Object.values(endpoints),
);
