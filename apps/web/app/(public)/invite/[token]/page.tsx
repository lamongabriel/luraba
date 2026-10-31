import type { Metadata } from "next";

import { InviteOnboarding } from "@/components/households/invite-onboarding";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Household invitation",
  description: "Accept an invitation to join a Luraba household.",
});

export default async function HouseholdInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <InviteOnboarding token={token} />;
}
