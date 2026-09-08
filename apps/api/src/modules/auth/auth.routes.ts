import { authEndpoints, getEndpointRouterPath } from "@luraba/contracts";
import { Router } from "express";
import { requireAccess } from "@/middleware/access.middleware";
import * as authController from "./auth.controller";

const router = Router();

router.get(getEndpointRouterPath(authEndpoints.providers), authController.getProviders);
router.get(getEndpointRouterPath(authEndpoints.me), requireAccess(), authController.me);
router.get(
  getEndpointRouterPath(authEndpoints.preferences),
  requireAccess(),
  authController.getMyPreferences,
);
router.patch(
  getEndpointRouterPath(authEndpoints.updatePreferences),
  requireAccess(),
  authController.updateMyPreferences,
);

export default router;
