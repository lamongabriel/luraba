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
router.delete(
  '/:id',
  requireAccess({ permission: 'creditCards.delete' }),
  creditCardsController.deleteCreditCard,
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
router.get(
  '/:id/purchases/:purchaseId',
  requireAccess({ permission: 'creditCards.read' }),
  creditCardsController.getPurchase,
);
router.patch(
  '/:id/purchases/:purchaseId',
  requireAccess({ permission: 'transactions.update' }),
  creditCardsController.updatePurchase,
);
router.delete(
  '/:id/purchases/:purchaseId',
  requireAccess({ permission: 'transactions.delete' }),
  creditCardsController.deletePurchase,
);
router.post(
  '/:id/payments',
  requireAccess({ permission: 'transactions.create' }),
  creditCardsController.createPayment,
);
router.get(
  '/:id/payments/:paymentId',
  requireAccess({ permission: 'creditCards.read' }),
  creditCardsController.getPayment,
);
router.patch(
  '/:id/payments/:paymentId',
  requireAccess({ permission: 'transactions.update' }),
  creditCardsController.updatePayment,
);
router.delete(
  '/:id/payments/:paymentId',
  requireAccess({ permission: 'transactions.delete' }),
  creditCardsController.deletePayment,
);
router.get(
  '/:id/forecast',
  requireAccess({ permission: 'creditCards.read' }),
  creditCardsController.getForecast,
);

export default router;
