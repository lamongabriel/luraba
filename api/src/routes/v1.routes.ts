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

router.use('/auth', authRouter);
router.use('/currencies', currenciesRouter);
router.use('/households', householdsRouter);
router.use('/integrations', integrationsRouter);
router.use('/accounts', accountsRouter);
router.use('/budgets', budgetsRouter);
router.use('/categories', categoriesRouter);
router.use('/credit-cards', creditCardsRouter);
router.use('/merchants', merchantsRouter);
router.use('/networth', networthRouter);
router.use('/onboarding', onboardingRouter);
router.use('/payment-methods', paymentMethodsRouter);
router.use('/reference-data', referenceDataRouter);
router.use('/recurring-bills', recurringBillsRouter);
router.use('/tags', tagsRouter);
router.use('/transactions', transactionsRouter);

export default router;
