"use client";

import { Alert02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import * as React from "react";

import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  type ModalVariant,
} from "@/components/ui/modal";
import { Typography } from "@/components/ui/typography";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Extra content under the description (what is being confirmed, e.g. a row's name). */
  children?: React.ReactNode;
  confirmLabel: string;
  loadingLabel?: string;
  cancelLabel?: string;
  variant?: ModalVariant;
  icon?: React.ReactNode;
  isLoading?: boolean;
  /** Shown in a red box when the confirmed action failed. */
  errorMessage?: string;
  onConfirm: () => void;
}

/**
 * The one confirmation dialog (delete a record, discard a receipt, ...). Cancel only closes this
 * dialog, never the sheet underneath. While it animates out it keeps the text it was opened with,
 * so a parent that clears its selection on close does not make it shrink or flash.
 */
export function ConfirmDialog(props: ConfirmDialogProps) {
  const { open, onOpenChange, variant = "destructive", isLoading = false } = props;
  const frozen = React.useRef(props);
  if (open) frozen.current = props;
  const view = open ? props : frozen.current;

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        variant={variant}
        icon={view.icon ?? <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />}
        title={view.title}
        description={view.description}
        isLoading={isLoading}
        size="sm"
      >
        <ModalBody>
          {view.children}
          {view.errorMessage ? (
            <div className="rounded-lg bg-destructive/10 px-3 py-2.5">
              <Typography variant="small-destructive">{view.errorMessage}</Typography>
            </div>
          ) : null}
        </ModalBody>
        <ModalFooter
          cancelLabel={view.cancelLabel}
          confirmLabel={view.confirmLabel}
          confirmVariant={variant === "destructive" ? "destructive" : "default"}
          loadingLabel={view.loadingLabel}
          isLoading={isLoading}
          onConfirm={view.onConfirm}
        />
      </ModalContent>
    </Modal>
  );
}
