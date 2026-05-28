import { Router } from 'express';
import { requireAccess } from '@/middleware/access.middleware';
import * as integrationsController from './integrations.controller';
import * as brandfetchController from './brandfetch/brandfetch.controller';

const router = Router();

router.get('/', requireAccess({ permission: 'integrations.read' }), integrationsController.list);
router.put('/brandfetch', requireAccess({ permission: 'integrations.update' }), brandfetchController.update);
router.delete('/brandfetch', requireAccess({ permission: 'integrations.delete' }), brandfetchController.remove);

export default router;
