import { getEndpointRouterPath, paymentMethodsEndpoints } from '@luraba/contracts';
import { Router } from 'express';
import { PERMISSIONS } from '@/config/permissions';
import { requireAccess } from '@/middleware/access.middleware';
import * as paymentMethodsController from './payment-methods.controller';

const router = Router();

router.get(
  getEndpointRouterPath(paymentMethodsEndpoints.list),
  requireAccess({ permission: PERMISSIONS.PAYMENT_METHODS_READ }),
  paymentMethodsController.list,
);
router.post(
  getEndpointRouterPath(paymentMethodsEndpoints.create),
  requireAccess({ permission: PERMISSIONS.PAYMENT_METHODS_CREATE }),
  paymentMethodsController.create,
);
router.patch(
  getEndpointRouterPath(paymentMethodsEndpoints.update),
  requireAccess({ permission: PERMISSIONS.PAYMENT_METHODS_UPDATE }),
  paymentMethodsController.update,
);
router.delete(
  getEndpointRouterPath(paymentMethodsEndpoints.delete),
  requireAccess({ permission: PERMISSIONS.PAYMENT_METHODS_DELETE }),
  paymentMethodsController.deletePaymentMethod,
);

export default router;
