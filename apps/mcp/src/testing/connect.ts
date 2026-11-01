import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { LurabaClient } from "../client/luraba-client.js";
import { createLogger } from "../logger.js";
import { createMcpServer } from "../mcp/server.js";

/** Connects a real MCP client to the real MCP server in-process (used by tests). */
export async function connectTestClient(options: {
  baseUrl: string;
  apiKey: string;
  householdId?: string;
  fetch?: ConstructorParameters<typeof LurabaClient>[0]["fetch"];
}) {
  const client = new LurabaClient({ ...options, timeoutMs: 15_000 });
  const server = createMcpServer({
    client,
    householdId: options.householdId,
    logger: createLogger({ LOG_LEVEL: "silent" }),
  });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const mcp = new Client({ name: "test", version: "0.0.0" });
  await Promise.all([server.connect(serverSide), mcp.connect(clientSide)]);

  async function call(name: string, args: Record<string, unknown> = {}) {
    const response = await mcp.callTool({ name, arguments: args });
    const text = (response.content as { type: string; text: string }[])[0]?.text ?? "";
    return {
      isError: Boolean(response.isError),
      text,
      data: (response.structuredContent ?? {}) as Record<string, any>,
    };
  }
  return { mcp, call, close: () => mcp.close() };
}

/** A real MCP client over streamable HTTP, e.g. to `<api>/mcp` (through the API's proxy). */
export async function connectHttpClient(url: string, accessToken: string) {
  const mcp = new Client({ name: "test-http", version: "0.0.0" });
  await mcp.connect(
    new StreamableHTTPClientTransport(new URL(url), {
      requestInit: { headers: { Authorization: `Bearer ${accessToken}` } },
    }),
  );
  return mcp;
}
