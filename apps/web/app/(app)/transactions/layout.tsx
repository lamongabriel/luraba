import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/metadata";
import { TransactionsAccess } from "./_access";

export const metadata = pageMetadata({
  title: "Transactions",
  description: "Income, expenses and transfers across your accounts.",
  path: "/transactions",
});

export default function TransactionsLayout({ children }: { children: ReactNode }) {
  return <TransactionsAccess>{children}</TransactionsAccess>;
}
