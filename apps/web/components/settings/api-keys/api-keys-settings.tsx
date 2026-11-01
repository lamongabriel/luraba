"use client";

import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ApiKey, CreatedApiKey } from "@luraba/contracts";
import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { SectionCard } from "@/components/section/section-card";
import { ApiKeySecretModal } from "@/components/settings/api-keys/api-key-secret-modal";
import { ApiKeysEmpty } from "@/components/settings/api-keys/api-keys-empty";
import { ApiKeysError } from "@/components/settings/api-keys/api-keys-error";
import { ApiKeysLoading } from "@/components/settings/api-keys/api-keys-loading";
import { ApiKeysTable } from "@/components/settings/api-keys/api-keys-table";
import { CreateApiKeySheet } from "@/components/settings/api-keys/create-api-key-sheet";
import { DeleteApiKeyModal } from "@/components/settings/api-keys/delete-api-key-modal";
import { DataBoundary } from "@/components/states";
import { Button } from "@/components/ui/button";
import { useDisclosure } from "@/hooks/use-disclosure";
import { useDeleteApiKeyMutation } from "@/mutations/api-keys/use-api-key-mutations";
import { apiKeyQueryKeys, useApiKeysQuery } from "@/queries/api-keys/use-api-keys-query";

/** `/settings/api-keys`: create, label, revoke and delete the keys that act as this user. */
export function ApiKeysSettings() {
  const client = useQueryClient();
  const query = useApiKeysQuery();
  const sheet = useDisclosure();
  const [created, setCreated] = React.useState<CreatedApiKey | null>(null);
  const [deleting, setDeleting] = React.useState<ApiKey | null>(null);
  const remove = useDeleteApiKeyMutation({
    onSuccess: async () => {
      setDeleting(null);
      toast.success("API key deleted");
      await client.invalidateQueries({ queryKey: apiKeyQueryKeys.lists() });
    },
  });
  const keys = query.data ?? [];

  return (
    <>
      <SectionCard
        title="API keys"
        description="Keys let scripts and AI agents use Luraba as you, with your role in each household. Send one as a Bearer token."
        actions={
          <Button size="sm" onClick={sheet.onOpen}>
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} /> Create key
          </Button>
        }
      >
        <DataBoundary
          isPending={query.isPending}
          isError={query.isError}
          isEmpty={keys.length === 0}
          loading={<ApiKeysLoading />}
          errorState={
            <ApiKeysError message={query.error?.message} onRetry={() => void query.refetch()} />
          }
          empty={<ApiKeysEmpty onCreate={sheet.onOpen} />}
        >
          <ApiKeysTable keys={keys} onDelete={setDeleting} />
        </DataBoundary>
      </SectionCard>
      <CreateApiKeySheet
        open={sheet.isOpen}
        onOpenChange={sheet.setIsOpen}
        onCreated={(key) => {
          sheet.onClose();
          setCreated(key);
        }}
      />
      <ApiKeySecretModal created={created} onClose={() => setCreated(null)} />
      <DeleteApiKeyModal
        apiKey={deleting}
        isPending={remove.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={(key) => remove.mutate(key.id)}
      />
    </>
  );
}
