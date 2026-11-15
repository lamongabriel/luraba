import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/metadata";
import { PiggyBanksAccess } from "./_access";

export const metadata = pageMetadata({
  title: "Piggy banks",
  description: "Savings buckets inside your accounts, with daily interest.",
  path: "/piggy-banks",
});

export default function PiggyBanksLayout({ children }: { children: ReactNode }) {
  return <PiggyBanksAccess>{children}</PiggyBanksAccess>;
}
