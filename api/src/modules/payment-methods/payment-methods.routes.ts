import { Router } from 'express';
import { requireAccess } from '@/middleware/access.middleware';
import * as paymentMethodsController from './payment-methods.controller';

const router = Router();

router.get(
  '/',
  requireAccess({ permission: 'paymentMethods.read' }),
  paymentMethodsController.list,
);
router.post(
  '/',
  requireAccess({ permission: 'paymentMethods.create' }),
  paymentMethodsController.create,
);
router.patch(
  '/:id',
  requireAccess({ permission: 'paymentMethods.update' }),
  paymentMethodsController.update,
);
router.delete(
  '/:id',
  requireAccess({ permission: 'paymentMethods.delete' }),
  paymentMethodsController.deletePaymentMethod,
);

export default router;
