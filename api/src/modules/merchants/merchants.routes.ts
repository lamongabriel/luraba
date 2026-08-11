import { Router } from 'express';
import { requireAccess } from '@/middleware/access.middleware';
import * as merchantsController from './merchants.controller';

const router = Router();

router.get('/', requireAccess({ permission: 'merchants.read' }), merchantsController.list);
router.get('/:id', requireAccess({ permission: 'merchants.read' }), merchantsController.details);
router.post('/', requireAccess({ permission: 'merchants.create' }), merchantsController.create);
router.patch('/:id', requireAccess({ permission: 'merchants.update' }), merchantsController.update);
router.delete(
  '/:id',
  requireAccess({ permission: 'merchants.delete' }),
  merchantsController.deleteMerchant,
);

export default router;
