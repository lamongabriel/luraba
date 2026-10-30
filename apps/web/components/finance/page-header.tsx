import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

export type PageBackLink = {
  href: string;
  /** Where it goes, e.g. "Credit cards" renders "Back to Credit cards". */
  label: string;
};

/**
 * The title block every page of the app uses: optional back link, a title, a mandatory subtitle,
 * and a right-hand slot (aligned with the title) for actions.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  back,
  compact = false,
  leading,
  className,
}: {
  title: string;
  subtitle: React.ReactNode;
  actions?: React.ReactNode;
  back?: PageBackLink;
  /** A smaller title and subtitle, for pages that sit inside another page's menu. */
  compact?: boolean;
  /** A picture or icon before the title (the household picture). */
  leading?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("space-y-2", className)}>
      {back ? (
        <Button asChild variant="link" className="-ml-2 h-6 px-2">
          <Link href={back.href}>
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
            Back to {back.label}
          </Link>
        </Button>
      ) : null}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {leading}
          <div className="min-w-0">
            <Typography
              as="h1"
              variant={compact ? "section-title" : "page-title"}
              className="max-w-3xl"
            >
              {title}
            </Typography>
            <Typography variant={compact ? "small-muted" : "body-muted"} className="mt-1 max-w-3xl">
              {subtitle}
            </Typography>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
