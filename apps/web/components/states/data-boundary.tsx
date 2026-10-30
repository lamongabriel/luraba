"use client";

import type * as React from "react";

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";

type EmptyProps = React.ComponentProps<typeof EmptyState>;

/**
 * Loading, error and empty for any query-driven section, so a page never hand-writes the
 * `if (isPending) ... else if (isError) ...` ladder.
 *
 * - `loading` is the page's `_loading.tsx` skeleton; it must match `children` one to one.
 * - `error` is the page's `_error.tsx` (or give `errorTitle`).
 * - `empty` is the page's `_empty.tsx` (or give `emptyProps`), shown when `isEmpty`.
 */
export function DataBoundary({
  isPending,
  isError,
  isEmpty = false,
  error,
  onRetry,
  loading,
  errorState,
  errorTitle = "Couldn't load this page",
  empty,
  emptyProps,
  children,
}: {
  isPending: boolean;
  isError: boolean;
  isEmpty?: boolean;
  error?: { message?: string } | null;
  onRetry?: () => void;
  loading: React.ReactNode;
  errorState?: React.ReactNode;
  errorTitle?: string;
  empty?: React.ReactNode;
  emptyProps?: EmptyProps;
  children: React.ReactNode;
}) {
  if (isPending) return <>{loading}</>;
  if (isError) {
    return (
      errorState ?? (
        <ErrorState
          title={errorTitle}
          description={error?.message || "An unexpected error occurred while loading this page."}
          onRetry={onRetry}
        />
      )
    );
  }
  if (isEmpty) return <>{empty ?? (emptyProps ? <EmptyState {...emptyProps} /> : null)}</>;
  return <>{children}</>;
}
