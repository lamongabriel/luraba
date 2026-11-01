"use client";

import { Delete02Icon, Wallet01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { AccountDetails } from "@luraba/contracts";
import * as React from "react";
import { AdjustAccountBalanceSheet } from "@/components/accounts/adjust-account-balance-sheet";
import { AmountDisplay } from "@/components/display";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Typography } from "@/components/ui/typography";
import { accountBalanceKind } from "@/lib/accounts";
import { queryClient } from "@/lib/query-client";
import { useDeleteAccountMutation } from "@/mutations/accounts/use-account-mutations";
import { accountQueryKeys } from "@/queries/accounts/use-accounts-query";
import { transactionQueryKeys } from "@/queries/transactions/use-transactions-query";
import { useAuthSessionStore } from "@/stores/auth-session-store";

/**
 * The edit sheet's "Manage" part: adjust the balance (an auditable adjustment transaction) and
 * delete the account behind a confirmation. Neither lives on the account page; both are reached
 * through Edit.
 */
export function AccountManageSection({
  account,
  onDeleted,
}: {
  account: AccountDetails;
  onDeleted: () => void;
}) {
  const [adjustOpen, setAdjustOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const language = useAuthSessionStore((state) => state.user?.preferences.language ?? "en");
  const deleteMutation = useDeleteAccountMutation({
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all }),
      ]);
      setConfirmOpen(false);
      onDeleted();
    },
  });

  return (
    // Rendered inside the account form. Portaled sheets and dialogs still bubble React events up to
    // it, so a submit from the adjust sheet must stop here instead of saving the account form.
    <section className="space-y-3" onSubmit={(event) => event.stopPropagation()}>
      <Typography variant="eyebrow">Manage</Typography>
      <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--color-container-inset)] px-3.5 py-3">
        <div className="min-w-0">
          <Typography variant="small-strong">Balance</Typography>
          <AmountDisplay
            amount={account.balance}
            currencyCode={account.currencyCode}
            language={language}
            kind={accountBalanceKind(account.classification, account.balance)}
            showSign={false}
            size="md"
          />
        </div>
        <PermissionButton
          type="button"
          permission={PERMISSIONS.TRANSACTIONS_CREATE}
          variant="outline"
          size="sm"
          onClick={() => setAdjustOpen(true)}
        >
          <HugeiconsIcon icon={Wallet01Icon} strokeWidth={2} />
          Adjust balance
        </PermissionButton>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-3">
        <div className="min-w-0">
          <Typography variant="small-strong">Delete account</Typography>
          <Typography variant="small-muted">Removes the account and all its activity.</Typography>
        </div>
        <PermissionButton
          type="button"
          permission={PERMISSIONS.ACCOUNTS_DELETE}
          deniedMessage="Your household role cannot delete accounts."
          variant="destructive"
          size="sm"
          onClick={() => setConfirmOpen(true)}
        >
          <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
          Delete
        </PermissionButton>
      </div>

      <AdjustAccountBalanceSheet account={account} open={adjustOpen} onOpenChange={setAdjustOpen} />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!deleteMutation.isPending) setConfirmOpen(open);
        }}
        title={`Delete ${account.name}?`}
        description="This permanently removes the account and every transaction recorded on it. This cannot be undone."
        confirmLabel="Delete account"
        loadingLabel="Deleting..."
        isLoading={deleteMutation.isPending}
        errorMessage={deleteMutation.errorMessage || undefined}
        onConfirm={() => {
          deleteMutation.reset();
          deleteMutation.mutate(account.id);
        }}
      />
    </section>
  );
}
