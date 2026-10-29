import { budgetsEndpoints, getEndpointRouterPath, PERMISSIONS } from "@luraba/contracts";
import { Router } from "express";
import { requireAccess } from "@/middleware/access.middleware";
import * as budgetsController from "./budgets.controller";

const router = Router();

router.get(
  getEndpointRouterPath(budgetsEndpoints.getMonth),
  requireAccess({ permission: PERMISSIONS.BUDGETS_READ }),
  budgetsController.getMonth,
);
router.put(
  getEndpointRouterPath(budgetsEndpoints.replaceMonth),
  requireAccess({ permission: PERMISSIONS.BUDGETS_UPDATE }),
  budgetsController.replaceMonth,
);

router.put(
  getEndpointRouterPath(budgetsEndpoints.updateMonthSettings),
  requireAccess({ permission: PERMISSIONS.BUDGETS_UPDATE }),
  budgetsController.updateMonthSettings,
);

export default router;
