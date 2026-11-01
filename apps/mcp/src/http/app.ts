import { randomUUID } from "node:crypto";
import { authEndpoints } from "@luraba/contracts";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import express, { type Request } from "express";
import { LurabaApiError } from "../client/errors.js";
import { LurabaClient } from "../client/luraba-client.js";
import type { Config } from "../config.js";
import type { Logger } from "../logger.js";
import { createMcpServer } from "../mcp/server.js";

type Session = { transport: StreamableHTTPServerTransport; apiKey: string };

function bearerKey(req: Request): string | undefined {
  const header = req.header("authorization");
  if (header?.startsWith("Bearer ") && header.length > 7) return header.slice(7).trim();
  return req.header("x-api-key");
}

/** Where clients find the OAuth metadata: the public origin the request came through. */
function resourceMetadataUrl(req: Request, config: Config): string {
  const configured = config.MCP_PUBLIC_URL ? new URL(config.MCP_PUBLIC_URL).origin : undefined;
  const host = req.header("x-forwarded-host") ?? req.header("host") ?? "localhost";
  const proto = req.header("x-forwarded-proto") ?? req.protocol;
  return `${configured ?? `${proto}://${host}`}/.well-known/oauth-protected-resource`;
}

/**
 * Streamable HTTP transport. Callers authenticate with a Luraba API key or an OAuth access token
 * (`Authorization: Bearer ...`); both are verified by the API itself. Without valid credentials the
 * answer is a 401 that points MCP clients at the OAuth metadata, which starts the sign-in flow. Each MCP session is bound to the API key that opened it. */
export function createHttpApp({ config, logger }: { config: Config; logger: Logger }) {
  const sessions = new Map<string, Session>();
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.get("/health/live", (_req, res) => res.json({ status: "ok" }));

  app.post("/mcp", async (req, res) => {
    const apiKey = bearerKey(req);
    const unauthorized = (message: string) => {
      res.setHeader(
        "WWW-Authenticate",
        `Bearer resource_metadata="${resourceMetadataUrl(req, config)}"`,
      );
      return res.status(401).json({ error: message });
    };
    if (!apiKey)
      return unauthorized("Sign in or send a Luraba API key (Authorization: Bearer lur_...)");
    const sessionId = req.header("mcp-session-id");
    try {
      const existing = sessionId ? sessions.get(sessionId) : undefined;
      if (existing) {
        if (existing.apiKey !== apiKey)
          return res.status(404).json({ error: "mcp_session_not_found" });
        return await existing.transport.handleRequest(req, res, req.body);
      }
      if (sessionId || !isInitializeRequest(req.body)) {
        return res.status(400).json({ error: "Send an initialize request first" });
      }
      const client = new LurabaClient({
        baseUrl: config.LURABA_API_URL,
        apiKey,
        householdId: config.LURABA_HOUSEHOLD_ID,
        timeoutMs: config.REQUEST_TIMEOUT_MS,
      });
      // Verify the credentials once, when the session starts, so a bad key or expired token is a
      // clean 401 (which makes OAuth clients re-authenticate) instead of failing on every tool call.
      try {
        await client.request(authEndpoints.me);
      } catch (error) {
        if (error instanceof LurabaApiError && error.status === 401)
          return unauthorized("The API key or access token is invalid, expired or revoked");
        throw error;
      }
      const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id: string) => {
          sessions.set(id, { transport, apiKey });
        },
      });
      transport.onclose = () => {
        if (transport.sessionId) sessions.delete(transport.sessionId);
      };
      await createMcpServer({ client, householdId: config.LURABA_HOUSEHOLD_ID, logger }).connect(
        transport,
      );
      return await transport.handleRequest(req, res, req.body);
    } catch (error) {
      logger.error(
        { err: error instanceof Error ? error.message : "unknown" },
        "mcp http request failed",
      );
      if (!res.headersSent) res.status(500).json({ error: "internal_error" });
    }
  });

  const forward = async (req: Request, res: express.Response): Promise<void> => {
    const session = sessions.get(req.header("mcp-session-id") ?? "");
    const apiKey = bearerKey(req);
    if (!session || session.apiKey !== apiKey) {
      res.status(404).json({ error: "mcp_session_not_found" });
      return;
    }
    await session.transport.handleRequest(req, res);
  };
  app.get("/mcp", forward);
  app.delete("/mcp", forward);
  return app;
}
