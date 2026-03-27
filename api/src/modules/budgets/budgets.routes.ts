import { Router } from 'express';
import * as budgetsController from './budgets.controller';

const router = Router();

router.get('/:month', budgetsController.getMonth);
router.put('/:month', budgetsController.replaceMonth);

export default router;
