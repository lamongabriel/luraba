import { accountsEndpoints } from "./accounts/endpoints.js";
import type { EndpointContract } from "./api.js";
import { authEndpoints } from "./auth/endpoints.js";
import { budgetsEndpoints } from "./budgets/endpoints.js";
import { categoriesEndpoints } from "./categories/endpoints.js";
import { creditCardsEndpoints } from "./credit-cards/endpoints.js";
import { currenciesEndpoints } from "./currencies/endpoints.js";
import { healthEndpoints } from "./health/endpoints.js";
import { householdsEndpoints } from "./households/endpoints.js";
import { integrationsEndpoints } from "./integrations/endpoints.js";
import { merchantsEndpoints } from "./merchants/endpoints.js";
import { onboardingEndpoints } from "./onboarding/endpoints.js";
import { paymentMethodsEndpoints } from "./payment-methods/endpoints.js";
import { referenceDataEndpoints } from "./reference-data/endpoints.js";
import { tagsEndpoints } from "./tags/endpoints.js";
import { transactionsEndpoints } from "./transactions/endpoints.js";

type EndpointGroup = Readonly<Record<string, EndpointContract>>;

export const contractModules = {
  accounts: accountsEndpoints,
  auth: authEndpoints,
  budgets: budgetsEndpoints,
  categories: categoriesEndpoints,
  currencies: currenciesEndpoints,
  creditCards: creditCardsEndpoints,
  health: healthEndpoints,
  households: householdsEndpoints,
  integrations: integrationsEndpoints,
  merchants: merchantsEndpoints,
  onboarding: onboardingEndpoints,
  paymentMethods: paymentMethodsEndpoints,
  referenceData: referenceDataEndpoints,
  tags: tagsEndpoints,
  transactions: transactionsEndpoints,
} as const satisfies Readonly<Record<string, EndpointGroup>>;

export const allEndpoints = Object.values(contractModules).flatMap((endpoints) =>
  Object.values(endpoints),
);
