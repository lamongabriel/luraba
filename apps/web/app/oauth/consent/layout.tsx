import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Allow an agent",
  description: "Review what an AI agent is asking to do in your Luraba household.",
  path: "/oauth/consent",
});

export default function OAuthConsentLayout({ children }: { children: ReactNode }) {
  return children;
}
