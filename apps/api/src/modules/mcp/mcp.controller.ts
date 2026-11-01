import { mcpEndpoints } from "@luraba/contracts";
import { createAuthenticatedHandler } from "@/shared/controllers/authenticated.controller";
import * as mcpService from "./mcp.service";

export const info = createAuthenticatedHandler({
  response: mcpEndpoints.info.response,
  handle: () => mcpService.getServerInfo(),
});

export const listConnections = createAuthenticatedHandler({
  response: mcpEndpoints.listConnections.response,
  handle: ({ user }) => mcpService.listConnections(user.id),
});

export const revokeConnection = createAuthenticatedHandler({
  params: mcpEndpoints.revokeConnection.params,
  status: "no-content",
  handle: ({ user, params }) => mcpService.revokeConnection(user.id, params.clientId),
});

export const getClient = createAuthenticatedHandler({
  params: mcpEndpoints.getClient.params,
  response: mcpEndpoints.getClient.response,
  handle: ({ params }) => mcpService.getClient(params.clientId),
});
