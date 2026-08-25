import { DashboardWorkspace } from "@/components/dashboard/dashboard-workspace"
import { InternalPageLayout } from "@/components/finance/internal-page-layout"

export default function DashboardPage() {
  return (
    <InternalPageLayout title="Dashboard">
      <DashboardWorkspace />
    </InternalPageLayout>
  )
}
