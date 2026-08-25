"use client"

import {
  type UseMutationOptions,
  type UseMutationResult,
  useMutation,
} from "@tanstack/react-query"
import { toast } from "sonner"

import {
  type AppClientError,
  getAppErrorDetails,
  toAppClientError,
} from "@/services/error-client"

type AppMutationTitleResolver<TContext> =
  | string
  | ((context: TContext) => string)
type AppMutationDescriptionResolver<TContext> =
  | string
  | ((context: TContext) => string | undefined)

interface AppMutationToastConfig<TContext> {
  description?: AppMutationDescriptionResolver<TContext>
  title?: AppMutationTitleResolver<TContext>
}

interface AppMutationSuccessToastContext<TData, TVariables> {
  data: TData
  variables: TVariables
}

interface AppMutationErrorToastContext<TVariables> {
  appError: AppClientError
  variables: TVariables
}

type AppMutationToastOverride<TConfig> = boolean | TConfig | null | undefined

export interface AppMutationDefinition<TData, TVariables> {
  defaultErrorMessage: string
  errorToast?: AppMutationToastConfig<AppMutationErrorToastContext<TVariables>>
  mutationFn: (variables: TVariables) => Promise<TData>
  mutationKey?: readonly unknown[]
  successToast?: AppMutationToastConfig<
    AppMutationSuccessToastContext<TData, TVariables>
  >
}

export type UseAppMutationOptions<TData, TVariables, TContext = unknown> = Omit<
  UseMutationOptions<TData, AppClientError, TVariables, TContext>,
  "mutationFn" | "mutationKey"
> & {
  errorToast?: AppMutationToastOverride<
    AppMutationToastConfig<AppMutationErrorToastContext<TVariables>>
  >
  fallbackMessage?: string
  successToast?: AppMutationToastOverride<
    AppMutationToastConfig<AppMutationSuccessToastContext<TData, TVariables>>
  >
}

export type AppMutationResult<
  TData,
  TVariables,
  TContext = unknown,
> = UseMutationResult<TData, AppClientError, TVariables, TContext> & {
  appError: AppClientError | null
  errorMessage: string
}

function resolveToastConfig<TConfig>(
  override: AppMutationToastOverride<TConfig>,
  defaultConfig?: TConfig,
) {
  if (!override) {
    return null
  }

  if (override === true) {
    return defaultConfig ?? null
  }

  return override
}

function resolveToastValue<TContext>(
  value:
    | AppMutationTitleResolver<TContext>
    | AppMutationDescriptionResolver<TContext>
    | undefined,
  context: TContext,
) {
  if (typeof value === "function") {
    return value(context)
  }

  return value
}

function showSuccessToast<TData, TVariables>(
  config: AppMutationToastConfig<
    AppMutationSuccessToastContext<TData, TVariables>
  >,
  context: AppMutationSuccessToastContext<TData, TVariables>,
) {
  const title = resolveToastValue(config.title, context)
  const description = resolveToastValue(config.description, context)

  if (!title && !description) {
    return
  }

  toast.success(title ?? "Success", {
    description,
  })
}

function showErrorToast<TVariables>(
  config: AppMutationToastConfig<AppMutationErrorToastContext<TVariables>>,
  context: AppMutationErrorToastContext<TVariables>,
) {
  const title =
    resolveToastValue(config.title, context) ?? context.appError.message
  const description = resolveToastValue(config.description, context)

  if (!title && !description) {
    return
  }

  toast.error(title ?? "Something went wrong", {
    description,
  })
}

export function createAppMutationDefinition<TData, TVariables>(
  definition: AppMutationDefinition<TData, TVariables>,
) {
  return definition
}

export function useAppMutation<TData, TVariables, TContext = unknown>(
  definition: AppMutationDefinition<TData, TVariables>,
  options?: UseAppMutationOptions<TData, TVariables, TContext>,
): AppMutationResult<TData, TVariables, TContext> {
  const {
    errorToast,
    fallbackMessage,
    onError,
    onSuccess,
    successToast,
    ...mutationOptions
  } = options ?? {}

  const resolvedFallbackMessage =
    fallbackMessage ?? definition.defaultErrorMessage

  const mutation = useMutation<TData, AppClientError, TVariables, TContext>({
    ...mutationOptions,
    mutationFn: async (variables) => {
      try {
        return await definition.mutationFn(variables)
      } catch (error) {
        throw toAppClientError(error)
      }
    },
    mutationKey: definition.mutationKey,
    onError: (error, variables, context, mutationContext) => {
      const toastConfig = resolveToastConfig(errorToast, definition.errorToast)

      if (toastConfig) {
        showErrorToast(toastConfig, {
          appError: error,
          variables,
        })
      }

      return onError?.(error, variables, context, mutationContext)
    },
    onSuccess: (data, variables, context, mutationContext) => {
      const toastConfig = resolveToastConfig(
        successToast,
        definition.successToast,
      )

      if (toastConfig) {
        showSuccessToast(toastConfig, {
          data,
          variables,
        })
      }

      return onSuccess?.(data, variables, context, mutationContext)
    },
  })

  const { appError, errorMessage } = mutation.error
    ? getAppErrorDetails(mutation.error, resolvedFallbackMessage)
    : {
        appError: null,
        errorMessage: "",
      }

  return {
    ...mutation,
    appError,
    errorMessage,
  }
}
