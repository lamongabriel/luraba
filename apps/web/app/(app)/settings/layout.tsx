import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { SettingsLayout } from "@/components/settings/settings-layout";

export default function SettingsAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <InternalPageLayout
      title="Settings"
      subtitle="Your profile, preferences, security, notifications, and importing or exporting your data."
    >
      <SettingsLayout>{children}</SettingsLayout>
    </InternalPageLayout>
  );
}
