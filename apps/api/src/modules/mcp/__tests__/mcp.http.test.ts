import { createHash, randomBytes } from "node:crypto";
import type { AddressInfo } from "node:net";
import request from "supertest";
import { vi } from "vitest";
import app from "@/app";
import { createAuthenticatedContext, createAuthHeaders } from "@/test/auth";
import { loadConfig } from "../../../../../mcp/src/config";
import { createHttpApp } from "../../../../../mcp/src/http/app";
import { createLogger } from "../../../../../mcp/src/logger";
import { connectHttpClient } from "../../../../../mcp/src/testing/connect";
import { mcpRepository } from "../mcp.repository";

const REDIRECT_URI = "http://127.0.0.1:9999/callback";

function pkce() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

async function registerClient(name = "Claude Code") {
  const response = await request(app)
    .post("/api/auth/mcp/register")
    .send({
      client_name: name,
      redirect_uris: [REDIRECT_URI],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    });
  expect(response.status).toBeLessThan(300);
  return response.body.client_id as string;
}

function authorizeUrl(clientId: string, challenge: string) {
  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "openid",
    state: "xyz",
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  return `/api/auth/mcp/authorize?${query.toString()}`;
}

/** Runs the whole flow as the signed-in user and returns the access token. */
async function connectAgent(cookie: string, name = "Claude Code") {
  const clientId = await registerClient(name);
  const { verifier, challenge } = pkce();

  const authorize = await request(app).get(authorizeUrl(clientId, challenge)).set("Cookie", cookie);
  expect(authorize.status).toBe(302);
  const consent = new URL(authorize.headers.location);
  expect(consent.pathname).toBe("/oauth/consent");
  const consentCode = consent.searchParams.get("consent_code");
  expect(consentCode).toBeTruthy();

  const allowed = await request(app)
    .post("/api/auth/oauth2/consent")
    .set(createAuthHeaders(cookie))
    .send({ accept: true, consent_code: consentCode });
  expect(allowed.status).toBe(200);
  const redirect = new URL(allowed.body.redirectURI);
  expect(redirect.searchParams.get("state")).toBe("xyz");
  const code = redirect.searchParams.get("code");

  const token = await request(app).post("/api/auth/mcp/token").type("form").send({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    client_id: clientId,
    code_verifier: verifier,
  });
  expect(token.status).toBe(200);
  return { clientId, accessToken: token.body.access_token as string };
}

describe("MCP OAuth", () => {
  it("publishes discovery metadata at the origin", async () => {
    const server = await request(app).get("/.well-known/oauth-authorization-server");
    expect(server.status).toBe(200);
    expect(server.body.authorization_endpoint).toContain("/api/auth/mcp/authorize");
    expect(server.body.registration_endpoint).toContain("/mcp/register");
    expect(server.body.code_challenge_methods_supported).toContain("S256");

    const resource = await request(app).get("/.well-known/oauth-protected-resource");
    expect(resource.status).toBe(200);
    expect(resource.body.resource).toMatch(/\/mcp$/u);
    expect(resource.body.authorization_servers).toHaveLength(1);
  });

  it("sends signed-out users to the Luraba login and back", async () => {
    const clientId = await registerClient();
    const response = await request(app).get(authorizeUrl(clientId, pkce().challenge));
    expect(response.status).toBe(302);
    const login = new URL(response.headers.location);
    expect(login.pathname).toBe("/login");
    expect(login.searchParams.get("next")).toContain("/api/auth/mcp/authorize");
  });

  it("always asks for consent, then lets the agent act as the user", async () => {
    const context = await createAuthenticatedContext();
    const { accessToken, clientId } = await connectAgent(context.token);

    const me = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.user.id).toBe(context.user.id);

    const accounts = await request(app)
      .get("/api/v1/accounts")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(accounts.status).toBe(200);

    const client = await request(app)
      .get(`/api/v1/mcp/clients/${clientId}`)
      .set(createAuthHeaders(context.token));
    expect(client.body.data.name).toBe("Claude Code");
  });

  it("denied consent returns access_denied and issues nothing", async () => {
    const context = await createAuthenticatedContext();
    const clientId = await registerClient();
    const authorize = await request(app)
      .get(authorizeUrl(clientId, pkce().challenge))
      .set("Cookie", context.token);
    const consentCode = new URL(authorize.headers.location).searchParams.get("consent_code");
    const denied = await request(app)
      .post("/api/auth/oauth2/consent")
      .set(createAuthHeaders(context.token))
      .send({ accept: false, consent_code: consentCode });
    expect(denied.body.redirectURI).toContain("error=access_denied");

    const list = await request(app)
      .get("/api/v1/mcp/connections")
      .set(createAuthHeaders(context.token));
    expect(list.body.data).toEqual([]);
  });

  it("lists connected agents and revokes them", async () => {
    const context = await createAuthenticatedContext();
    const { accessToken, clientId } = await connectAgent(context.token, "Codex");

    const list = await request(app)
      .get("/api/v1/mcp/connections")
      .set(createAuthHeaders(context.token));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({ clientId, name: "Codex" });

    // Another user sees nothing and cannot revoke it.
    const other = await createAuthenticatedContext();
    const otherList = await request(app)
      .get("/api/v1/mcp/connections")
      .set(createAuthHeaders(other.token));
    expect(otherList.body.data).toEqual([]);
    const foreign = await request(app)
      .delete(`/api/v1/mcp/connections/${clientId}`)
      .set(createAuthHeaders(other.token));
    expect(foreign.status).toBe(404);

    // An agent cannot manage agents or keys.
    const agentList = await request(app)
      .get("/api/v1/mcp/connections")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(agentList.status).toBe(403);

    const revoked = await request(app)
      .delete(`/api/v1/mcp/connections/${clientId}`)
      .set(createAuthHeaders(context.token));
    expect(revoked.status).toBe(204);

    const after = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(after.status).toBe(401);
  });

  it("reports the MCP endpoint and that the server is not configured", async () => {
    const context = await createAuthenticatedContext();
    const info = await request(app).get("/api/v1/mcp/server").set(createAuthHeaders(context.token));
    expect(info.status).toBe(200);
    expect(info.body.data.url).toMatch(/\/mcp$/u);
    expect(["online", "offline", "disabled"]).toContain(info.body.data.status);

    const proxied = await request(app).post("/mcp").send({});
    expect([404, 502]).toContain(proxied.status);
  });

  it("serves the MCP server at /mcp through the API, for OAuth tokens and API keys", async () => {
    // The real stack: API on a port, MCP server on the address the API proxies to.
    const api = app.listen(0);
    await new Promise((resolve) => api.once("listening", resolve));
    const apiUrl = `http://127.0.0.1:${(api.address() as AddressInfo).port}`;
    const config = loadConfig({
      MCP_TRANSPORT: "http",
      LURABA_API_URL: apiUrl,
      LOG_LEVEL: "silent",
    });
    const mcpServer = createHttpApp({ config, logger: createLogger(config) }).listen(3499);
    await new Promise((resolve) => mcpServer.once("listening", resolve));
    try {
      // No credentials: a 401 that points the client at the OAuth metadata.
      const anonymous = await fetch(`${apiUrl}/mcp`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
      });
      expect(anonymous.status).toBe(401);
      expect(anonymous.headers.get("www-authenticate")).toContain(
        "/.well-known/oauth-protected-resource",
      );

      // An agent that went through the OAuth flow.
      const context = await createAuthenticatedContext();
      const { accessToken } = await connectAgent(context.token);
      const mcp = await connectHttpClient(`${apiUrl}/mcp`, accessToken);
      const { tools } = await mcp.listTools();
      expect(tools.length).toBeGreaterThan(20);
      const whoami = await mcp.callTool({ name: "whoami", arguments: {} });
      expect(JSON.stringify(whoami.content)).toContain(context.household.id);
      await mcp.close();

      // A revoked token is rejected at the door.
      const connections = await request(app)
        .get("/api/v1/mcp/connections")
        .set(createAuthHeaders(context.token));
      await request(app)
        .delete(`/api/v1/mcp/connections/${connections.body.data[0].clientId}`)
        .set(createAuthHeaders(context.token));
      await expect(connectHttpClient(`${apiUrl}/mcp`, accessToken)).rejects.toThrow();
    } finally {
      mcpServer.close();
      api.close();
    }
  });

  it("lists no agents (not a server error) when the OAuth tables are missing", async () => {
    const context = await createAuthenticatedContext();
    const missing = Object.assign(new Error('relation "oauth_access_tokens" does not exist'), {
      cause: { code: "42P01" },
    });
    const spy = vi.spyOn(mcpRepository, "listConnections").mockRejectedValueOnce(missing);
    const list = await request(app)
      .get("/api/v1/mcp/connections")
      .set(createAuthHeaders(context.token));
    expect(list.status).toBe(200);
    expect(list.body.data).toEqual([]);
    spy.mockRestore();
  });
});
