import type { ReactNode } from "react";

import { TagsAccess } from "./_access";

export default function TagsLayout({ children }: { children: ReactNode }) {
  return <TagsAccess>{children}</TagsAccess>;
}
