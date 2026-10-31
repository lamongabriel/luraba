import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/metadata";
import { CategoriesAccess } from "./_access";

export const metadata = pageMetadata({
  title: "Categories",
  description: "Organize transactions into categories.",
  path: "/household/categories",
});

export default function CategoriesLayout({ children }: { children: ReactNode }) {
  return <CategoriesAccess>{children}</CategoriesAccess>;
}
