import { budgetsEndpoints, getEndpointRouterPath } from '@luraba/contracts';
import { Router } from 'express';
import { PERMISSIONS } from '@/config/permissions';
import { requireAccess } from '@/middleware/access.middleware';
import * as budgetsController from './budgets.controller';

const router = Router();

router.get(
  getEndpointRouterPath(budgetsEndpoints.getMonth),
  requireAccess({ permission: PERMISSIONS.BUDGETS_READ }),
  budgetsController.getMonth,
);
router.put(
  getEndpointRouterPath(budgetsEndpoints.replaceMonth),
  requireAccess({ permission: PERMISSIONS.BUDGETS_UPDATE }),
  budgetsController.replaceMonth,
);

export default router;
