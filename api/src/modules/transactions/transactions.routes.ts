import { Router } from 'express';
import * as transactionsController from './transactions.controller';

const router = Router();

router.get('/', transactionsController.list);
router.post('/', transactionsController.create);

export default router;