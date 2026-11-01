import { z } from "zod";
import { defineEndpoint } from "../api.js";
import {
  mcpClientParamsSchema,
  mcpClientSchema,
  mcpConnectionSchema,
  mcpServerInfoSchema,
} from "./resource.js";

/** User-level (no household): managed with a session only. */
export const mcpEndpoints = {
  info: defineEndpoint({
    method: "get",
    path: "/mcp/server",
    response: mcpServerInfoSchema,
    status: 200,
  }),
  listConnections: defineEndpoint({
    method: "get",
    path: "/mcp/connections",
    response: z.array(mcpConnectionSchema),
    status: 200,
  }),
  revokeConnection: defineEndpoint({
    method: "delete",
    path: "/mcp/connections/:clientId",
    params: mcpClientParamsSchema,
    status: 204,
  }),
  getClient: defineEndpoint({
    method: "get",
    path: "/mcp/clients/:clientId",
    params: mcpClientParamsSchema,
    response: mcpClientSchema,
    status: 200,
  }),
} as const;
