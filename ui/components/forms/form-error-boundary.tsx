"use client";

import { ApiError, NetworkError } from "@/lib/errors";

type FormErrorBoundaryProps = {
  error: unknown;
};

export function FormErrorBoundary({ error }: FormErrorBoundaryProps) {
  if (!error) return null;

  if (error instanceof ApiError) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
        {error.message}
      </div>
    );
  }

  if (error instanceof NetworkError) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
        {error.message}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
      Something went wrong.
    </div>
  );
}
