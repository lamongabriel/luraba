import {
  accountsEndpoints,
  authEndpoints,
  budgetsEndpoints,
  categoriesEndpoints,
  creditCardsEndpoints,
  currenciesEndpoints,
  getEndpointBasePath,
  householdsEndpoints,
  integrationsEndpoints,
  merchantsEndpoints,
  netWorthEndpoints,
  onboardingEndpoints,
  paymentMethodsEndpoints,
  recurringBillsEndpoints,
  referenceDataEndpoints,
  tagsEndpoints,
  transactionsEndpoints,
} from '@luraba/contracts';
import { Router } from 'express';

import accountsRouter from '@/modules/accounts/accounts.routes';
import authRouter from '@/modules/auth/auth.routes';
import budgetsRouter from '@/modules/budgets/budgets.routes';
import categoriesRouter from '@/modules/categories/categories.routes';
import creditCardsRouter from '@/modules/credit-cards/credit-cards.routes';
import currenciesRouter from '@/modules/currencies/currencies.routes';
import householdsRouter from '@/modules/households/households.routes';
import integrationsRouter from '@/modules/integrations/integrations.routes';
import merchantsRouter from '@/modules/merchants/merchants.routes';
import networthRouter from '@/modules/networth/networth.routes';
import onboardingRouter from '@/modules/onboarding/onboarding.routes';
import paymentMethodsRouter from '@/modules/payment-methods/payment-methods.routes';
import recurringBillsRouter from '@/modules/recurring-bills/recurring-bills.routes';
import referenceDataRouter from '@/modules/reference-data/reference-data.routes';
import tagsRouter from '@/modules/tags/tags.routes';
import transactionsRouter from '@/modules/transactions/transactions.routes';

const router = Router();

router.use(getEndpointBasePath(authEndpoints.me), authRouter);
router.use(getEndpointBasePath(currenciesEndpoints.list), currenciesRouter);
router.use(getEndpointBasePath(householdsEndpoints.list), householdsRouter);
router.use(getEndpointBasePath(integrationsEndpoints.list), integrationsRouter);
router.use(getEndpointBasePath(accountsEndpoints.list), accountsRouter);
router.use(getEndpointBasePath(budgetsEndpoints.getMonth), budgetsRouter);
router.use(getEndpointBasePath(categoriesEndpoints.list), categoriesRouter);
router.use(getEndpointBasePath(creditCardsEndpoints.list), creditCardsRouter);
router.use(getEndpointBasePath(merchantsEndpoints.list), merchantsRouter);
router.use(getEndpointBasePath(netWorthEndpoints.summary), networthRouter);
router.use(getEndpointBasePath(onboardingEndpoints.getOptions), onboardingRouter);
router.use(getEndpointBasePath(paymentMethodsEndpoints.list), paymentMethodsRouter);
router.use(getEndpointBasePath(referenceDataEndpoints.getLocations), referenceDataRouter);
router.use(getEndpointBasePath(recurringBillsEndpoints.list), recurringBillsRouter);
router.use(getEndpointBasePath(tagsEndpoints.list), tagsRouter);
router.use(getEndpointBasePath(transactionsEndpoints.list), transactionsRouter);

export default router;
