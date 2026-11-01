#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { LurabaClient } from "./client/luraba-client.js";
import { ConfigError, loadConfig } from "./config.js";
import { createHttpApp } from "./http/app.js";
import { createLogger } from "./logger.js";
import { createMcpServer } from "./mcp/server.js";

async function main() {
  const config = loadConfig();
  const logger = createLogger(config);

  if (config.MCP_TRANSPORT === "http") {
    const app = createHttpApp({ config, logger });
    app.listen(config.MCP_HTTP_PORT, config.MCP_HTTP_HOST, () =>
      logger.info(
        { host: config.MCP_HTTP_HOST, port: config.MCP_HTTP_PORT },
        "Luraba MCP listening (http)",
      ),
    );
    return;
  }

  const client = new LurabaClient({
    baseUrl: config.LURABA_API_URL,
    apiKey: config.LURABA_API_KEY as string,
    householdId: config.LURABA_HOUSEHOLD_ID,
    timeoutMs: config.REQUEST_TIMEOUT_MS,
  });
  await createMcpServer({ client, householdId: config.LURABA_HOUSEHOLD_ID, logger }).connect(
    new StdioServerTransport(),
  );
  logger.info({ api: config.LURABA_API_URL }, "Luraba MCP ready (stdio)");
}

main().catch((error) => {
  // stdout carries the protocol in stdio mode, so errors go to stderr.
  console.error(error instanceof ConfigError ? error.message : error);
  process.exit(1);
});
