import { ProfileSettings } from "@/components/settings/profile-settings";
import { pageMetadata } from "@/lib/metadata";
export const metadata = pageMetadata({
  title: "Profile",
  description: "Your name, photo and email.",
  path: "/settings/profile",
});

export default function ProfileSettingsPage() {
  return <ProfileSettings />;
}
