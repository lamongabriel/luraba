import { getEndpointRouterPath, PERMISSIONS, productsEndpoints } from "@luraba/contracts";
import { Router } from "express";
import { requireAccess } from "@/middleware/access.middleware";
import * as productsController from "./products.controller";

const router = Router();

router.get(
  getEndpointRouterPath(productsEndpoints.list),
  requireAccess({ permission: PERMISSIONS.PRODUCTS_READ }),
  productsController.list,
);
router.get(
  getEndpointRouterPath(productsEndpoints.get),
  requireAccess({ permission: PERMISSIONS.PRODUCTS_READ }),
  productsController.details,
);
router.post(
  getEndpointRouterPath(productsEndpoints.create),
  requireAccess({ permission: PERMISSIONS.PRODUCTS_CREATE }),
  productsController.create,
);
router.patch(
  getEndpointRouterPath(productsEndpoints.update),
  requireAccess({ permission: PERMISSIONS.PRODUCTS_UPDATE }),
  productsController.update,
);
router.delete(
  getEndpointRouterPath(productsEndpoints.delete),
  requireAccess({ permission: PERMISSIONS.PRODUCTS_DELETE }),
  productsController.deleteProduct,
);

export default router;
