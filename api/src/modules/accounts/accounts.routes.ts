import { Router } from 'express';
import * as accountsController from './accounts.controller';

const router = Router();

router.get('/', accountsController.list);
router.get('/:id/history', accountsController.history);
router.post('/', accountsController.create);

export default router;
