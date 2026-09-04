import { getEndpointRouterPath, transactionsEndpoints } from '@luraba/contracts';
import { Router } from 'express';
import { PERMISSIONS } from '@/config/permissions';
import { requireAccess } from '@/middleware/access.middleware';
import * as transactionsController from './transactions.controller';

const router = Router();

router.get(
  getEndpointRouterPath(transactionsEndpoints.analytics),
  requireAccess({ permission: PERMISSIONS.TRANSACTIONS_READ }),
  transactionsController.analytics,
);
router.get(
  getEndpointRouterPath(transactionsEndpoints.upcoming),
  requireAccess({ permission: PERMISSIONS.TRANSACTIONS_READ }),
  transactionsController.upcoming,
);
router.get(
  getEndpointRouterPath(transactionsEndpoints.list),
  requireAccess({ permission: PERMISSIONS.TRANSACTIONS_READ }),
  transactionsController.list,
);
router.post(
  getEndpointRouterPath(transactionsEndpoints.create),
  requireAccess({ permission: PERMISSIONS.TRANSACTIONS_CREATE }),
  transactionsController.create,
);
router.patch(
  getEndpointRouterPath(transactionsEndpoints.update),
  requireAccess({ permission: PERMISSIONS.TRANSACTIONS_UPDATE }),
  transactionsController.update,
);
router.delete(
  getEndpointRouterPath(transactionsEndpoints.delete),
  requireAccess({ permission: PERMISSIONS.TRANSACTIONS_DELETE }),
  transactionsController.deleteTransaction,
);

export default router;
