import { ArrowLeftRightIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { EmptyState } from "@/components/empty-state";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import { Button } from "@/components/ui/button";

export function TransactionsEmpty({
  hasFilters,
  onClearFilters,
  onCreate,
}: {
  hasFilters: boolean;
  onClearFilters: () => void;
  onCreate: () => void;
}) {
  return (
    <EmptyState
      icon={<HugeiconsIcon icon={ArrowLeftRightIcon} strokeWidth={1.8} className="size-5" />}
      title={hasFilters ? "No matching transactions" : "No transactions yet"}
      description={
        hasFilters
          ? "Try removing a filter or changing your search."
          : "Add income, expenses, transfers, card purchases, and card payments from one place."
      }
      action={
        hasFilters ? (
          <Button variant="outline" onClick={onClearFilters}>
            Clear filters
          </Button>
        ) : (
          <PermissionButton permission={PERMISSIONS.TRANSACTIONS_CREATE} onClick={onCreate}>
            Add transaction
          </PermissionButton>
        )
      }
    />
  );
}
