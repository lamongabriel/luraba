import { Router } from 'express';
import { requireAccess } from '@/middleware/access.middleware';
import * as tagsController from './tags.controller';

const router = Router();

router.get('/', requireAccess({ permission: 'tags.read' }), tagsController.list);
router.post('/', requireAccess({ permission: 'tags.create' }), tagsController.create);
router.patch('/:id', requireAccess({ permission: 'tags.update' }), tagsController.update);
router.delete('/:id', requireAccess({ permission: 'tags.delete' }), tagsController.deleteTag);

export default router;
