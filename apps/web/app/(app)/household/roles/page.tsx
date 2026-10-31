import { HouseholdRolesPage } from "@/components/households/household-roles-page";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Roles",
  description: "Roles and permissions for household members.",
  path: "/household/roles",
});

export default function HouseholdRolesRoute() {
  return <HouseholdRolesPage />;
}
