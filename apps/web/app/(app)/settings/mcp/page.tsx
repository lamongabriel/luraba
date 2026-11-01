import { McpSettings } from "@/components/settings/mcp/mcp-settings";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "MCP",
  description:
    "Connect AI assistants like Claude and Codex to Luraba and manage the agents you allowed.",
  path: "/settings/mcp",
});

export default function McpSettingsPage() {
  return <McpSettings />;
}
