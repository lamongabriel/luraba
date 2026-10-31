import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Dashboard",
  description: "Your finances at a glance.",
  path: "/dashboard",
});

export default function DashboardPage() {
  return (
    <InternalPageLayout title="Dashboard" subtitle="Your finances at a glance.">
      {null}
    </InternalPageLayout>
  );
}
