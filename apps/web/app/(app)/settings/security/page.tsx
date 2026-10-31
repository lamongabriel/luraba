import { SecuritySettings } from "@/components/settings/security-settings";
import { pageMetadata } from "@/lib/metadata";
export const metadata = pageMetadata({
  title: "Security",
  description: "Password and session security.",
  path: "/settings/security",
});

export default function SecuritySettingsPage() {
  return <SecuritySettings />;
}
