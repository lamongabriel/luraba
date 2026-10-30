"use client";

import type * as React from "react";

import { MemberDisplay } from "@/components/display";
import { type PageBackLink, PageHeader } from "@/components/finance/page-header";
import { PageReveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

export function InternalPageLayout({
  title,
  subtitle,
  back,
  actions,
  createdBy,
  children,
  className,
}: {
  title: string;
  subtitle: React.ReactNode;
  back?: PageBackLink;
  actions?: React.ReactNode;
  /** A record's `createdByUserId`; when given (even null) the page shows who created it. */
  createdBy?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <PageReveal className={cn("min-w-0 max-w-full space-y-5", className)}>
      <PageHeader title={title} subtitle={subtitle} back={back} actions={actions} />
      {createdBy !== undefined ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          Created by <MemberDisplay userId={createdBy} size="xs" />
        </div>
      ) : null}
      {children}
    </PageReveal>
  );
}
