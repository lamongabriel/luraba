export type McpClientId = "claude-code" | "claude-desktop" | "codex" | "other";
export type McpAuthMethod = "oauth" | "api-key";

export const MCP_CLIENTS: readonly { id: McpClientId; label: string }[] = [
  { id: "claude-code", label: "Claude Code" },
  { id: "claude-desktop", label: "Claude Desktop / claude.ai" },
  { id: "codex", label: "Codex" },
  { id: "other", label: "Other (JSON)" },
];

export type McpSnippet = {
  /** What to do with the block, in one sentence. */
  title: string;
  code: string;
};

const KEY_PLACEHOLDER = "lur_YOUR_API_KEY";

/** The copy-paste setup for one AI client and one way of signing in, for the given MCP URL. */
export function buildMcpSnippets(
  client: McpClientId,
  method: McpAuthMethod,
  url: string,
): McpSnippet[] {
  const oauth = method === "oauth";
  switch (client) {
    case "claude-code":
      return oauth
        ? [
            { title: "Add the server", code: `claude mcp add --transport http luraba ${url}` },
            {
              title: "Then run /mcp inside Claude Code, pick luraba and choose Authenticate",
              code: "/mcp",
            },
          ]
        : [
            {
              title: "Add the server with your API key",
              code: `claude mcp add --transport http luraba ${url} --header "Authorization: Bearer ${KEY_PLACEHOLDER}"`,
            },
          ];
    case "claude-desktop":
      return oauth
        ? [
            {
              title:
                "In Claude Desktop or claude.ai open Settings > Connectors > Add custom connector and paste this URL",
              code: url,
            },
          ]
        : [
            {
              title:
                "Add this to claude_desktop_config.json (Settings > Developer > Edit config). It bridges to the server with your API key and needs Node.js",
              code: JSON.stringify(
                {
                  mcpServers: {
                    luraba: {
                      command: "npx",
                      args: [
                        "-y",
                        "mcp-remote",
                        url,
                        "--header",
                        `Authorization: Bearer ${KEY_PLACEHOLDER}`,
                      ],
                    },
                  },
                },
                null,
                2,
              ),
            },
          ];
    case "codex":
      return oauth
        ? [
            { title: "Add the server", code: `codex mcp add luraba --url ${url}` },
            { title: "Sign in when it asks, or run", code: "codex mcp login luraba" },
          ]
        : [
            {
              title: "Export your API key, then add this to ~/.codex/config.toml",
              code: `export LURABA_API_KEY=${KEY_PLACEHOLDER}\n\n[mcp_servers.luraba]\nurl = "${url}"\nbearer_token_env_var = "LURABA_API_KEY"`,
            },
          ];
    default:
      return [
        {
          title: oauth
            ? "Point any MCP client that supports remote servers with OAuth at this URL; it discovers the sign-in flow by itself"
            : "Use this in any MCP client that supports remote (streamable HTTP) servers",
          code: JSON.stringify(
            {
              mcpServers: {
                luraba: oauth
                  ? { type: "http", url }
                  : {
                      type: "http",
                      url,
                      headers: { Authorization: `Bearer ${KEY_PLACEHOLDER}` },
                    },
              },
            },
            null,
            2,
          ),
        },
      ];
  }
}
