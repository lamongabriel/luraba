import { Router } from 'express';
import { requireAccess } from '@/middleware/access.middleware';
import * as controller from './recurring-bills.controller';

const router = Router();
router.get('/', requireAccess({ permission: 'recurringBills.read' }), controller.list);
router.post('/', requireAccess({ permission: 'recurringBills.create' }), controller.create);
router.get(
  '/:id/occurrences',
  requireAccess({ permission: 'recurringBills.read' }),
  controller.occurrences,
);
router.post(
  '/:id/occurrences/:date/skip',
  requireAccess({ permission: 'recurringBills.update' }),
  controller.skip,
);
router.post(
  '/:id/occurrences/:date/reschedule',
  requireAccess({ permission: 'recurringBills.update' }),
  controller.reschedule,
);
router.post(
  '/:id/occurrences/:date/create',
  requireAccess({ permission: 'recurringBills.create' }),
  controller.createOccurrence,
);
router.get('/:id', requireAccess({ permission: 'recurringBills.read' }), controller.get);
router.patch('/:id', requireAccess({ permission: 'recurringBills.update' }), controller.update);
router.delete('/:id', requireAccess({ permission: 'recurringBills.delete' }), controller.remove);
export default router;
