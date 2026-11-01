import { apiKeysEndpoints, getEndpointRouterPath } from "@luraba/contracts";
import { Router } from "express";
import { requireAccess } from "@/middleware/access.middleware";
import * as apiKeysController from "./api-keys.controller";

const router = Router();

// Keys are managed by their owner through a session only: a key can never create or change keys.
const sessionOnly = requireAccess({ sessionOnly: true });

router.get(getEndpointRouterPath(apiKeysEndpoints.list), sessionOnly, apiKeysController.list);
router.post(getEndpointRouterPath(apiKeysEndpoints.create), sessionOnly, apiKeysController.create);
router.patch(getEndpointRouterPath(apiKeysEndpoints.update), sessionOnly, apiKeysController.update);
router.delete(
  getEndpointRouterPath(apiKeysEndpoints.delete),
  sessionOnly,
  apiKeysController.remove,
);

export default router;
