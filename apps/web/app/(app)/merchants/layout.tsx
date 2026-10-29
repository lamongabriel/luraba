import type { ReactNode } from "react";

import { MerchantsAccess } from "./_access";

export default function MerchantsLayout({ children }: { children: ReactNode }) {
  return <MerchantsAccess>{children}</MerchantsAccess>;
}
