import {
  AccountDetailSkeleton,
  AccountHeaderActionsSkeleton,
  AccountHeaderMarkSkeleton,
} from "@/components/accounts/account-detail-skeleton";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";

export function AccountDetailsLoading() {
  return (
    <InternalPageLayout
      title="Account"
      subtitle="Balance, activity and details."
      leading={<AccountHeaderMarkSkeleton />}
      actions={<AccountHeaderActionsSkeleton />}
      back={{ href: "/accounts", label: "Accounts" }}
    >
      <AccountDetailSkeleton />
    </InternalPageLayout>
  );
}
