import { PageHeader } from "@/components/finance/page-header";
import { SectionPanel } from "@/components/finance/section-panel";
import { Badge } from "@/components/ui/badge";
import { Typography } from "@/components/ui/typography";
import { settingsShowcase } from "@/lib/mock-data";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Settings" />

      <div className="grid gap-6 xl:grid-cols-3">
        {settingsShowcase.map((section) => (
          <SectionPanel
            key={section.title}
            title={section.title}
            description={section.description}
            className="h-full"
            contentClassName="space-y-3"
          >
            {section.items.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-4 rounded-[1rem] border border-border/70 bg-[var(--color-container-inset)] px-4 py-3">
                <Typography variant="small-strong">{item.label}</Typography>
                <Badge variant="secondary">{item.value}</Badge>
              </div>
            ))}
          </SectionPanel>
        ))}
      </div>
    </div>
  );
}
