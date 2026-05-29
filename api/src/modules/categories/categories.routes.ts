import { Router } from 'express';
import { requireAccess } from '@/middleware/access.middleware';
import * as categoriesController from './categories.controller';

const router = Router();

router.get('/', requireAccess({ permission: 'categories.read' }), categoriesController.list);
router.post('/', requireAccess({ permission: 'categories.create' }), categoriesController.create);

export default router;
