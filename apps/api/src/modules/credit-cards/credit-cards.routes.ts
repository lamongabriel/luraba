import { creditCardsEndpoints, getEndpointRouterPath } from '@luraba/contracts';
import { Router } from 'express';
import { PERMISSIONS } from '@/config/permissions';
import { requireAccess } from '@/middleware/access.middleware';
import * as creditCardsController from './credit-cards.controller';

const router = Router();

router.get(
  getEndpointRouterPath(creditCardsEndpoints.list),
  requireAccess({ permission: PERMISSIONS.CREDIT_CARDS_READ }),
  creditCardsController.list,
);
router.post(
  getEndpointRouterPath(creditCardsEndpoints.create),
  requireAccess({ permission: PERMISSIONS.CREDIT_CARDS_CREATE }),
  creditCardsController.create,
);
router.get(
  getEndpointRouterPath(creditCardsEndpoints.get),
  requireAccess({ permission: PERMISSIONS.CREDIT_CARDS_READ }),
  creditCardsController.getById,
);
router.patch(
  getEndpointRouterPath(creditCardsEndpoints.update),
  requireAccess({ permission: PERMISSIONS.CREDIT_CARDS_UPDATE }),
  creditCardsController.update,
);
router.delete(
  getEndpointRouterPath(creditCardsEndpoints.delete),
  requireAccess({ permission: PERMISSIONS.CREDIT_CARDS_DELETE }),
  creditCardsController.deleteCreditCard,
);
router.get(
  getEndpointRouterPath(creditCardsEndpoints.cycles),
  requireAccess({ permission: PERMISSIONS.CREDIT_CARDS_READ }),
  creditCardsController.listCycles,
);
router.get(
  getEndpointRouterPath(creditCardsEndpoints.getCycle),
  requireAccess({ permission: PERMISSIONS.CREDIT_CARDS_READ }),
  creditCardsController.getCycle,
);
router.patch(
  getEndpointRouterPath(creditCardsEndpoints.updateCycle),
  requireAccess({ permission: PERMISSIONS.CREDIT_CARDS_UPDATE }),
  creditCardsController.updateCycle,
);
router.post(
  getEndpointRouterPath(creditCardsEndpoints.createPurchase),
  requireAccess({ permission: PERMISSIONS.TRANSACTIONS_CREATE }),
  creditCardsController.createPurchase,
);
router.get(
  getEndpointRouterPath(creditCardsEndpoints.getPurchase),
  requireAccess({ permission: PERMISSIONS.CREDIT_CARDS_READ }),
  creditCardsController.getPurchase,
);
router.patch(
  getEndpointRouterPath(creditCardsEndpoints.updatePurchase),
  requireAccess({ permission: PERMISSIONS.TRANSACTIONS_UPDATE }),
  creditCardsController.updatePurchase,
);
router.delete(
  getEndpointRouterPath(creditCardsEndpoints.deletePurchase),
  requireAccess({ permission: PERMISSIONS.TRANSACTIONS_DELETE }),
  creditCardsController.deletePurchase,
);
router.post(
  getEndpointRouterPath(creditCardsEndpoints.createPayment),
  requireAccess({ permission: PERMISSIONS.TRANSACTIONS_CREATE }),
  creditCardsController.createPayment,
);
router.get(
  getEndpointRouterPath(creditCardsEndpoints.getPayment),
  requireAccess({ permission: PERMISSIONS.CREDIT_CARDS_READ }),
  creditCardsController.getPayment,
);
router.patch(
  getEndpointRouterPath(creditCardsEndpoints.updatePayment),
  requireAccess({ permission: PERMISSIONS.TRANSACTIONS_UPDATE }),
  creditCardsController.updatePayment,
);
router.delete(
  getEndpointRouterPath(creditCardsEndpoints.deletePayment),
  requireAccess({ permission: PERMISSIONS.TRANSACTIONS_DELETE }),
  creditCardsController.deletePayment,
);
router.get(
  getEndpointRouterPath(creditCardsEndpoints.forecast),
  requireAccess({ permission: PERMISSIONS.CREDIT_CARDS_READ }),
  creditCardsController.getForecast,
);

export default router;
