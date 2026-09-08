"use client";

import * as React from "react";
import { type UseFormReturn, useWatch } from "react-hook-form";

import { majorToMinorUnits, minorToMajorUnits } from "@/lib/finance";
import { useCurrencyRateQuery } from "@/queries/currencies/use-currencies-query";
import type { TransactionLookups } from "@/queries/transactions/use-transaction-lookups-query";

import type { CreateEditTransactionFormValues } from "./create-edit-transaction-form.schema";
import { getAccountCurrencyCode, getCurrencyPrecision } from "./create-edit-transaction-form.utils";

export function useTransferFx({
  form,
  isEdit,
  kind,
  lookups,
}: {
  form: UseFormReturn<CreateEditTransactionFormValues>;
  isEdit: boolean;
  kind: CreateEditTransactionFormValues["kind"];
  lookups: TransactionLookups;
}) {
  const fromAccountId = useWatch({
    control: form.control,
    name: "fromAccountId",
  });
  const toAccountId = useWatch({ control: form.control, name: "toAccountId" });
  const amount = useWatch({ control: form.control, name: "amount" });
  const postedDate = useWatch({ control: form.control, name: "postedDate" });
  const [usesMarketRate, setUsesMarketRate] = React.useState(!isEdit);

  const fromCurrencyCode = getAccountCurrencyCode(lookups, fromAccountId);
  const toCurrencyCode = getAccountCurrencyCode(lookups, toAccountId);
  const fromPrecision = getCurrencyPrecision(lookups, fromCurrencyCode);
  const toPrecision = getCurrencyPrecision(lookups, toCurrencyCode);
  const numericAmount = typeof amount === "number" ? amount : Number(amount);
  const fromAmountMinor =
    Number.isFinite(numericAmount) && numericAmount > 0
      ? majorToMinorUnits(numericAmount, fromPrecision)
      : undefined;
  const isTransfer = kind === "transfer";
  const isCrossCurrency = Boolean(
    isTransfer && fromCurrencyCode && toCurrencyCode && fromCurrencyCode !== toCurrencyCode,
  );

  const rateQuery = useCurrencyRateQuery(
    {
      fromCurrencyCode: fromCurrencyCode ?? "",
      toCurrencyCode: toCurrencyCode ?? "",
      date: postedDate || undefined,
      amount: fromAmountMinor,
    },
    {
      enabled: Boolean(isCrossCurrency && usesMarketRate && postedDate && fromAmountMinor),
    },
  );

  React.useEffect(() => {
    setUsesMarketRate(!isEdit);
  }, [isEdit]);

  React.useEffect(() => {
    if (!isTransfer || !fromCurrencyCode || !toCurrencyCode) return;

    if (fromCurrencyCode === toCurrencyCode) {
      form.setValue("toAmount", amount, { shouldValidate: true });
      return;
    }

    const convertedAmount = rateQuery.data?.convertedAmount;
    if (!usesMarketRate || convertedAmount === undefined) return;

    form.setValue("toAmount", minorToMajorUnits(convertedAmount, toPrecision), {
      shouldValidate: true,
    });
  }, [
    amount,
    form,
    fromCurrencyCode,
    isTransfer,
    rateQuery.data?.convertedAmount,
    toCurrencyCode,
    toPrecision,
    usesMarketRate,
  ]);

  return {
    fromCurrencyCode,
    fromPrecision,
    isCrossCurrency,
    rateQuery,
    setUsesMarketRate,
    toCurrencyCode,
    toPrecision,
    usesMarketRate,
  };
}
