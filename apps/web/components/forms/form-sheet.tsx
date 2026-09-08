"use client";

import type * as React from "react";

import {
  SidePanel,
  SidePanelBody,
  SidePanelContent,
  SidePanelDescription,
  SidePanelHeader,
  SidePanelTitle,
} from "@/components/side-panel/side-panel";

export function FormSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <SidePanel open={open} onOpenChange={onOpenChange}>
      <SidePanelContent className={className}>
        <SidePanelHeader>
          <SidePanelTitle>{title}</SidePanelTitle>
          {description ? <SidePanelDescription>{description}</SidePanelDescription> : null}
        </SidePanelHeader>
        <SidePanelBody className="space-y-6">{children}</SidePanelBody>
      </SidePanelContent>
    </SidePanel>
  );
}
