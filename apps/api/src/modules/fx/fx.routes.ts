import { fxEndpoints, getEndpointRouterPath, PERMISSIONS } from "@luraba/contracts";
import { Router } from "express";
import { requireAccess } from "@/middleware/access.middleware";
import * as controller from "./fx.controller";

const router = Router();
const read = requireAccess({ permission: PERMISSIONS.HOUSEHOLD_READ });
const update = requireAccess({ permission: PERMISSIONS.HOUSEHOLD_UPDATE });
const path = getEndpointRouterPath;

router.get(path(fxEndpoints.rates), read, controller.rates);
router.get(path(fxEndpoints.listOverrides), read, controller.listOverrides);
router.put(path(fxEndpoints.setOverride), update, controller.setOverride);
router.delete(path(fxEndpoints.deleteOverride), update, controller.deleteOverride);

export default router;
