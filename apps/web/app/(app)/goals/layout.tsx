import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/metadata";
import { GoalsAccess } from "./_access";

export const metadata = pageMetadata({
  title: "Goals",
  description: "Savings goals and progress.",
  path: "/goals",
});

export default function GoalsLayout({ children }: { children: ReactNode }) {
  return <GoalsAccess>{children}</GoalsAccess>;
}
