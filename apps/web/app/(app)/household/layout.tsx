import { HouseholdLayout } from "@/components/households/household-layout";

export default function HouseholdAppLayout({ children }: { children: React.ReactNode }) {
  return <HouseholdLayout>{children}</HouseholdLayout>;
}
