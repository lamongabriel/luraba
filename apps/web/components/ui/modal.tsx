"use client";

/**
 * Modal system - built on top of the existing Dialog primitives.
 *
 * Exports:
 *   Modal            - root (Dialog wrapper)
 *   ModalTrigger     - trigger
 *   ModalClose       - close
 *   ModalContent     - opinionated content shell (icon, header, body, footer)
 *   ModalHeader      - title + description area
 *   ModalBody        - content area
 *   ModalFooter      - footer with built-in cancel/confirm slots
 *   ModalTitle       - title
 *   ModalDescription - subtitle / description
 *   ModalIcon        - coloured icon container
 *
 * Usage:
 *
 *   <Modal open={open} onOpenChange={setOpen}>
 *     <ModalContent
 *       icon={<HugeiconsIcon icon={Alert02Icon} />}
 *       variant="destructive"
 *       title="Delete category?"
 *       description="This cannot be undone."
 *     >
 *       <ModalBody>…summary…</ModalBody>
 *       <ModalFooter
 *         cancelLabel="Cancel"
 *         confirmLabel="Delete"
 *         confirmVariant="destructive"
 *         onConfirm={handleDelete}
 *         isLoading={isPending}
 *       />
 *     </ModalContent>
 *   </Modal>
 */

import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { VariantProps } from "class-variance-authority";
import { Dialog as DialogPrimitive } from "radix-ui";
import type * as React from "react";

import { Button, type buttonVariants } from "@/components/ui/button";
import {
  DialogClose,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type ModalVariant = "default" | "destructive" | "warning" | "success";

// ── Root / Trigger / Close ───────────────────────────────────────────────────

function Modal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="modal" {...props} />;
}

function ModalTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="modal-trigger" {...props} />;
}

function ModalClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="modal-close" {...props} />;
}

// ── Icon container (coloured background + icon in the header) ─────────────────

const ICON_VARIANT_CLASSES: Record<ModalVariant, string> = {
  default: "bg-muted/60 text-muted-foreground",
  destructive: "bg-destructive/10 text-destructive",
  warning: "bg-amber-500/10 text-amber-500",
  success: "bg-emerald-500/10 text-emerald-500",
};

interface ModalIconProps {
  children: React.ReactNode;
  variant?: ModalVariant;
  className?: string;
}

function ModalIcon({ children, variant = "default", className }: ModalIconProps) {
  return (
    <div
      data-slot="modal-icon"
      className={cn(
        "flex size-9 items-center justify-center rounded-lg [&>svg]:size-4.5",
        ICON_VARIANT_CLASSES[variant],
        className,
      )}
    >
      {children}
    </div>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────────

function ModalHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="modal-header"
      className={cn(
        "flex flex-col gap-1.5 border-b border-dashed border-border px-6 py-5 pr-12",
        className,
      )}
      {...props}
    />
  );
}

function ModalTitle({ className, ...props }: React.ComponentProps<typeof DialogTitle>) {
  return <DialogTitle className={cn("text-xl font-medium leading-snug", className)} {...props} />;
}

function ModalDescription({ className, ...props }: React.ComponentProps<typeof DialogDescription>) {
  return (
    <DialogDescription
      className={cn("text-xs/relaxed text-muted-foreground", className)}
      {...props}
    />
  );
}

// ── Body ───────────────────────────────────────────────────────────────────────

function ModalBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="modal-body"
      className={cn("flex flex-col gap-4 px-6 py-5 text-xs/relaxed empty:hidden", className)}
      {...props}
    />
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────────

interface ModalFooterProps extends React.ComponentProps<"div"> {
  /** Label for the cancel/close button. Omit to hide it. */
  cancelLabel?: string;
  /** Label for the primary action button. Omit to hide it. */
  confirmLabel?: string;
  /** Variant for the primary action button. */
  confirmVariant?: VariantProps<typeof buttonVariants>["variant"];
  /** Called when the primary action button is clicked. */
  onConfirm?: () => void;
  /** Disables both buttons (e.g. while submitting). */
  isLoading?: boolean;
  /** Text shown in the confirm button while loading. */
  loadingLabel?: string;
  /** Whether the confirm button is additionally disabled. */
  confirmDisabled?: boolean;
}

function ModalFooter({
  cancelLabel = "Cancel",
  confirmLabel,
  confirmVariant = "default",
  onConfirm,
  isLoading = false,
  loadingLabel,
  confirmDisabled = false,
  className,
  children,
  ...props
}: ModalFooterProps) {
  return (
    <div
      data-slot="modal-footer"
      className={cn(
        "flex flex-col-reverse gap-2 border-t border-border/70 px-6 py-4 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    >
      {children}
      {cancelLabel ? (
        <DialogClose asChild>
          <Button variant="outline" disabled={isLoading}>
            {cancelLabel}
          </Button>
        </DialogClose>
      ) : null}
      {confirmLabel ? (
        <Button
          type={onConfirm ? "button" : "submit"}
          variant={confirmVariant}
          disabled={confirmDisabled}
          isLoading={isLoading}
          loadingText={loadingLabel}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      ) : null}
    </div>
  );
}

// ── Content shell ─────────────────────────────────────────────────────────────

interface ModalContentProps extends React.ComponentProps<typeof DialogPrimitive.Content> {
  /** Optional icon rendered at the top of the header. */
  icon?: React.ReactNode;
  /** Variant that colours the icon background. */
  variant?: ModalVariant;
  /** Shorthand title - equivalent to <ModalTitle> inside <ModalHeader>. */
  title?: string;
  /** Shorthand description - equivalent to <ModalDescription> inside <ModalHeader>. */
  description?: string;
  /** Blocks closing while something is loading. */
  isLoading?: boolean;
  /** Whether to render the top-right close button. */
  showCloseButton?: boolean;
  /** Max width. Defaults to "md". */
  size?: "sm" | "md" | "lg" | "xl";
}

const SIZE_CLASSES: Record<NonNullable<ModalContentProps["size"]>, string> = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-xl",
  xl: "sm:max-w-2xl",
};

function ModalContent({
  icon,
  variant = "default",
  title,
  description,
  isLoading = false,
  showCloseButton = true,
  size = "md",
  className,
  children,
  ...props
}: ModalContentProps) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="modal-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border/70 bg-[var(--color-container)] text-xs/relaxed text-foreground shadow-none outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          SIZE_CLASSES[size],
          className,
        )}
        onEscapeKeyDown={isLoading ? (event) => event.preventDefault() : undefined}
        onInteractOutside={isLoading ? (event) => event.preventDefault() : undefined}
        {...props}
      >
        {showCloseButton ? (
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-3 right-3"
              disabled={isLoading}
            >
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
              <span className="sr-only">Close</span>
            </Button>
          </DialogClose>
        ) : null}

        <div className="flex flex-col">
          {icon || title || description ? (
            <ModalHeader>
              {icon ? <ModalIcon variant={variant}>{icon}</ModalIcon> : null}
              {title ? <ModalTitle>{title}</ModalTitle> : null}
              {description ? <ModalDescription>{description}</ModalDescription> : null}
            </ModalHeader>
          ) : null}
          {children}
        </div>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

export {
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalIcon,
  ModalTitle,
  ModalTrigger,
};
