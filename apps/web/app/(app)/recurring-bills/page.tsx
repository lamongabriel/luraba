import { InternalPageLayout } from "@/components/finance/internal-page-layout"
import { RecurringBillsWorkspace } from "@/components/recurring-bills/recurring-bills-workspace"

export default function RecurringBillsPage() {
  return (
    <InternalPageLayout title="Recurring bills">
      <RecurringBillsWorkspace />
    </InternalPageLayout>
  )
}
