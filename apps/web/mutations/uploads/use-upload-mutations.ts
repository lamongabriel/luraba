"use client";

import { useQueryClient } from "@tanstack/react-query";

import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation";
import { uploadQueryKeys } from "@/queries/uploads/use-uploads-query";
import {
  createAttachment,
  deleteAttachment,
  deleteUpload,
  type UploadScope,
  uploadFile,
} from "@/services/uploads.service";

type UploadFileVariables = { file: File | Blob; scope: UploadScope; filename?: string };
type UploadFileResponse = Awaited<ReturnType<typeof uploadFile>>;
type CreateAttachmentVariables = Parameters<typeof createAttachment>[0];
type CreateAttachmentResponse = Awaited<ReturnType<typeof createAttachment>>;

export const uploadFileMutationDefinition = createAppMutationDefinition<
  UploadFileResponse,
  UploadFileVariables
>({
  defaultErrorMessage: "We couldn't upload this file. Please try again.",
  mutationFn: ({ file, scope, filename }) => uploadFile(file, scope, filename),
  mutationKey: ["uploads", "create"],
});

/** Every upload mutation refreshes the library, usage and attachment lists together. */
function useRefreshUploads() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: uploadQueryKeys.all });
}

export function useUploadFileMutation<TContext = unknown>(
  options?: UseAppMutationOptions<UploadFileResponse, UploadFileVariables, TContext>,
) {
  const refresh = useRefreshUploads();
  return useAppMutation(uploadFileMutationDefinition, {
    ...options,
    onSuccess: async (...args) => {
      await refresh();
      return options?.onSuccess?.(...args);
    },
  });
}

export const createAttachmentMutationDefinition = createAppMutationDefinition<
  CreateAttachmentResponse,
  CreateAttachmentVariables
>({
  defaultErrorMessage: "We couldn't attach this file. Please try again.",
  mutationFn: createAttachment,
  mutationKey: ["attachments", "create"],
});

export function useCreateAttachmentMutation<TContext = unknown>(
  options?: UseAppMutationOptions<CreateAttachmentResponse, CreateAttachmentVariables, TContext>,
) {
  const refresh = useRefreshUploads();
  return useAppMutation(createAttachmentMutationDefinition, {
    ...options,
    onSuccess: async (...args) => {
      await refresh();
      return options?.onSuccess?.(...args);
    },
  });
}

export const deleteAttachmentMutationDefinition = createAppMutationDefinition<void, string>({
  defaultErrorMessage: "We couldn't remove this file. Please try again.",
  mutationFn: (id) => deleteAttachment(id),
  mutationKey: ["attachments", "delete"],
});

export function useDeleteAttachmentMutation<TContext = unknown>(
  options?: UseAppMutationOptions<void, string, TContext>,
) {
  const refresh = useRefreshUploads();
  return useAppMutation(deleteAttachmentMutationDefinition, {
    ...options,
    onSuccess: async (...args) => {
      await refresh();
      return options?.onSuccess?.(...args);
    },
  });
}

export const deleteUploadMutationDefinition = createAppMutationDefinition<
  void,
  { id: string; force?: boolean }
>({
  defaultErrorMessage: "We couldn't delete this file. Please try again.",
  mutationFn: ({ id, force }) => deleteUpload(id, force),
  mutationKey: ["uploads", "delete"],
});

export function useDeleteUploadMutation<TContext = unknown>(
  options?: UseAppMutationOptions<void, { id: string; force?: boolean }, TContext>,
) {
  const refresh = useRefreshUploads();
  return useAppMutation(deleteUploadMutationDefinition, {
    ...options,
    onSuccess: async (...args) => {
      await refresh();
      return options?.onSuccess?.(...args);
    },
  });
}
