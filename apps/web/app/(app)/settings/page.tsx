import { redirect } from "next/navigation";
import { pageMetadata } from "@/lib/metadata";
export const metadata = pageMetadata({
  title: "Settings",
  description: "Your Luraba settings.",
  path: "/settings",
});

export default function SettingsPage() {
  redirect("/settings/profile");
}
