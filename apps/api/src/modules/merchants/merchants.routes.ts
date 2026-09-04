import { getEndpointRouterPath, merchantsEndpoints } from '@luraba/contracts';
import { Router } from 'express';
import { PERMISSIONS } from '@/config/permissions';
import { requireAccess } from '@/middleware/access.middleware';
import * as merchantsController from './merchants.controller';

const router = Router();

router.get(
  getEndpointRouterPath(merchantsEndpoints.list),
  requireAccess({ permission: PERMISSIONS.MERCHANTS_READ }),
  merchantsController.list,
);
router.get(
  getEndpointRouterPath(merchantsEndpoints.get),
  requireAccess({ permission: PERMISSIONS.MERCHANTS_READ }),
  merchantsController.details,
);
router.post(
  getEndpointRouterPath(merchantsEndpoints.create),
  requireAccess({ permission: PERMISSIONS.MERCHANTS_CREATE }),
  merchantsController.create,
);
router.patch(
  getEndpointRouterPath(merchantsEndpoints.update),
  requireAccess({ permission: PERMISSIONS.MERCHANTS_UPDATE }),
  merchantsController.update,
);
router.delete(
  getEndpointRouterPath(merchantsEndpoints.delete),
  requireAccess({ permission: PERMISSIONS.MERCHANTS_DELETE }),
  merchantsController.deleteMerchant,
);

export default router;
