import { categoriesEndpoints, getEndpointRouterPath } from '@luraba/contracts';
import { Router } from 'express';
import { PERMISSIONS } from '@/config/permissions';
import { requireAccess } from '@/middleware/access.middleware';
import * as categoriesController from './categories.controller';

const router = Router();

router.get(
  getEndpointRouterPath(categoriesEndpoints.list),
  requireAccess({ permission: PERMISSIONS.CATEGORIES_READ }),
  categoriesController.list,
);
router.post(
  getEndpointRouterPath(categoriesEndpoints.create),
  requireAccess({ permission: PERMISSIONS.CATEGORIES_CREATE }),
  categoriesController.create,
);
router.patch(
  getEndpointRouterPath(categoriesEndpoints.update),
  requireAccess({ permission: PERMISSIONS.CATEGORIES_UPDATE }),
  categoriesController.update,
);
router.delete(
  getEndpointRouterPath(categoriesEndpoints.delete),
  requireAccess({ permission: PERMISSIONS.CATEGORIES_DELETE }),
  categoriesController.deleteCategory,
);

export default router;
