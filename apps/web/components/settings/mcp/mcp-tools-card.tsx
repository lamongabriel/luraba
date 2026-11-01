import { MCP_TOOL_GROUPS } from "@luraba/contracts";
import { SectionBlock, SectionCard, SectionDivider } from "@/components/section/section-card";
import { Badge } from "@/components/ui/badge";

/** What agents can do: the tools grouped by area (the catalog lives in `@luraba/contracts`). */
export function McpToolsCard() {
  return (
    <SectionCard
      title="What agents can do"
      description="An agent acts as you, with your role in the household. It can answer questions, create and fix transactions and run reports. Anything destructive asks for confirmation."
    >
      {MCP_TOOL_GROUPS.map((group, index) => (
        <div key={group.id}>
          {index > 0 ? <SectionDivider /> : null}
          <SectionBlock title={group.label} description={group.description}>
            <div className="flex flex-wrap gap-1.5">
              {group.tools.map((tool) => (
                <Badge key={tool} variant="outline" className="font-mono font-normal">
                  {tool}
                </Badge>
              ))}
            </div>
          </SectionBlock>
        </div>
      ))}
    </SectionCard>
  );
}
