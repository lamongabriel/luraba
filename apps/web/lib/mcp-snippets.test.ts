import { describe, expect, it } from "vitest";
import { buildMcpSnippets, MCP_CLIENTS } from "./mcp-snippets";

const URL = "https://luraba.example.com/mcp";

describe("buildMcpSnippets", () => {
  it("builds a setup for every client and sign-in method that points at the MCP URL", () => {
    for (const client of MCP_CLIENTS) {
      for (const method of ["oauth", "api-key"] as const) {
        const snippets = buildMcpSnippets(client.id, method, URL);
        expect(snippets.length).toBeGreaterThan(0);
        expect(snippets.some((snippet) => snippet.code.includes(URL))).toBe(true);
      }
    }
  });

  it("only puts an API key placeholder in the API key setups", () => {
    const oauth = buildMcpSnippets("claude-code", "oauth", URL)
      .map((s) => s.code)
      .join("\n");
    const key = buildMcpSnippets("claude-code", "api-key", URL)
      .map((s) => s.code)
      .join("\n");
    expect(oauth).not.toContain("lur_");
    expect(key).toContain("Authorization: Bearer lur_");
    expect(key).toContain("--transport http");
  });

  it("produces valid JSON for the JSON setups", () => {
    for (const method of ["oauth", "api-key"] as const) {
      for (const client of ["claude-desktop", "other"] as const) {
        for (const snippet of buildMcpSnippets(client, method, URL)) {
          if (snippet.code.startsWith("{")) expect(() => JSON.parse(snippet.code)).not.toThrow();
        }
      }
    }
  });
});
