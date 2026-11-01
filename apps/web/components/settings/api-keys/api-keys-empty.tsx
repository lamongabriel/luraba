"use client";

import { Key01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export function ApiKeysEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={<HugeiconsIcon icon={Key01Icon} strokeWidth={1.8} className="size-5" />}
      title="No API keys yet"
      description="Create a key to let a script or an AI agent use Luraba as you."
      action={<Button onClick={onCreate}>Create your first key</Button>}
    />
  );
}
