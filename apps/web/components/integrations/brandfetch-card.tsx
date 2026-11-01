"use client";

import { Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Integration } from "@luraba/contracts";
import { formatDate } from "@luraba/domain";
import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { BrandfetchForm } from "@/components/integrations/brandfetch-form";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import { SectionCard, SectionRow } from "@/components/section/section-card";
import { Badge } from "@/components/ui/badge";
import { Modal, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Typography } from "@/components/ui/typography";
import {
  INTEGRATION_PROVIDER_INFO,
  INTEGRATION_STATUS_BADGE_CLASSES,
  INTEGRATION_STATUS_LABELS,
} from "@/lib/integrations";
import { useDeleteBrandfetchIntegrationMutation } from "@/mutations/integrations/use-integration-mutations";
import { integrationQueryKeys } from "@/queries/integrations/use-integrations-query";

/** The Brandfetch section: what it does, its status, and a form to connect, replace or remove it. */
export function BrandfetchCard({ integration }: { integration: Integration }) {
  const client = useQueryClient();
  const info = INTEGRATION_PROVIDER_INFO.brandfetch;
  const connected = integration.status === "connected";
  const [replacing, setReplacing] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const remove = useDeleteBrandfetchIntegrationMutation({
    onSuccess: async () => {
      setRemoving(false);
      toast.success("Brandfetch removed");
      await client.invalidateQueries({ queryKey: integrationQueryKeys.all });
    },
  });

  return (
    <>
      <SectionCard
        title={info.label}
        description={info.summary}
        actions={
          <Badge variant="outline" className={INTEGRATION_STATUS_BADGE_CLASSES[integration.status]}>
            {INTEGRATION_STATUS_LABELS[integration.status]}
          </Badge>
        }
      >
        {connected && !replacing ? (
          <SectionRow
            title="Client ID"
            description={
              integration.lastCheckedAt
                ? `Saved and verified on ${formatDate(integration.lastCheckedAt)}. It is hidden for your security.`
                : "Saved. It is hidden for your security."
            }
          >
            <PermissionButton
              permission={PERMISSIONS.INTEGRATIONS_UPDATE}
              deniedMessage="Your household role cannot change integrations."
              variant="outline"
              size="sm"
              onClick={() => setReplacing(true)}
            >
              Replace
            </PermissionButton>
            <PermissionButton
              permission={PERMISSIONS.INTEGRATIONS_DELETE}
              deniedMessage="Your household role cannot remove integrations."
              variant="ghost"
              size="sm"
              onClick={() => setRemoving(true)}
            >
              <HugeiconsIcon icon={Delete02Icon} className="text-destructive" strokeWidth={2} />
              Remove
            </PermissionButton>
          </SectionRow>
        ) : (
          <div className="space-y-4">
            <Typography variant="small-muted">{info.help}</Typography>
            <BrandfetchForm
              connected={connected}
              onDone={connected ? () => setReplacing(false) : undefined}
            />
          </div>
        )}
      </SectionCard>
      <Modal open={removing} onOpenChange={setRemoving}>
        <ModalContent
          variant="destructive"
          title="Remove Brandfetch?"
          description="Merchant logos stop loading from Brandfetch. Your merchants and transactions are not changed."
          isLoading={remove.isPending}
          size="sm"
        >
          <ModalFooter
            cancelLabel="Cancel"
            confirmLabel="Remove"
            confirmVariant="destructive"
            isLoading={remove.isPending}
            loadingLabel="Removing..."
            onConfirm={() => remove.mutate()}
          />
        </ModalContent>
      </Modal>
    </>
  );
}
