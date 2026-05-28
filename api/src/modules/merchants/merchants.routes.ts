import { Router } from 'express';
import { requireAccess } from '@/middleware/access.middleware';
import * as merchantsController from './merchants.controller';

const router = Router();

router.get('/', requireAccess({ permission: 'merchants.read' }), merchantsController.list);
router.post('/', requireAccess({ permission: 'merchants.create' }), merchantsController.create);

export default router;
