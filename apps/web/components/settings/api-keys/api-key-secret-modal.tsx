"use client";

import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { CreatedApiKey } from "@luraba/contracts";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Modal, ModalBody, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Typography } from "@/components/ui/typography";

/**
 * Shows the secret of a freshly created key. It is the only time the secret is visible, so the
 * modal cannot be dismissed by clicking outside; the user closes it with the explicit button.
 */
export function ApiKeySecretModal({
  created,
  onClose,
}: {
  created: CreatedApiKey | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (created) setCopied(false);
  }, [created]);

  async function copy() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.secret);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Modal open={created !== null} onOpenChange={() => undefined}>
      <ModalContent
        title="Copy your API key"
        description="You will not see this key again. Store it somewhere safe, like a password manager."
        size="md"
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <ModalBody className="space-y-3">
          <Typography variant="small-strong">{created?.name}</Typography>
          <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/40 p-3">
            <code
              className="min-w-0 flex-1 break-all font-mono text-sm"
              data-testid="api-key-secret"
            >
              {created?.secret}
            </code>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Copy API key"
              onClick={() => void copy()}
            >
              <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} strokeWidth={2} />
            </Button>
          </div>
        </ModalBody>
        <ModalFooter cancelLabel="" confirmLabel="I have copied it" onConfirm={onClose} />
      </ModalContent>
    </Modal>
  );
}
