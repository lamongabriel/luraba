import { HouseholdMembersPage } from "@/components/households/household-members-page";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Members",
  description: "People and invitations in your household.",
  path: "/household/members",
});

export default function HouseholdMembersRoute() {
  return <HouseholdMembersPage />;
}
