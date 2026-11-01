import { McpConnectCard } from "@/components/settings/mcp/mcp-connect-card";
import { McpConnectionsCard } from "@/components/settings/mcp/mcp-connections-card";
import { McpServerCard } from "@/components/settings/mcp/mcp-server-card";

/** `/settings/mcp`: the MCP endpoint, how to connect an AI client, and the agents already connected. */
export function McpSettings() {
  return (
    <>
      <McpServerCard />
      <McpConnectCard />
      <McpConnectionsCard />
    </>
  );
}
