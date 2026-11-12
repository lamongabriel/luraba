import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/metadata";
import { PlanAccess } from "./_access";

export const metadata = pageMetadata({
  title: "Budgets & goals",
  description: "How much you can still spend this month, your goals, budgets and upcoming bills.",
  path: "/plan",
});

export default function PlanLayout({ children }: { children: ReactNode }) {
  return <PlanAccess>{children}</PlanAccess>;
}
