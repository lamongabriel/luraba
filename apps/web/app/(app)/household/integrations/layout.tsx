import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/metadata";
import { IntegrationsAccess } from "./_access";

export const metadata = pageMetadata({
  title: "Integrations",
  description: "Connect services like Brandfetch to your household.",
  path: "/household/integrations",
});

export default function IntegrationsLayout({ children }: { children: ReactNode }) {
  return <IntegrationsAccess>{children}</IntegrationsAccess>;
}
