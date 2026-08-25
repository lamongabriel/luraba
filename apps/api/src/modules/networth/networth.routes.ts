import { Router } from 'express';
import { requireAccess } from '@/middleware/access.middleware';
import * as controller from './networth.controller';

const router = Router();
router.get('/summary', requireAccess({ permission: 'accounts.read' }), controller.summary);
router.get('/history', requireAccess({ permission: 'accounts.read' }), controller.history);
router.get('/accounts', requireAccess({ permission: 'accounts.read' }), controller.accounts);
router.get('/cash-flow', requireAccess({ permission: 'transactions.read' }), controller.cashFlow);
router.get(
  '/spending-breakdown',
  requireAccess({ permission: 'transactions.read' }),
  controller.spendingBreakdown,
);
router.get(
  '/income-breakdown',
  requireAccess({ permission: 'transactions.read' }),
  controller.incomeBreakdown,
);
router.get(
  '/recent-activity',
  requireAccess({ permission: 'transactions.read' }),
  controller.recentActivity,
);
router.get(
  '/credit-cards',
  requireAccess({ permission: 'creditCards.read' }),
  controller.creditCards,
);
export default router;
