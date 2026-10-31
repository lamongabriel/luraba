import { HouseholdProfile } from "@/components/households/household-profile";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Household",
  description: "Household profile and settings.",
  path: "/household",
});

export default function HouseholdPage() {
  return <HouseholdProfile />;
}
