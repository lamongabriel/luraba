import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/metadata";
import { AccountsAccess } from "./_access";

export const metadata = pageMetadata({
  title: "Accounts",
  description: "Bank accounts, balances and recent activity.",
  path: "/accounts",
});

export default function AccountsLayout({ children }: { children: ReactNode }) {
  return <AccountsAccess>{children}</AccountsAccess>;
}
