"use client";

import type * as React from "react";

import { type PageBackLink, PageHeader } from "@/components/finance/page-header";
import { PageReveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

export function InternalPageLayout({
  title,
  subtitle,
  back,
  actions,
  children,
  className,
}: {
  title: string;
  subtitle: React.ReactNode;
  back?: PageBackLink;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <PageReveal className={cn("min-w-0 max-w-full space-y-5", className)}>
      <PageHeader title={title} subtitle={subtitle} back={back} actions={actions} />
      {children}
    </PageReveal>
  );
}
