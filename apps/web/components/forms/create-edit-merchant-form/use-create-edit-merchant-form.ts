"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Merchant } from "@luraba/contracts";
import { useForm } from "react-hook-form";
import { queryClient } from "@/lib/query-client";
import {
  useCreateMerchantMutation,
  useUpdateMerchantMutation,
} from "@/mutations/merchants/use-merchant-mutations";
import { merchantQueryKeys } from "@/queries/merchants/use-merchants-query";
import { transactionQueryKeys } from "@/queries/transactions/use-transactions-query";

import {
  type CreateEditMerchantFormValues,
  createEditMerchantFormSchema,
} from "./create-edit-merchant-form.schema";

function getDefaultValues(merchant?: Merchant): CreateEditMerchantFormValues {
  return { name: merchant?.name ?? "", domain: merchant?.domain ?? "" };
}

export function useCreateEditMerchantForm({
  merchant,
  onSuccess,
}: {
  merchant?: Merchant;
  onSuccess: () => void;
}) {
  const isEdit = Boolean(merchant);
  const form = useForm<CreateEditMerchantFormValues>({
    defaultValues: getDefaultValues(merchant),
    resolver: zodResolver(createEditMerchantFormSchema),
  });

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: merchantQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all }),
    ]);

  const createMutation = useCreateMerchantMutation({
    onSuccess: async () => {
      await refresh();
      form.reset(getDefaultValues());
      onSuccess();
    },
  });
  const updateMutation = useUpdateMerchantMutation({
    onSuccess: async () => {
      await refresh();
      onSuccess();
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const errorMessage = createMutation.errorMessage || updateMutation.errorMessage;

  const onSubmit = form.handleSubmit((values) => {
    const name = values.name.trim();
    const domain = values.domain.trim();

    if (isEdit && merchant) {
      updateMutation.reset();
      updateMutation.mutate({ id: merchant.id, body: { name, domain: domain || null } });
      return;
    }

    createMutation.reset();
    createMutation.mutate({ name, ...(domain ? { domain } : {}) });
  });

  return { form, onSubmit, isEdit, isPending, errorMessage };
}
