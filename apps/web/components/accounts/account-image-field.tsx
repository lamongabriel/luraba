"use client";

import type { AccountDetails } from "@luraba/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { AccountMark } from "@/components/display";
import { EntityImageField } from "@/components/uploads/entity-image-field";
import { useUpdateAccountMutation } from "@/mutations/accounts/use-account-mutations";
import { accountQueryKeys } from "@/queries/accounts/use-accounts-query";

/**
 * A picture for one account (a photo of the car, the house, a logo). `AccountDisplay` prefers it
 * over the institution logo everywhere. Saves immediately.
 */
export function AccountImageField({ account }: { account: AccountDetails }) {
  const client = useQueryClient();
  const update = useUpdateAccountMutation({
    onSuccess: () => client.invalidateQueries({ queryKey: accountQueryKeys.all }),
  });

  return (
    <EntityImageField
      targetType="account"
      targetId={account.id}
      uploadId={account.imageUploadId}
      preview={<AccountMark account={account} size="lg" />}
      onChange={(imageUploadId) => update.mutateAsync({ id: account.id, body: { imageUploadId } })}
    />
  );
}
