import type * as React from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

function ErrorStateRoot({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="alert"
      className={cn("rounded-xl bg-destructive/10 px-5 py-5", className)}
      {...props}
    />
  );
}

function ErrorStateTitle({ className, ...props }: React.ComponentProps<typeof Typography>) {
  return (
    <Typography variant="small-strong" className={cn("text-foreground", className)} {...props} />
  );
}

function ErrorStateDescription({ className, ...props }: React.ComponentProps<typeof Typography>) {
  return <Typography variant="small-muted" className={cn("mt-1", className)} {...props} />;
}

function ErrorStateAction({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mt-3", className)} {...props} />;
}

interface ErrorStateProps extends Omit<React.ComponentProps<typeof ErrorStateRoot>, "title"> {
  action?: React.ReactNode;
  description?: React.ReactNode;
  retryButtonProps?: Omit<ButtonProps, "children" | "onClick">;
  retryLabel?: React.ReactNode;
  title: React.ReactNode;
  onRetry?: () => void;
}

function ErrorState({
  action,
  children,
  description,
  retryButtonProps,
  retryLabel = "Try again",
  title,
  onRetry,
  ...props
}: ErrorStateProps) {
  const renderedAction =
    action ??
    (onRetry ? (
      <Button variant="ghost" size="sm" onClick={onRetry} {...retryButtonProps}>
        {retryLabel}
      </Button>
    ) : null);

  return (
    <ErrorStateRoot {...props}>
      <ErrorStateTitle>{title}</ErrorStateTitle>
      {description ? <ErrorStateDescription>{description}</ErrorStateDescription> : null}
      {children}
      {renderedAction ? <ErrorStateAction>{renderedAction}</ErrorStateAction> : null}
    </ErrorStateRoot>
  );
}

export { ErrorState, ErrorStateAction, ErrorStateDescription, ErrorStateRoot, ErrorStateTitle };
