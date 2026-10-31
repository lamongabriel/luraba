import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/metadata";
import { TagsAccess } from "./_access";

export const metadata = pageMetadata({
  title: "Tags",
  description: "Label transactions with tags.",
  path: "/household/tags",
});

export default function TagsLayout({ children }: { children: ReactNode }) {
  return <TagsAccess>{children}</TagsAccess>;
}
