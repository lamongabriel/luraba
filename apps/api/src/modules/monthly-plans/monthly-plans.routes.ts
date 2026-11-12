import { getEndpointRouterPath, monthlyPlansEndpoints, PERMISSIONS } from "@luraba/contracts";
import { Router } from "express";
import { requireAccess } from "@/middleware/access.middleware";
import * as controller from "./monthly-plans.controller";

const router = Router();
const path = getEndpointRouterPath;

router.get(
  path(monthlyPlansEndpoints.report),
  requireAccess({ permission: PERMISSIONS.GOALS_READ }),
  controller.report,
);
router.get(
  path(monthlyPlansEndpoints.safeToSpend),
  requireAccess({ permission: PERMISSIONS.GOALS_READ }),
  controller.safeToSpend,
);
router.put(
  path(monthlyPlansEndpoints.set),
  requireAccess({ permission: PERMISSIONS.GOALS_UPDATE }),
  controller.set,
);

export default router;
