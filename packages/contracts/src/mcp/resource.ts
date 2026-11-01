import { z } from "zod";
import { wireDateTimeSchema } from "../common.js";

export const mcpServerStatusSchema = z.enum(["online", "offline", "disabled"]);
export type McpServerStatus = z.infer<typeof mcpServerStatusSchema>;

/** What Settings > MCP shows: where the server is, whether it answers, and how clients sign in. */
export const mcpServerInfoSchema = z.object({
  /** Public MCP endpoint (`<base URL>/mcp`), the address to give to an AI client. */
  url: z.string(),
  /** OAuth discovery document clients read to start the sign-in flow. */
  oauthMetadataUrl: z.string(),
  /** `disabled` when the deployment has no MCP server configured. */
  status: mcpServerStatusSchema,
  checkedAt: wireDateTimeSchema,
});
export type McpServerInfo = z.output<typeof mcpServerInfoSchema>;

/** An agent the user allowed through OAuth. */
export const mcpConnectionSchema = z.object({
  clientId: z.string(),
  name: z.string(),
  grantedAt: wireDateTimeSchema,
  lastUsedAt: wireDateTimeSchema.nullable(),
});
export type McpConnection = z.output<typeof mcpConnectionSchema>;

/** The public part of a registered OAuth client, shown on the consent screen. */
export const mcpClientSchema = z.object({
  clientId: z.string(),
  name: z.string(),
  redirectHost: z.string().nullable(),
});
export type McpClient = z.output<typeof mcpClientSchema>;

export const mcpClientParamsSchema = z.object({ clientId: z.string().min(1).max(200) });
