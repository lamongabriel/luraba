"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import type { AccountDetails } from "@luraba/contracts"
import * as React from "react"
import { useForm, useWatch } from "react-hook-form"
import { ACCOUNT_TYPE_OPTIONS } from "@/lib/accounts"
import { queryClient } from "@/lib/query-client"
import {
  useCreateAccountMutation,
  useUpdateAccountMutation,
} from "@/mutations/accounts/use-account-mutations"
import { accountQueryKeys } from "@/queries/accounts/use-accounts-query"
import { useCurrenciesQuery } from "@/queries/currencies/use-currencies-query"

import {
  type CreateEditAccountFormValues,
  createEditAccountFormSchema,
} from "./create-edit-account-form.schema"
import {
  buildCreateAccountPayload,
  buildUpdateAccountPayload,
  getCreateEditAccountDefaultValues,
} from "./create-edit-account-form.utils"

export function useCreateEditAccountForm({
  account,
  defaultCurrencyCode,
  onSuccess,
}: {
  account?: AccountDetails
  defaultCurrencyCode: string
  onSuccess: () => void
}) {
  const currenciesQuery = useCurrenciesQuery()
  const precision =
    currenciesQuery.data?.data.find(
      (item) => item.code === (account?.currencyCode ?? defaultCurrencyCode),
    )?.precision ?? 2
  const isEdit = Boolean(account)
  const accountType = account?.type ?? "cash"
  const form = useForm<CreateEditAccountFormValues>({
    defaultValues: getCreateEditAccountDefaultValues(
      defaultCurrencyCode,
      accountType,
      account,
      precision,
    ),
    resolver: zodResolver(createEditAccountFormSchema),
  })
  const type = useWatch({ control: form.control, name: "type" })
  const previousType = React.useRef(type)
  const typeOptions = ACCOUNT_TYPE_OPTIONS

  const finish = async () => {
    await queryClient.invalidateQueries({ queryKey: accountQueryKeys.all })
    if (!isEdit) {
      form.reset(getCreateEditAccountDefaultValues(defaultCurrencyCode))
    }
    onSuccess()
  }
  const createAccountMutation = useCreateAccountMutation({ onSuccess: finish })
  const updateAccountMutation = useUpdateAccountMutation({ onSuccess: finish })
  const isPending =
    createAccountMutation.isPending || updateAccountMutation.isPending

  React.useEffect(() => {
    if (!account) return

    form.reset(
      getCreateEditAccountDefaultValues(
        defaultCurrencyCode,
        accountType,
        account,
        precision,
      ),
    )
    previousType.current = accountType
  }, [account, accountType, defaultCurrencyCode, form, precision])

  React.useEffect(() => {
    if (isEdit) return
    if (previousType.current === type) return

    const current = form.getValues()
    form.reset({
      ...getCreateEditAccountDefaultValues(
        current.currencyCode || defaultCurrencyCode,
        type,
      ),
      name: current.name,
      institutionName: current.institutionName,
      institutionDomain: current.institutionDomain,
      notes: current.notes,
    })
    previousType.current = type
  }, [defaultCurrencyCode, form, isEdit, type])

  const onSubmit = form.handleSubmit((values) => {
    createAccountMutation.reset()
    updateAccountMutation.reset()

    const currency = currenciesQuery.data?.data.find(
      (item) => item.code === values.currencyCode,
    )
    const precision = currency?.precision ?? 2

    if (isEdit && account) {
      updateAccountMutation.mutate({
        id: account.id,
        body: buildUpdateAccountPayload(values, precision),
      })
      return
    }

    createAccountMutation.mutate(buildCreateAccountPayload(values, precision))
  })

  return {
    currenciesQuery,
    errorMessage:
      createAccountMutation.errorMessage || updateAccountMutation.errorMessage,
    form,
    isEdit,
    isPending,
    onSubmit,
    type,
    typeOptions,
  }
}
