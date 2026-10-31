import { NotificationSettings } from "@/components/settings/notification-settings";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Notifications",
  description: "Choose how Luraba notifies you.",
  path: "/settings/notifications",
});

export default function NotificationSettingsPage() {
  return <NotificationSettings />;
}
