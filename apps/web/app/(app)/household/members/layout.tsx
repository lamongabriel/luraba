import type { ReactNode } from "react";

import { MembersAccess } from "./_access";

export default function MembersLayout({ children }: { children: ReactNode }) {
  return <MembersAccess>{children}</MembersAccess>;
}
