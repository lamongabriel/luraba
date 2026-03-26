import { Router } from 'express';
import * as currenciesController from './currencies.controller';

const router = Router();

router.get('/', currenciesController.list);

export default router;
