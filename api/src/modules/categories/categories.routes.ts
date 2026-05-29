import { Router } from 'express';
import { requireAccess } from '@/middleware/access.middleware';
import * as categoriesController from './categories.controller';

const router = Router();

router.get('/', requireAccess({ permission: 'categories.read' }), categoriesController.list);
router.post('/', requireAccess({ permission: 'categories.create' }), categoriesController.create);
router.patch('/:id', requireAccess({ permission: 'categories.update' }), categoriesController.update);
router.delete('/:id', requireAccess({ permission: 'categories.delete' }), categoriesController.deleteCategory);

export default router;
