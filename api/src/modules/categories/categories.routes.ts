import { Router } from 'express';
import * as categoriesController from './categories.controller';

const router = Router();

router.get('/', categoriesController.list);
router.post('/', categoriesController.create);

export default router;
