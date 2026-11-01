import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ZodError } from "zod";
import { describeApiError, LurabaApiError } from "../client/errors.js";
import type { LurabaClient } from "../client/luraba-client.js";
import { guideResources } from "../context/resources.js";
import type { Logger } from "../logger.js";
import { References } from "../resolve/references.js";
import { tools } from "../tools/registry.js";
import type { ToolOutput } from "../tools/types.js";
import { toInputSchema } from "./tool-schema.js";

export type McpServerOptions = {
  client: LurabaClient;
  householdId?: string | undefined;
  logger: Logger;
  version?: string;
};

function result(output: ToolOutput) {
  const text = JSON.stringify(
    output.summary ? { summary: output.summary, ...output.data } : output.data,
    null,
    2,
  );
  return {
    content: [{ type: "text" as const, text }],
    structuredContent: output.data,
    ...(output.isError ? { isError: true } : {}),
  };
}

function failure(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

export function createMcpServer({
  client,
  householdId,
  logger,
  version = "1.3.0",
}: McpServerOptions) {
  const server = new Server(
    { name: "luraba", version },
    {
      capabilities: { tools: {}, resources: {} },
      instructions:
        "Luraba personal finance. Read luraba://guide/overview first. Amounts are major units with a currency. Destructive tools need confirm: true; bulk tools support dryRun.",
    },
  );
  const byName = new Map(tools.map((tool) => [tool.name, tool]));

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((tool) => ({
      name: tool.name,
      title: tool.title,
      description: tool.description,
      inputSchema: toInputSchema(tool.input),
      annotations: { title: tool.title, ...tool.annotations },
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = byName.get(request.params.name);
    if (!tool) return failure(`Unknown tool: ${request.params.name}`);
    const parsed = tool.input.safeParse(request.params.arguments ?? {});
    if (!parsed.success) {
      return failure(
        `Invalid arguments for ${tool.name}: ${parsed.error.issues
          .map(
            (issue: { path: PropertyKey[]; message: string }) =>
              `${issue.path.join(".") || "input"}: ${issue.message}`,
          )
          .join("; ")}`,
      );
    }
    const started = Date.now();
    try {
      const output = await tool.handler(
        { client, refs: new References(client, householdId), logger },
        parsed.data,
      );
      logger.info(
        { tool: tool.name, ms: Date.now() - started, isError: output.isError ?? false },
        "tool call",
      );
      return result(output);
    } catch (error) {
      if (error instanceof LurabaApiError) {
        logger.warn(
          { tool: tool.name, status: error.status, code: error.code },
          "tool call failed",
        );
        return failure(describeApiError(error));
      }
      if (error instanceof ZodError)
        return failure(`Unexpected API response shape: ${error.message}`);
      logger.error(
        { tool: tool.name, err: error instanceof Error ? error.message : "unknown" },
        "tool crashed",
      );
      return failure("The tool failed unexpectedly. Check the MCP server logs.");
    }
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: guideResources.map(({ uri, name, description }) => ({
      uri,
      name,
      description,
      mimeType: "text/markdown",
    })),
  }));
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const resource = guideResources.find((r) => r.uri === request.params.uri);
    if (!resource) throw new Error(`Unknown resource: ${request.params.uri}`);
    return { contents: [{ uri: resource.uri, mimeType: "text/markdown", text: resource.text }] };
  });
  return server;
}
