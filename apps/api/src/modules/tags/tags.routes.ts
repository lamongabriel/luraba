import { getEndpointRouterPath, PERMISSIONS, tagsEndpoints } from "@luraba/contracts";
import { Router } from "express";
import { requireAccess } from "@/middleware/access.middleware";
import * as tagsController from "./tags.controller";

const router = Router();

router.get(
  getEndpointRouterPath(tagsEndpoints.list),
  requireAccess({ permission: PERMISSIONS.TAGS_READ }),
  tagsController.list,
);
router.post(
  getEndpointRouterPath(tagsEndpoints.create),
  requireAccess({ permission: PERMISSIONS.TAGS_CREATE }),
  tagsController.create,
);
router.patch(
  getEndpointRouterPath(tagsEndpoints.update),
  requireAccess({ permission: PERMISSIONS.TAGS_UPDATE }),
  tagsController.update,
);
router.delete(
  getEndpointRouterPath(tagsEndpoints.delete),
  requireAccess({ permission: PERMISSIONS.TAGS_DELETE }),
  tagsController.deleteTag,
);

export default router;
