"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import * as React from "react"
import { useForm } from "react-hook-form"
import type { Category, CategoryType } from "@/interfaces/category"
import { DEFAULT_CATEGORY_COLOR, DEFAULT_CATEGORY_ICON } from "@/lib/categories"
import { queryClient } from "@/lib/query-client"
import {
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
} from "@/mutations/categories/use-category-mutations"
import { categoryQueryKeys } from "@/queries/categories/use-categories-query"

import {
  type CreateEditCategoryFormValues,
  createEditCategoryFormSchema,
} from "./create-edit-category-form.schema"

function getDefaultValues(category?: Category): CreateEditCategoryFormValues {
  return {
    name: category?.name ?? "",
    type: category?.type ?? "expense",
    parentId: category?.parentId ?? "",
    color: category?.color ?? DEFAULT_CATEGORY_COLOR,
    icon: category?.icon ?? DEFAULT_CATEGORY_ICON,
  }
}

export function useCreateEditCategoryForm({
  category,
  onSuccess,
}: {
  category?: Category
  onSuccess: () => void
}) {
  const isEdit = Boolean(category)
  const form = useForm<CreateEditCategoryFormValues>({
    defaultValues: getDefaultValues(category),
    resolver: zodResolver(createEditCategoryFormSchema),
  })

  const type = form.watch("type") as CategoryType
  const parentId = form.watch("parentId")

  const createMutation = useCreateCategoryMutation({
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: categoryQueryKeys.lists(),
      })
      form.reset(getDefaultValues())
      onSuccess()
    },
  })

  const updateMutation = useUpdateCategoryMutation({
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: categoryQueryKeys.lists(),
      })
      onSuccess()
    },
  })

  const isPending = createMutation.isPending || updateMutation.isPending
  const errorMessage =
    createMutation.errorMessage || updateMutation.errorMessage

  // When the type changes, clear a parent that no longer matches the new type.
  const previousTypeRef = React.useRef(type)
  React.useEffect(() => {
    if (previousTypeRef.current !== type) {
      previousTypeRef.current = type
      if (parentId) {
        form.setValue("parentId", "")
      }
    }
  }, [type, parentId, form])

  const onSubmit = form.handleSubmit((values) => {
    const trimmedParent = values.parentId.trim()

    if (isEdit && category) {
      updateMutation.reset()
      updateMutation.mutate({
        id: category.id,
        body: {
          name: values.name.trim(),
          type: values.type,
          color: values.color,
          icon: values.icon,
          parentId: trimmedParent ? trimmedParent : null,
        },
      })
      return
    }

    createMutation.reset()
    createMutation.mutate({
      name: values.name.trim(),
      type: values.type,
      color: values.color,
      icon: values.icon,
      parentId: trimmedParent || undefined,
    })
  })

  return {
    form,
    onSubmit,
    isEdit,
    isPending,
    errorMessage,
  }
}
