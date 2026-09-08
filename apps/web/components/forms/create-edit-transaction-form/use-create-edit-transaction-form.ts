"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { TransactionFeedRow } from "@luraba/contracts";
import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { majorToMinorUnits } from "@/lib/finance";
import { queryClient } from "@/lib/query-client";
import {
  useCreateCreditCardPaymentMutation,
  useCreateCreditCardPurchaseMutation,
  useUpdateCreditCardPaymentMutation,
  useUpdateCreditCardPurchaseMutation,
} from "@/mutations/credit-cards/use-credit-card-transaction-mutations";
import {
  useCreateTransactionMutation,
  useUpdateTransactionMutation,
} from "@/mutations/transactions/use-transaction-mutations";
import { accountQueryKeys } from "@/queries/accounts/use-accounts-query";
import { creditCardQueryKeys } from "@/queries/credit-cards/use-credit-cards-query";
import {
  type TransactionLookups,
  transactionLookupQueryKeys,
} from "@/queries/transactions/use-transaction-lookups-query";
import { transactionQueryKeys } from "@/queries/transactions/use-transactions-query";

import {
  type CreateEditTransactionFormValues,
  createEditTransactionFormSchema,
} from "./create-edit-transaction-form.schema";
import {
  getAccountCurrencyCode,
  getCardCurrencyCode,
  getCurrencyPrecision,
  getTransactionFormDefaultValues,
  type TransactionFormDetails,
} from "./create-edit-transaction-form.utils";
import { useTransferFx } from "./use-transfer-fx";

export function useCreateEditTransactionForm({
  details,
  lookups,
  onSuccess,
  row,
}: {
  details?: TransactionFormDetails;
  lookups: TransactionLookups;
  onSuccess: () => void;
  row?: TransactionFeedRow | null;
}) {
  const isEdit = Boolean(row);
  const form = useForm<CreateEditTransactionFormValues>({
    defaultValues: getTransactionFormDefaultValues(lookups, row, details),
    resolver: zodResolver(createEditTransactionFormSchema),
  });
  const kind = useWatch({ control: form.control, name: "kind" });
  const transferFx = useTransferFx({
    form,
    isEdit,
    kind,
    lookups,
  });

  React.useEffect(() => {
    form.reset(getTransactionFormDefaultValues(lookups, row, details));
  }, [details, form, lookups, row]);

  const previousKind = React.useRef(kind);
  React.useEffect(() => {
    if (isEdit || previousKind.current === kind) return;

    const current = form.getValues();
    const defaults = getTransactionFormDefaultValues(lookups);
    form.reset({
      ...defaults,
      kind,
      description: current.description,
      purchaseDate: current.purchaseDate,
      postedDate: current.postedDate,
    });
    transferFx.setUsesMarketRate(true);
    previousKind.current = kind;
  }, [form, isEdit, kind, lookups, transferFx.setUsesMarketRate]);

  const finish = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: creditCardQueryKeys.all }),
      queryClient.invalidateQueries({
        queryKey: transactionLookupQueryKeys.all,
      }),
    ]);
    onSuccess();
  };

  const createTransactionMutation = useCreateTransactionMutation({
    onSuccess: finish,
    successToast: { title: "Transaction created" },
  });
  const updateTransactionMutation = useUpdateTransactionMutation({
    onSuccess: finish,
    successToast: { title: "Transaction updated" },
  });
  const createPurchaseMutation = useCreateCreditCardPurchaseMutation({
    onSuccess: finish,
    successToast: { title: "Credit card purchase created" },
  });
  const updatePurchaseMutation = useUpdateCreditCardPurchaseMutation({
    onSuccess: finish,
    successToast: { title: "Credit card purchase updated" },
  });
  const createPaymentMutation = useCreateCreditCardPaymentMutation({
    onSuccess: finish,
    successToast: { title: "Credit card payment created" },
  });
  const updatePaymentMutation = useUpdateCreditCardPaymentMutation({
    onSuccess: finish,
    successToast: { title: "Credit card payment updated" },
  });

  const resetMutations = () => {
    createTransactionMutation.reset();
    updateTransactionMutation.reset();
    createPurchaseMutation.reset();
    updatePurchaseMutation.reset();
    createPaymentMutation.reset();
    updatePaymentMutation.reset();
  };

  const onSubmit = form.handleSubmit((values) => {
    resetMutations();

    const accountCurrencyCode = getAccountCurrencyCode(lookups, values.accountId);
    const cardCurrencyCode = getCardCurrencyCode(lookups, values.creditCardId);
    const selectedCurrencyCode =
      values.kind === "credit_card_purchase" || values.kind === "credit_card_payment"
        ? cardCurrencyCode
        : accountCurrencyCode;
    const amountMinor = majorToMinorUnits(
      Number(values.amount),
      getCurrencyPrecision(lookups, selectedCurrencyCode ?? transferFx.fromCurrencyCode),
    );
    const merchantId = values.merchantId || undefined;

    if (values.kind === "credit_card_purchase") {
      const body = {
        amount: amountMinor,
        categoryId: values.categoryId || null,
        description: values.description,
        includeInBudget: values.includeInBudget,
        installmentCount: values.installmentCount,
        merchantId,
        postedDate: values.postedDate,
        purchaseDate: values.purchaseDate,
        tagIds: values.tagIds,
      };

      if (row?.purchaseId) {
        updatePurchaseMutation.mutate({
          creditCardId: values.creditCardId,
          purchaseId: row.purchaseId,
          body,
        });
        return;
      }

      createPurchaseMutation.mutate({
        creditCardId: values.creditCardId,
        body,
      });
      return;
    }

    if (values.kind === "credit_card_payment") {
      const body = {
        amount: amountMinor,
        description: values.description,
        fromAccountId: values.fromAccountId,
        paymentDate: values.purchaseDate,
        postedDate: values.postedDate,
      };

      if (row?.paymentId) {
        updatePaymentMutation.mutate({
          creditCardId: values.creditCardId,
          paymentId: row.paymentId,
          body,
        });
        return;
      }

      createPaymentMutation.mutate({
        creditCardId: values.creditCardId,
        body,
      });
      return;
    }

    if (values.kind === "transfer") {
      const body = {
        description: values.description,
        fromAccountId: values.fromAccountId,
        fromAmount: majorToMinorUnits(Number(values.amount), transferFx.fromPrecision),
        includeInBudget: values.includeInBudget,
        postedDate: values.postedDate,
        purchaseDate: values.purchaseDate,
        tagIds: values.tagIds,
        toAccountId: values.toAccountId,
        toAmount: majorToMinorUnits(Number(values.toAmount), transferFx.toPrecision),
      };

      if (row) {
        updateTransactionMutation.mutate({ id: row.id, body });
        return;
      }

      createTransactionMutation.mutate({ type: "transfer", ...body });
      return;
    }

    if (!accountCurrencyCode) return;

    const body = {
      accountId: values.accountId,
      amount: amountMinor,
      categoryId: values.categoryId || null,
      currencyCode: accountCurrencyCode,
      description: values.description,
      includeInBudget: values.includeInBudget,
      merchantId,
      paymentMethodCode: values.paymentMethodCode,
      postedDate: values.postedDate,
      purchaseDate: values.purchaseDate,
      tagIds: values.tagIds,
    };

    if (row) {
      updateTransactionMutation.mutate({ id: row.id, body });
      return;
    }

    createTransactionMutation.mutate({ type: values.kind, ...body });
  });

  const mutations = [
    createTransactionMutation,
    updateTransactionMutation,
    createPurchaseMutation,
    updatePurchaseMutation,
    createPaymentMutation,
    updatePaymentMutation,
  ];

  return {
    errorMessage: mutations.map((mutation) => mutation.errorMessage).find(Boolean) ?? "",
    form,
    fromCurrencyCode: transferFx.fromCurrencyCode,
    isCrossCurrency: transferFx.isCrossCurrency,
    isEdit,
    isPending: mutations.some((mutation) => mutation.isPending),
    kind,
    onSubmit,
    rateQuery: transferFx.rateQuery,
    setUsesMarketRate: transferFx.setUsesMarketRate,
    toCurrencyCode: transferFx.toCurrencyCode,
    usesMarketRate: transferFx.usesMarketRate,
  };
}
