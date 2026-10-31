import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/metadata";
import { BillsAccess } from "./_access";

export const metadata = pageMetadata({
  title: "Bills",
  description: "Recurring and upcoming bills.",
  path: "/bills",
});

export default function BillsLayout({ children }: { children: ReactNode }) {
  return <BillsAccess>{children}</BillsAccess>;
}
