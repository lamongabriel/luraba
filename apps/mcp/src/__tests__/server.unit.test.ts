import { describe, expect, it } from "vitest";
import { toInputSchema } from "../mcp/tool-schema.js";
import { connectTestClient } from "../testing/connect.js";
import { tools } from "../tools/registry.js";

describe("tool registry", () => {
  it("has unique names, descriptions and object input schemas", () => {
    expect(new Set(tools.map((t) => t.name)).size).toBe(tools.length);
    for (const tool of tools) {
      expect(tool.description.length).toBeGreaterThan(20);
      expect(toInputSchema(tool.input).type).toBe("object");
    }
  });

  it("marks every destructive tool as such and requires confirmation", () => {
    for (const name of ["delete_transaction", "bulk_delete_transactions"]) {
      const tool = tools.find((t) => t.name === name);
      expect(tool?.annotations.destructiveHint).toBe(true);
      expect(Object.keys(tool?.input.shape ?? {})).toContain("confirm");
    }
  });
});

describe("MCP server over a mocked API", () => {
  it("returns an error result (not a crash) when the API rejects the key", async () => {
    const fetch = async () =>
      new Response(
        JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "no" } }),
        { status: 401 },
      );
    const { call, close } = await connectTestClient({
      baseUrl: "http://api.test",
      apiKey: "lur_x",
      fetch,
    });
    const result = await call("list_accounts");
    expect(result.isError).toBe(true);
    expect(result.text).toContain("API key");
    await close();
  });

  it("rejects invalid arguments with a readable message", async () => {
    const { call, close } = await connectTestClient({
      baseUrl: "http://api.test",
      apiKey: "lur_x",
      fetch: async () => new Response("{}"),
    });
    const result = await call("delete_transaction", { id: "not-a-uuid" });
    expect(result.isError).toBe(true);
    expect(result.text).toContain("Invalid arguments");
    await close();
  });
});

describe("tool catalog", () => {
  it("lists exactly the registered tools in the Settings > MCP catalog", async () => {
    const { MCP_TOOL_GROUPS } = await import("@luraba/contracts");
    const catalog = MCP_TOOL_GROUPS.flatMap((group) => [...group.tools]).sort();
    expect(catalog).toEqual(tools.map((tool) => tool.name).sort());
  });
});
