import { getEndpointRouterPath, mcpEndpoints } from "@luraba/contracts";
import { Router } from "express";
import { requireAccess } from "@/middleware/access.middleware";
import * as mcpController from "./mcp.controller";

const router = Router();

// Connected agents are managed by their owner with a session only: an agent cannot list or revoke agents.
const sessionOnly = requireAccess({ sessionOnly: true });

router.get(getEndpointRouterPath(mcpEndpoints.info), sessionOnly, mcpController.info);
router.get(
  getEndpointRouterPath(mcpEndpoints.listConnections),
  sessionOnly,
  mcpController.listConnections,
);
router.delete(
  getEndpointRouterPath(mcpEndpoints.revokeConnection),
  sessionOnly,
  mcpController.revokeConnection,
);
router.get(getEndpointRouterPath(mcpEndpoints.getClient), sessionOnly, mcpController.getClient);

export default router;
