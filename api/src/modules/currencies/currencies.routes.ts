import { Router } from 'express';
import { requireAccess } from '@/middleware/access.middleware';
import * as currenciesController from './currencies.controller';

const router = Router();

router.use(requireAccess({ household: true }));

router.get('/rate', currenciesController.rate);
router.get('/', currenciesController.list);

export default router;
