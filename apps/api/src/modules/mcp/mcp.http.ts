import { Readable } from "node:stream";
import { fromNodeHeaders } from "better-auth/node";
import { oAuthDiscoveryMetadata, oAuthProtectedResourceMetadata } from "better-auth/plugins";
import type { Express, Response as ExpressResponse, Request } from "express";
import { env } from "@/config/env";
import { auth } from "@/shared/lib/auth";
import { publicOrigin } from "./mcp.service";

async function send(res: ExpressResponse, response: globalThis.Response) {
  res.status(response.status);
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  res.send(await response.text());
}

function webRequest(req: Request): globalThis.Request {
  return new globalThis.Request(new URL(req.originalUrl, `${publicOrigin()}/`), {
    headers: fromNodeHeaders(req.headers),
  });
}

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
  "content-encoding",
]);

/**
 * Registers what MCP clients need at the public origin, before the body parsers:
 * - OAuth discovery documents at `/.well-known/*`,
 * - the authorize endpoint wrapper (Luraba sign-in first, then an explicit consent screen),
 * - the reverse proxy from `/mcp` to the MCP server (`MCP_INTERNAL_URL`).
 */
export function mountMcpHttp(app: Express): void {
  const authorizationServer = oAuthDiscoveryMetadata(auth);
  const protectedResource = oAuthProtectedResourceMetadata(auth);

  app.get(
    ["/.well-known/oauth-authorization-server", "/.well-known/oauth-authorization-server/*splat"],
    async (req, res) => send(res, await authorizationServer(webRequest(req))),
  );
  app.get(
    ["/.well-known/oauth-protected-resource", "/.well-known/oauth-protected-resource/*splat"],
    async (req, res) => send(res, await protectedResource(webRequest(req))),
  );

  app.get("/api/auth/mcp/authorize", async (req, res, next) => {
    try {
      const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
      const url = new URL(req.originalUrl, `${publicOrigin()}/`);
      if (!session) {
        const login = new URL("/login", env.frontendOrigin);
        login.searchParams.set("next", url.toString());
        res.redirect(login.toString());
        return;
      }
      // MCP clients never ask for it: every agent needs the user's explicit consent.
      url.searchParams.set("prompt", "consent");
      req.url = `${url.pathname}${url.search}`;
      req.originalUrl = req.url;
      next();
    } catch (error) {
      next(error);
    }
  });

  app.all(["/mcp", "/mcp/*splat"], async (req, res) => {
    if (!env.mcpInternalUrl) {
      res.status(404).json({ error: "The MCP server is not enabled on this deployment" });
      return;
    }
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (HOP_BY_HOP.has(key) || value === undefined) continue;
      headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }
    const origin = new URL(publicOrigin());
    headers.set("x-forwarded-host", origin.host);
    headers.set("x-forwarded-proto", origin.protocol.replace(":", ""));

    const controller = new AbortController();
    res.on("close", () => {
      if (!res.writableFinished) controller.abort();
    });
    try {
      const upstream = await fetch(`${env.mcpInternalUrl.replace(/\/+$/u, "")}${req.originalUrl}`, {
        method: req.method,
        headers,
        ...(req.method === "GET" || req.method === "HEAD" || req.method === "DELETE"
          ? {}
          : { body: Readable.toWeb(req) as unknown as ReadableStream, duplex: "half" }),
        signal: controller.signal,
      });
      res.status(upstream.status);
      upstream.headers.forEach((value, key) => {
        if (!HOP_BY_HOP.has(key)) res.setHeader(key, value);
      });
      if (!upstream.body) {
        res.end();
        return;
      }
      const body = Readable.fromWeb(upstream.body as never);
      body.on("error", () => res.end());
      body.pipe(res);
    } catch {
      if (!res.headersSent) res.status(502).json({ error: "The MCP server did not answer" });
      else res.end();
    }
  });
}
