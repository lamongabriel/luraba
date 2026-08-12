import { Router } from 'express';
import { requireAccess } from '@/middleware/access.middleware';
import * as transactionsController from './transactions.controller';

const router = Router();

router.get(
  '/analytics',
  requireAccess({ permission: 'transactions.read' }),
  transactionsController.analytics,
);
router.get(
  '/upcoming',
  requireAccess({ permission: 'transactions.read' }),
  transactionsController.upcoming,
);
router.get('/', requireAccess({ permission: 'transactions.read' }), transactionsController.list);
router.post(
  '/',
  requireAccess({ permission: 'transactions.create' }),
  transactionsController.create,
);
router.patch(
  '/:id',
  requireAccess({ permission: 'transactions.update' }),
  transactionsController.update,
);
router.delete(
  '/:id',
  requireAccess({ permission: 'transactions.delete' }),
  transactionsController.deleteTransaction,
);

export default router;
