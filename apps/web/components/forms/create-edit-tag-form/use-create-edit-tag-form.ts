"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Tag } from "@luraba/contracts";
import { useForm } from "react-hook-form";
import { queryClient } from "@/lib/query-client";
import { DEFAULT_TAG_COLOR, DEFAULT_TAG_ICON } from "@/lib/tags";
import { useCreateTagMutation, useUpdateTagMutation } from "@/mutations/tags/use-tag-mutations";
import { tagQueryKeys } from "@/queries/tags/use-tags-query";

import {
  type CreateEditTagFormValues,
  createEditTagFormSchema,
} from "./create-edit-tag-form.schema";

function getDefaultValues(tag?: Tag): CreateEditTagFormValues {
  return {
    name: tag?.name ?? "",
    color: tag?.color ?? DEFAULT_TAG_COLOR,
    icon: tag?.icon ?? DEFAULT_TAG_ICON,
  };
}

export function useCreateEditTagForm({ tag, onSuccess }: { tag?: Tag; onSuccess: () => void }) {
  const isEdit = Boolean(tag);
  const form = useForm<CreateEditTagFormValues>({
    defaultValues: getDefaultValues(tag),
    resolver: zodResolver(createEditTagFormSchema),
  });

  const createMutation = useCreateTagMutation({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tagQueryKeys.lists() });
      form.reset(getDefaultValues());
      onSuccess();
    },
  });

  const updateMutation = useUpdateTagMutation({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tagQueryKeys.lists() });
      onSuccess();
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const errorMessage = createMutation.errorMessage || updateMutation.errorMessage;

  const onSubmit = form.handleSubmit((values) => {
    if (isEdit && tag) {
      updateMutation.reset();
      updateMutation.mutate({
        id: tag.id,
        body: {
          name: values.name.trim(),
          color: values.color,
          icon: values.icon,
        },
      });
      return;
    }

    createMutation.reset();
    createMutation.mutate({
      name: values.name.trim(),
      color: values.color,
      icon: values.icon,
    });
  });

  return {
    form,
    onSubmit,
    isEdit,
    isPending,
    errorMessage,
  };
}
