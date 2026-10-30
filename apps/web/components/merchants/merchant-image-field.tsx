"use client";

import { type Merchant, PERMISSIONS } from "@luraba/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { MerchantMark } from "@/components/display";
import { EntityImageField } from "@/components/uploads/entity-image-field";
import { useUpdateMerchantMutation } from "@/mutations/merchants/use-merchant-mutations";
import { merchantQueryKeys } from "@/queries/merchants/use-merchants-query";
import { transactionQueryKeys } from "@/queries/transactions/use-transactions-query";

/** The merchant's own logo. Overrides the domain-derived logo wherever the merchant is shown. */
export function MerchantImageField({ merchant }: { merchant: Merchant }) {
  const client = useQueryClient();
  const update = useUpdateMerchantMutation({
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: merchantQueryKeys.all }),
        client.invalidateQueries({ queryKey: transactionQueryKeys.all }),
      ]),
  });

  return (
    <EntityImageField
      targetType="merchant"
      permission={PERMISSIONS.MERCHANTS_UPDATE}
      targetId={merchant.id}
      attachmentRole="logo"
      noun="logo"
      uploadId={merchant.imageUploadId}
      preview={<MerchantMark merchant={merchant} size="lg" />}
      onChange={(imageUploadId) => update.mutateAsync({ id: merchant.id, body: { imageUploadId } })}
    />
  );
}
