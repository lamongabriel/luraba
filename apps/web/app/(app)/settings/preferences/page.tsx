import { PreferencesSettings } from "@/components/settings/preferences-settings";
import { pageMetadata } from "@/lib/metadata";
export const metadata = pageMetadata({
  title: "Preferences",
  description: "Language, currency, time zone and display preferences.",
  path: "/settings/preferences",
});

export default function PreferencesSettingsPage() {
  return <PreferencesSettings />;
}
