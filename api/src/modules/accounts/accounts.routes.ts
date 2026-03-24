import { Router } from 'express';
import * as accountsController from './accounts.controller';

const router = Router();

router.get('/', accountsController.list);
router.post('/', accountsController.create);

export default router;