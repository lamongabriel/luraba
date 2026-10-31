import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/metadata";
import { SplitsAccess } from "./_access";

export const metadata = pageMetadata({
  title: "Splits",
  description: "Shared expenses and who owes whom.",
  path: "/splits",
});

export default function SplitsLayout({ children }: { children: ReactNode }) {
  return <SplitsAccess>{children}</SplitsAccess>;
}
