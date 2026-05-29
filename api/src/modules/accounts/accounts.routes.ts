import { Router } from 'express';
import { requireAccess } from '@/middleware/access.middleware';
import * as accountsController from './accounts.controller';

const router = Router();

router.get('/', requireAccess({ permission: 'accounts.read' }), accountsController.list);
router.get('/:id', requireAccess({ permission: 'accounts.read' }), accountsController.details);
router.post('/', requireAccess({ permission: 'accounts.create' }), accountsController.create);
router.patch('/:id', requireAccess({ permission: 'accounts.update' }), accountsController.update);
router.delete('/:id', requireAccess({ permission: 'accounts.delete' }), accountsController.deleteAccount);

export default router;
