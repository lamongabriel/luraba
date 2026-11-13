import {
  accountsEndpoints,
  apiKeysEndpoints,
  authEndpoints,
  billsEndpoints,
  budgetsEndpoints,
  categoriesEndpoints,
  creditCardsEndpoints,
  currenciesEndpoints,
  exportsEndpoints,
  fxEndpoints,
  getEndpointBasePath,
  goalsEndpoints,
  householdsEndpoints,
  importsEndpoints,
  integrationsEndpoints,
  investmentsEndpoints,
  mcpEndpoints,
  merchantsEndpoints,
  monthlyPlansEndpoints,
  notificationsEndpoints,
  onboardingEndpoints,
  paymentMethodsEndpoints,
  productsEndpoints,
  referenceDataEndpoints,
  splitsEndpoints,
  tagsEndpoints,
  transactionsEndpoints,
  uploadsEndpoints,
} from "@luraba/contracts";
import { Router } from "express";

import accountsRouter from "@/modules/accounts/accounts.routes";
import apiKeysRouter from "@/modules/api-keys/api-keys.routes";
import authRouter from "@/modules/auth/auth.routes";
import billsRouter from "@/modules/bills/bills.routes";
import budgetsRouter from "@/modules/budgets/budgets.routes";
import categoriesRouter from "@/modules/categories/categories.routes";
import creditCardsRouter from "@/modules/credit-cards/credit-cards.routes";
import currenciesRouter from "@/modules/currencies/currencies.routes";
import exportsRouter from "@/modules/exports/exports.routes";
import fxRouter from "@/modules/fx/fx.routes";
import goalsRouter from "@/modules/goals/goals.routes";
import householdsRouter from "@/modules/households/households.routes";
import importsRouter from "@/modules/imports/imports.routes";
import integrationsRouter from "@/modules/integrations/integrations.routes";
import investmentsRouter from "@/modules/investments/investments.routes";
import mcpRouter from "@/modules/mcp/mcp.routes";
import merchantsRouter from "@/modules/merchants/merchants.routes";
import monthlyPlansRouter from "@/modules/monthly-plans/monthly-plans.routes";
import notificationsRouter from "@/modules/notifications/notifications.routes";
import onboardingRouter from "@/modules/onboarding/onboarding.routes";
import paymentMethodsRouter from "@/modules/payment-methods/payment-methods.routes";
import productsRouter from "@/modules/products/products.routes";
import referenceDataRouter from "@/modules/reference-data/reference-data.routes";
import splitsRouter from "@/modules/splits/splits.routes";
import tagsRouter from "@/modules/tags/tags.routes";
import transactionsRouter from "@/modules/transactions/transactions.routes";
import uploadsRouter, { attachmentsRouter } from "@/modules/uploads/uploads.routes";

const router = Router();

router.use(getEndpointBasePath(authEndpoints.me), authRouter);
router.use(getEndpointBasePath(apiKeysEndpoints.list), apiKeysRouter);
router.use(getEndpointBasePath(mcpEndpoints.info), mcpRouter);
router.use(getEndpointBasePath(currenciesEndpoints.list), currenciesRouter);
router.use(getEndpointBasePath(fxEndpoints.rates), fxRouter);
router.use(getEndpointBasePath(householdsEndpoints.list), householdsRouter);
router.use(getEndpointBasePath(integrationsEndpoints.list), integrationsRouter);
router.use(getEndpointBasePath(accountsEndpoints.list), accountsRouter);
router.use(getEndpointBasePath(billsEndpoints.list), billsRouter);
router.use(getEndpointBasePath(splitsEndpoints.list), splitsRouter);
router.use(getEndpointBasePath(goalsEndpoints.list), goalsRouter);
router.use(getEndpointBasePath(monthlyPlansEndpoints.report), monthlyPlansRouter);
router.use(getEndpointBasePath(importsEndpoints.list), importsRouter);
router.use(getEndpointBasePath(exportsEndpoints.list), exportsRouter);
router.use(getEndpointBasePath(budgetsEndpoints.getMonth), budgetsRouter);
router.use(getEndpointBasePath(investmentsEndpoints.getSettings), investmentsRouter);
router.use(getEndpointBasePath(categoriesEndpoints.list), categoriesRouter);
router.use(getEndpointBasePath(creditCardsEndpoints.list), creditCardsRouter);
router.use(getEndpointBasePath(merchantsEndpoints.list), merchantsRouter);
router.use(getEndpointBasePath(productsEndpoints.list), productsRouter);
router.use(getEndpointBasePath(notificationsEndpoints.list), notificationsRouter);
router.use(getEndpointBasePath(onboardingEndpoints.getOptions), onboardingRouter);
router.use(getEndpointBasePath(paymentMethodsEndpoints.list), paymentMethodsRouter);
router.use(getEndpointBasePath(referenceDataEndpoints.getLocations), referenceDataRouter);
router.use(getEndpointBasePath(tagsEndpoints.list), tagsRouter);
router.use(getEndpointBasePath(transactionsEndpoints.list), transactionsRouter);
router.use(getEndpointBasePath(uploadsEndpoints.list), uploadsRouter);
router.use(getEndpointBasePath(uploadsEndpoints.listAttachments), attachmentsRouter);

export default router;
