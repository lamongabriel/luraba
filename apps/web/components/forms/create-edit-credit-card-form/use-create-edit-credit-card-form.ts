"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import * as React from "react"
import { useForm, useWatch } from "react-hook-form"
import { MAX_PER_PAGE } from "@/interfaces/api"
import type { CreditCard } from "@/interfaces/credit-card"
import { queryClient } from "@/lib/query-client"
import {
  useCreateCreditCardMutation,
  useUpdateCreditCardMutation,
} from "@/mutations/credit-cards/use-credit-card-mutations"
import {
  accountQueryKeys,
  useAccountsQuery,
} from "@/queries/accounts/use-accounts-query"
import { creditCardQueryKeys } from "@/queries/credit-cards/use-credit-cards-query"
import { useCurrenciesQuery } from "@/queries/currencies/use-currencies-query"

import {
  type CreateEditCreditCardFormValues,
  createEditCreditCardFormSchema,
} from "./create-edit-credit-card-form.schema"
import {
  buildCreateCreditCardPayload,
  buildUpdateCreditCardPayload,
  getCreateEditCreditCardDefaultValues,
} from "./create-edit-credit-card-form.utils"

export function useCreateEditCreditCardForm({
  card,
  defaultCurrencyCode,
  onSuccess,
}: {
  card?: CreditCard
  defaultCurrencyCode: string
  onSuccess: () => void
}) {
  const isEdit = Boolean(card)
  const accountsQuery = useAccountsQuery({
    types: ["cash"],
    perPage: MAX_PER_PAGE,
    sort: "name",
    sortDirection: "asc",
  })
  const currenciesQuery = useCurrenciesQuery({ perPage: MAX_PER_PAGE })
  const precision =
    currenciesQuery.data?.data.find(
      (currency) =>
        currency.code === (card?.currencyCode ?? defaultCurrencyCode),
    )?.precision ?? 2
  const form = useForm<CreateEditCreditCardFormValues>({
    defaultValues: getCreateEditCreditCardDefaultValues(
      defaultCurrencyCode,
      card,
      precision,
    ),
    resolver: zodResolver(createEditCreditCardFormSchema),
  })
  const ownerAccountId = useWatch({
    control: form.control,
    name: "ownerAccountId",
  })
  const selectedOwner = accountsQuery.data?.data.find(
    (account) => account.id === ownerAccountId,
  )

  const finish = async () => {
    await queryClient.invalidateQueries({ queryKey: creditCardQueryKeys.all })
    await queryClient.invalidateQueries({ queryKey: accountQueryKeys.all })
    if (!isEdit) {
      form.reset(
        getCreateEditCreditCardDefaultValues(
          defaultCurrencyCode,
          undefined,
          precision,
        ),
      )
    }
    onSuccess()
  }
  const createMutation = useCreateCreditCardMutation({ onSuccess: finish })
  const updateMutation = useUpdateCreditCardMutation({ onSuccess: finish })

  React.useEffect(() => {
    if (selectedOwner && !isEdit) {
      form.setValue("currencyCode", selectedOwner.currencyCode, {
        shouldValidate: true,
      })
    }
  }, [form, isEdit, selectedOwner])

  React.useEffect(() => {
    form.reset(
      getCreateEditCreditCardDefaultValues(
        defaultCurrencyCode,
        card,
        precision,
      ),
    )
  }, [card, defaultCurrencyCode, form, precision])

  const onSubmit = form.handleSubmit((values) => {
    createMutation.reset()
    updateMutation.reset()

    if (isEdit && card) {
      updateMutation.mutate({
        creditCardId: card.id,
        body: buildUpdateCreditCardPayload(values, precision),
      })
      return
    }

    createMutation.mutate(buildCreateCreditCardPayload(values, precision))
  })

  return {
    accountsQuery,
    currenciesQuery,
    errorMessage: createMutation.errorMessage || updateMutation.errorMessage,
    form,
    isEdit,
    isPending: createMutation.isPending || updateMutation.isPending,
    onSubmit,
    selectedOwner,
  }
}
