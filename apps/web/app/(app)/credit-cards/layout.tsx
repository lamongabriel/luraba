import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/metadata";
import { CreditCardsAccess } from "./_access";

export const metadata = pageMetadata({
  title: "Credit cards",
  description: "Credit cards, limits and invoices.",
  path: "/credit-cards",
});

export default function CreditCardsLayout({ children }: { children: ReactNode }) {
  return <CreditCardsAccess>{children}</CreditCardsAccess>;
}
