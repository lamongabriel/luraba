import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/metadata";
import { MerchantsAccess } from "./_access";

export const metadata = pageMetadata({
  title: "Merchants",
  description: "Places and companies you spend with.",
  path: "/household/merchants",
});

export default function MerchantsLayout({ children }: { children: ReactNode }) {
  return <MerchantsAccess>{children}</MerchantsAccess>;
}
