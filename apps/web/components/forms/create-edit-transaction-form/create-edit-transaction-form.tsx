"use client";

import { SaveMoneyDollarIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { TransactionFeedRow } from "@luraba/contracts";
import { useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import type { TransactionLookups } from "@/queries/transactions/use-transaction-lookups-query";
import type { TransactionFormDetails } from "./create-edit-transaction-form.utils";
import { CommonSection } from "./sections/common-section";
import { CreditCardPaymentSection } from "./sections/credit-card-payment-section";
import { CreditCardPurchaseSection } from "./sections/credit-card-purchase-section";
import { ExpenseIncomeSection } from "./sections/expense-income-section";
import { SettingsSection } from "./sections/settings-section";
import { TransferSection } from "./sections/transfer-section";
import { useCreateEditTransactionForm } from "./use-create-edit-transaction-form";

export function CreateEditTransactionForm({
  details,
  lookups,
  onCancel,
  onSuccess,
  row,
}: {
  details?: TransactionFormDetails;
  lookups: TransactionLookups;
  onCancel?: () => void;
  onSuccess: () => void;
  row?: TransactionFeedRow | null;
}) {
  const {
    errorMessage,
    form,
    fromCurrencyCode,
    isCrossCurrency,
    isEdit,
    isPending,
    kind,
    onSubmit,
    rateQuery,
    setUsesMarketRate,
    toCurrencyCode,
    usesMarketRate,
  } = useCreateEditTransactionForm({ details, lookups, onSuccess, row });
  const selectedAccountId = useWatch({
    control: form.control,
    name: "accountId",
  });
  const selectedCardId = useWatch({
    control: form.control,
    name: "creditCardId",
  });
  const selectedAccount = lookups.accounts.find((account) => account.id === selectedAccountId);
  const selectedCard = lookups.creditCards.find((card) => card.id === selectedCardId);
  const nonCardAccounts = lookups.accounts.filter((account) => account.type !== "credit_card");
  const paymentSourceAccounts = nonCardAccounts.filter(
    (account) =>
      account.classification === "asset" &&
      (!selectedCard || account.currencyCode === selectedCard.currencyCode),
  );
  const paymentMethods = lookups.paymentMethods.filter(
    (method) =>
      method.code !== "credit_card" &&
      (!method.currencyCode ||
        !selectedAccount ||
        method.currencyCode === selectedAccount.currencyCode),
  );

  return (
    <form className="space-y-7" onSubmit={onSubmit} noValidate>
      <CommonSection
        control={form.control}
        isEdit={isEdit}
        paymentDateLabel={kind === "credit_card_payment"}
      />

      {kind === "expense" || kind === "income" ? (
        <ExpenseIncomeSection
          accounts={nonCardAccounts}
          control={form.control}
          kind={kind}
          merchants={lookups.merchants}
          paymentMethods={paymentMethods}
        />
      ) : null}

      {kind === "transfer" ? (
        <TransferSection
          accounts={nonCardAccounts}
          control={form.control}
          fromCurrencyCode={fromCurrencyCode}
          isCrossCurrency={isCrossCurrency}
          isRateError={rateQuery.isError}
          isRateFetching={rateQuery.isFetching}
          onUseCustomAmount={() => setUsesMarketRate(false)}
          onUseMarketRate={() => setUsesMarketRate(true)}
          rate={rateQuery.data}
          toCurrencyCode={toCurrencyCode}
          usesMarketRate={usesMarketRate}
        />
      ) : null}

      {kind === "credit_card_purchase" ? (
        <CreditCardPurchaseSection
          cards={lookups.creditCards}
          control={form.control}
          isEdit={isEdit}
          merchants={lookups.merchants}
        />
      ) : null}

      {kind === "credit_card_payment" ? (
        <CreditCardPaymentSection
          accounts={paymentSourceAccounts}
          cards={lookups.creditCards}
          control={form.control}
          isEdit={isEdit}
        />
      ) : null}

      <SettingsSection
        control={form.control}
        showBudget={kind !== "credit_card_payment"}
        showTags={kind !== "credit_card_payment"}
      />

      {errorMessage ? (
        <div className="rounded-xl bg-destructive/10 px-3 py-3">
          <Typography variant="small-destructive">{errorMessage}</Typography>
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2 border-t border-border/70 pt-5">
        {onCancel ? (
          <Button type="button" variant="outline" disabled={isPending} onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" isLoading={isPending} loadingText="Saving...">
          <HugeiconsIcon icon={SaveMoneyDollarIcon} strokeWidth={2} />
          {isEdit ? "Save changes" : "Create transaction"}
        </Button>
      </div>
    </form>
  );
}
