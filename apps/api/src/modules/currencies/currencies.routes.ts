import { currenciesEndpoints, getEndpointRouterPath } from '@luraba/contracts';
import { Router } from 'express';
import { requireAccess } from '@/middleware/access.middleware';
import * as currenciesController from './currencies.controller';

const router = Router();

router.use(requireAccess({ household: true }));

router.get(getEndpointRouterPath(currenciesEndpoints.rate), currenciesController.rate);
router.get(getEndpointRouterPath(currenciesEndpoints.list), currenciesController.list);

export default router;
