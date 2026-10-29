"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createAppMutationDefinition, useAppMutation } from "@/mutations/app-mutation";
import { importQueryKeys } from "@/queries/imports/use-imports-query";
import { downloadExport } from "@/services/exports.service";
import {
  deleteImport,
  saveImportMapping,
  startImport,
  updateImport,
  updateImportRows,
  uploadImport,
} from "@/services/imports.service";

/** Every import mutation refreshes the batch, its rows, groups and the history list. */
function useRefreshImports() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: importQueryKeys.all });
}

type UploadVariables = { file: File; parserId?: string };
const uploadDefinition = createAppMutationDefinition({
  defaultErrorMessage: "We couldn't read this file. Check that it is a supported statement.",
  mutationFn: ({ file, parserId }: UploadVariables) => uploadImport(file, parserId),
  mutationKey: ["imports", "upload"],
});
export function useUploadImportMutation() {
  const refresh = useRefreshImports();
  return useAppMutation(uploadDefinition, { onSuccess: refresh });
}

const updateDefinition = createAppMutationDefinition({
  defaultErrorMessage: "We couldn't update this import. Please try again.",
  mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateImport>[1] }) =>
    updateImport(id, body),
  mutationKey: ["imports", "update"],
});
export function useUpdateImportMutation() {
  const refresh = useRefreshImports();
  return useAppMutation(updateDefinition, { onSuccess: refresh });
}

const updateRowsDefinition = createAppMutationDefinition({
  defaultErrorMessage: "We couldn't update these rows. Please try again.",
  mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateImportRows>[1] }) =>
    updateImportRows(id, body),
  mutationKey: ["imports", "update-rows"],
});
export function useUpdateImportRowsMutation() {
  const refresh = useRefreshImports();
  return useAppMutation(updateRowsDefinition, { onSuccess: refresh });
}

const saveMappingDefinition = createAppMutationDefinition({
  defaultErrorMessage: "We couldn't save this mapping. Please try again.",
  mutationFn: ({ id, body }: { id: string; body: Parameters<typeof saveImportMapping>[1] }) =>
    saveImportMapping(id, body),
  mutationKey: ["imports", "save-mapping"],
});
export function useSaveImportMappingMutation() {
  const refresh = useRefreshImports();
  return useAppMutation(saveMappingDefinition, { onSuccess: refresh });
}

const startDefinition = createAppMutationDefinition({
  defaultErrorMessage: "We couldn't start this import.",
  mutationFn: ({ id, body }: { id: string; body?: Parameters<typeof startImport>[1] }) =>
    startImport(id, body),
  mutationKey: ["imports", "start"],
});
export function useStartImportMutation() {
  const refresh = useRefreshImports();
  return useAppMutation(startDefinition, { onSuccess: refresh });
}

const deleteDefinition = createAppMutationDefinition<void, string>({
  defaultErrorMessage: "We couldn't remove this import.",
  mutationFn: deleteImport,
  mutationKey: ["imports", "delete"],
});
export function useDeleteImportMutation() {
  const refresh = useRefreshImports();
  return useAppMutation(deleteDefinition, { onSuccess: refresh });
}

const exportDefinition = createAppMutationDefinition({
  defaultErrorMessage: "We couldn't build this export. Please try again.",
  mutationFn: ({ id, ...params }: { id: string } & Parameters<typeof downloadExport>[1]) =>
    downloadExport(id, params),
  mutationKey: ["exports", "download"],
});
export function useDownloadExportMutation() {
  return useAppMutation(exportDefinition, {
    onSuccess: (fileName) => toast.success(`Downloaded ${fileName}`),
  });
}
