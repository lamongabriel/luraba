import { Router } from 'express';
import { requireAccess } from '@/middleware/access.middleware';
import * as creditCardsController from './credit-cards.controller';

const router = Router();

router.get('/', requireAccess({ permission: 'creditCards.read' }), creditCardsController.list);
router.post('/', requireAccess({ permission: 'creditCards.create' }), creditCardsController.create);
router.get(
  '/:id',
  requireAccess({ permission: 'creditCards.read' }),
  creditCardsController.getById,
);
router.patch(
  '/:id',
  requireAccess({ permission: 'creditCards.update' }),
  creditCardsController.update,
);
router.get(
  '/:id/cycles',
  requireAccess({ permission: 'creditCards.read' }),
  creditCardsController.listCycles,
);
router.get(
  '/:id/cycles/:cycleId',
  requireAccess({ permission: 'creditCards.read' }),
  creditCardsController.getCycle,
);
router.patch(
  '/:id/cycles/:cycleId',
  requireAccess({ permission: 'creditCards.update' }),
  creditCardsController.updateCycle,
);
router.post(
  '/:id/purchases',
  requireAccess({ permission: 'transactions.create' }),
  creditCardsController.createPurchase,
);
router.post(
  '/:id/payments',
  requireAccess({ permission: 'transactions.create' }),
  creditCardsController.createPayment,
);
router.get(
  '/:id/forecast',
  requireAccess({ permission: 'creditCards.read' }),
  creditCardsController.getForecast,
);

export default router;
