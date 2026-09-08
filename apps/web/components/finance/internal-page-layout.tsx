"use client";

import type * as React from "react";

import { PageHeader } from "@/components/finance/page-header";
import { PageReveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

export function InternalPageLayout({
  title,
  actions,
  children,
  className,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <PageReveal className={cn("min-w-0 max-w-full space-y-5", className)}>
      <PageHeader title={title} actions={actions} />
      {children}
    </PageReveal>
  );
}
