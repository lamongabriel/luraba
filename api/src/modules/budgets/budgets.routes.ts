import { Router } from 'express';
import { requireAccess } from '@/middleware/access.middleware';
import * as budgetsController from './budgets.controller';

const router = Router();

router.get('/:month', requireAccess({ permission: 'budgets.read' }), budgetsController.getMonth);
router.put(
  '/:month',
  requireAccess({ permission: 'budgets.update' }),
  budgetsController.replaceMonth,
);

export default router;
