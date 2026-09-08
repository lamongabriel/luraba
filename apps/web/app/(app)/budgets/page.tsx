import { BudgetsWorkspace } from "@/components/budgets/budgets-workspace";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";

export default function BudgetsPage() {
  return (
    <InternalPageLayout title="Budgets">
      <BudgetsWorkspace />
    </InternalPageLayout>
  );
}
