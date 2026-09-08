import type { ReactNode } from "react";

import { AuthGate } from "@/components/auth/auth-gate";

export default function GuestLayout({ children }: { children: ReactNode }) {
  return <AuthGate mode="guest">{children}</AuthGate>;
}
