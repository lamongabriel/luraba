import { getEndpointRouterPath, healthEndpoints } from '@luraba/contracts';
import { Router } from 'express';
import * as healthController from './health.controller';

const router = Router();

router.get(getEndpointRouterPath(healthEndpoints.get), healthController.get);

export default router;
