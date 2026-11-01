import { ApiKeysSettings } from "@/components/settings/api-keys/api-keys-settings";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "API keys",
  description: "Create and revoke the keys that let scripts and AI agents use Luraba as you.",
  path: "/settings/api-keys",
});

export default function ApiKeysSettingsPage() {
  return <ApiKeysSettings />;
}
