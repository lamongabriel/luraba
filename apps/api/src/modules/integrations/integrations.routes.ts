import { getEndpointRouterPath, integrationsEndpoints } from '@luraba/contracts';
import { Router } from 'express';
import { PERMISSIONS } from '@/config/permissions';
import { requireAccess } from '@/middleware/access.middleware';
import * as brandfetchController from './brandfetch/brandfetch.controller';
import * as integrationsController from './integrations.controller';

const router = Router();

router.get(
  getEndpointRouterPath(integrationsEndpoints.list),
  requireAccess({ permission: PERMISSIONS.INTEGRATIONS_READ }),
  integrationsController.list,
);
router.put(
  getEndpointRouterPath(integrationsEndpoints.updateBrandfetch),
  requireAccess({ permission: PERMISSIONS.INTEGRATIONS_UPDATE }),
  brandfetchController.update,
);
router.delete(
  getEndpointRouterPath(integrationsEndpoints.deleteBrandfetch),
  requireAccess({ permission: PERMISSIONS.INTEGRATIONS_DELETE }),
  brandfetchController.remove,
);

export default router;
